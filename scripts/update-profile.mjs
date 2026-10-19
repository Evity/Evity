import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fetchGithub, fetchSteam } from './profile-data.mjs';
import { renderHero, renderGithub, renderSteam, renderCulture, escapeXml } from './profile-svg.mjs';
import { fetchDouban, musicHistory } from './profile-culture.mjs';

const root = new URL('../', import.meta.url);
const start = '<!-- PROFILE:START -->';
const end = '<!-- PROFILE:END -->';
const names = ['header', 'github', 'steam', 'culture'];
const files = names.flatMap((name) => [`assets/${name}.svg`, `assets/${name}-mobile.svg`]);

function cultureMarkup(culture) {
  const describe = (label, data) => `${label}：${data.items.length
    ? data.items.map((item) => `${item.title}，${item.subtitle}`).join('；')
    : ({ pending: '尚未接入', empty: '暂无记录', unavailable: '暂时无法获取数据' })[data.state]}`;
  const alt = escapeXml([describe('豆瓣最近收藏', culture.douban), describe('QQ 音乐听歌历史', culture.qqMusic)].join('。'));
  return `### 豆瓣与音乐\n\n<picture>\n  <source media="(max-width: 600px)" srcset="assets/culture-mobile.svg">\n  <img src="assets/culture.svg" width="840" alt="${alt}">\n</picture>\n\n[豆瓣主页](https://www.douban.com/people/Evity/)`;
}

function profileAltText(readme, github, steam) {
  const descriptions = {
    github: `GitHub：${github.publicRepos} 个公开仓库，${github.followers} 位关注者，非 Fork 仓库 ${github.stars} Stars。最近更新：${github.recentRepos.map((repo) => repo.name).join('、')}`,
    steam: steam.state === 'ready'
      ? `Steam 最近两周 ${(steam.totalMinutes / 60).toFixed(1)} 小时。${steam.games.map((game) => `${game.name}：两周 ${(game.recentMinutes / 60).toFixed(1)} 小时，累计 ${(game.totalMinutes / 60).toFixed(1)} 小时`).join('；')}`
      : ({ pending: 'Steam 尚未接入', empty: 'Steam 暂无公开的近期游戏记录', unavailable: 'Steam 暂时无法获取游戏记录' })[steam.state],
  };
  return readme.replace(/(<img src="assets\/(github|steam)\.svg"[^>]*\balt=")[^"]*(")/g,
    (_, before, name, after) => before + escapeXml(descriptions[name]) + after);
}

async function check() {
  const readme = await readFile(new URL('README.md', root), 'utf8');
  if (!readme.includes(start) || !readme.includes(end)) throw new Error('README profile markers are missing');
  const block = readme.slice(readme.indexOf(start), readme.indexOf(end));
  if (/<details|<summary|GitHub 快照|数据每 6 小时刷新/.test(block)) throw new Error('Legacy profile details remain in README');
  if (/spotify|now-playing|visitor-badge/i.test(readme)) throw new Error('Legacy embeds remain in README');
  for (const file of files) {
    const svg = await readFile(new URL(file, root), 'utf8');
    if (!svg.startsWith('<svg ') || !svg.includes('</svg>') || !svg.includes('<title ')) throw new Error(`Invalid asset: ${file}`);
    if (/<(?:script|foreignObject)\b|<[^>]*\s(?:[\w-]+:)?(?:href|src)\s*=/i.test(svg)) throw new Error(`Unsupported SVG content: ${file}`);
    if (!readme.includes(file)) throw new Error(`README does not use ${file}`);
  }
  console.log(`Profile check passed: ${files.length} self-contained SVGs, README markers and embeds.`);
}

async function update(cultureOnly = false) {
  const readmePath = new URL('README.md', root);
  let readme = await readFile(readmePath, 'utf8');
  const first = readme.indexOf(start);
  const last = readme.indexOf(end);
  if (first < 0 || last < first || readme.indexOf(start, first + start.length) !== -1
    || readme.indexOf(end, last + end.length) !== -1) throw new Error('README must have one ordered pair of profile markers');
  const history = musicHistory(JSON.parse(await readFile(new URL('data/qq-music-history.json', root), 'utf8')));
  const [github, steam, douban] = await Promise.all([
    cultureOnly ? null : fetchGithub('Evity', { token: process.env.GITHUB_TOKEN }),
    cultureOnly ? null : fetchSteam({ apiKey: process.env.STEAM_API_KEY, steamId: process.env.STEAM_ID }),
    fetchDouban(),
  ]);
  const culture = { douban, qqMusic: history };
  if (!cultureOnly) readme = profileAltText(readme, github, steam);
  const renderers = [renderHero, (mobile) => renderGithub(github, mobile), (mobile) => renderSteam(steam, mobile), (mobile) => renderCulture(culture, mobile)];
  await mkdir(new URL('assets/', root), { recursive: true });
  for (let index = 0; index < names.length; index += 1) {
    if (cultureOnly && names[index] !== 'culture') continue;
    for (const mobile of [false, true]) {
      await writeFile(new URL(`assets/${names[index]}${mobile ? '-mobile' : ''}.svg`, root), renderers[index](mobile));
    }
  }
  await writeFile(readmePath, readme.slice(0, readme.indexOf(start) + start.length) + '\n\n'
    + cultureMarkup(culture) + '\n\n' + readme.slice(readme.indexOf(end)));
  console.log(cultureOnly ? `Culture cards refreshed. Douban state: ${douban.state}. QQ Music state: ${history.state}.`
    : `Profile refreshed for ${github.username}. Steam state: ${steam.state}. Douban state: ${douban.state}. QQ Music state: ${history.state}.`);
  await check();
}

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/update-profile.mjs [--check | --culture-only]\nUpdate GitHub, Steam and culture cards; update culture alone; or check existing assets offline.');
} else if (args.some((arg) => !['--check', '--culture-only'].includes(arg)) || new Set(args).size > 1) {
  console.error('Unknown option. Use --help for usage.');
  process.exitCode = 1;
} else {
  try { await (args.includes('--check') ? check() : update(args.includes('--culture-only'))); }
  catch (error) {
    console.error(error instanceof Error ? error.message : 'Profile update failed');
    process.exitCode = 1;
  }
}
