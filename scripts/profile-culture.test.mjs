import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseDoubanFeed, fetchDouban, musicHistory } from './profile-culture.mjs';

const item = (title, description = '<p>推荐: 力荐</p>') => `<item><title>${title}</title><link>https://movie.douban.com/subject/1/</link><description><![CDATA[${description}]]></description><pubDate>Tue, 06 Oct 2026 10:54:12 GMT</pubDate></item>`;
const feed = (body) => `<?xml version="1.0"?><rss version="2.0"><channel>${body}</channel></rss>`;

test('Douban extracts activity, personal rating and publication date, not HTML', () => {
  const rows = parseDoubanFeed(feed(item('看过A &amp; B &#x7535;影') + item('<![CDATA[读过一本书]]>')));
  assert.equal(rows[0].title, 'A & B 电影');
  assert.equal(rows[0].subtitle, '看过 · 力荐 · 2026-10-06');
  assert.equal(rows[1].title, '一本书');
  assert.equal(rows[1].subtitle, '读过 · 力荐 · 2026-10-06');
  assert.equal(parseDoubanFeed(feed(item('看过电影', '<p>not an item: <item></item></p>'))).length, 1);
});

test('Douban differentiates empty RSS from invalid, incomplete and external-entity documents', () => {
  assert.deepEqual(parseDoubanFeed(feed('')), []);
  for (const xml of ['<html>login</html>', feed('<item><title>broken</title>'), `<!DOCTYPE rss>${feed('')}`,
    feed(item('看过电影').replace('movie.douban.com', 'example.com')), feed(item('看过电影').replace('Tue, 06 Oct 2026 10:54:12 GMT', 'invalid'))]) {
    assert.throws(() => parseDoubanFeed(xml));
  }
  assert.equal(parseDoubanFeed(feed(item('看过电影').repeat(4))).length, 3);
});

test('Douban request failures have an unavailable state without leaking response content', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('<html>verification</html>', { status: 200 }));
  assert.equal((await fetchDouban()).state, 'unavailable');
  globalThis.fetch.mock.mockImplementation(async () => new Response(feed('')));
  assert.equal((await fetchDouban()).state, 'empty');
});

test('QQ Music distinguishes unconnected and authenticated empty history and validates all records', () => {
  assert.equal(musicHistory({ updatedAt: null, songs: [] }).state, 'pending');
  assert.equal(musicHistory({ updatedAt: '2026-10-18T00:00:00Z', songs: [] }).state, 'empty');
  assert.equal(musicHistory({ updatedAt: '2026-10-18T00:00:00Z', songs: [{ title: '真实歌曲', artist: '歌手' }] }).items[0].subtitle, '歌手');
  assert.throws(() => musicHistory({ updatedAt: null, songs: [{ title: 'Song', artist: 'Singer' }] }));
  assert.throws(() => musicHistory({ updatedAt: '2026-10-18T00:00:00Z', songs: [{ title: '', artist: 'Singer' }] }));
});

test('Updater replaces details permanently, escapes content and preserves Steam in culture-only mode', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'evity-profile-test-'));
  const root = new URL('../', import.meta.url);
  const assets = ['header', 'github', 'steam', 'culture'].flatMap((name) => [`assets/${name}.svg`, `assets/${name}-mobile.svg`]);
  try {
    for (const name of ['scripts', 'assets', 'data']) await mkdir(join(folder, name));
    for (const file of ['README.md', 'scripts/profile-data.mjs', 'scripts/profile-svg.mjs',
      'scripts/profile-culture.mjs', 'scripts/update-profile.mjs', 'data/qq-music-history.json', ...assets]) {
      await copyFile(new URL(file, root), join(folder, file));
    }
    const fixture = feed(item('<![CDATA[看过<img src="x" onerror="alert(1)">]]>'));
    const stub = `globalThis.fetch=async (url)=>{const value=String(url);if(value.includes('douban.com/'))return new Response(${JSON.stringify(fixture)});if(value.includes('/repos?'))return Response.json([{name:'Repository',owner:{login:'Evity'},fork:false,private:false,archived:false,stargazers_count:0,language:'Go',pushed_at:'2026-10-18T00:00:00Z'}]);if(value.includes('api.github.com/users/'))return Response.json({login:'Evity',followers:6,public_repos:9});if(value.includes('api.steampowered.com'))return Response.json({response:{games:[{appid:1,name:'Test game',playtime_2weeks:90,playtime_forever:120}]}});throw new Error('Unexpected fixture request')};`;
    await writeFile(join(folder, 'mock.mjs'), stub);
    const run = (args = []) => promisify(execFile)(process.execPath,
      ['--import', join(folder, 'mock.mjs'), join(folder, 'scripts/update-profile.mjs'), ...args],
      { cwd: folder, env: { PATH: process.env.PATH, STEAM_API_KEY: 'fixture-key', STEAM_ID: '76561198000000000' } });
    assert.match((await run()).stdout, /Profile check passed: 8/);
    const readme = await readFile(join(folder, 'README.md'), 'utf8');
    assert.doesNotMatch(readme, /<details|<summary|GitHub 快照|仓库与游戏记录/);
    assert.match(readme, /&lt;img src=&quot;x&quot; onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.match(readme, /Test game：两周 1.5 小时/);
    const culture = await readFile(join(folder, 'assets/culture.svg'), 'utf8');
    assert.match(culture, /&lt;img src=&quot;x&quot;/);
    assert.doesNotMatch(culture, /<img\b/);
    const preserved = assets.filter((file) => !file.includes('culture'));
    const before = await Promise.all(preserved.map((file) => readFile(join(folder, file), 'utf8')));
    assert.match((await run(['--culture-only'])).stdout, /Culture cards refreshed/);
    assert.deepEqual(await Promise.all(preserved.map((file) => readFile(join(folder, file), 'utf8'))), before);
    const strip = (value) => value.replace(/<!-- PROFILE:START -->[\s\S]*<!-- PROFILE:END -->/, '');
    assert.equal(strip(await readFile(join(folder, 'README.md'), 'utf8')), strip(readme));
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
