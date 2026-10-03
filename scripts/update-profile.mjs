import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fetchGithub, fetchSteam } from './profile-data.mjs';
import { renderHero, renderGithub, renderSteam, hours } from './profile-svg.mjs';

const root = new URL('../', import.meta.url);
const start = '<!-- PROFILE:START -->';
const end = '<!-- PROFILE:END -->';
const names = ['header', 'github', 'steam'];
const files = names.flatMap((name) => [`assets/${name}.svg`, `assets/${name}-mobile.svg`]);
const markdown = (value) => String(value).replace(/[\r\n]+/g, ' ')
  .replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])
  .replace(/[\\`*_{}[\]()!|#]/g, '\\$&');

function summary(github, steam) {
  const lines = [
    '<details>', '<summary>数据详情 · 最近更新的项目与游戏记录</summary>', '',
    `GitHub 快照：${github.updatedAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}。`, '',
    `- 公开仓库：**${github.publicRepos}**`, `- 关注者：**${github.followers}**`, `- 原创仓库 Stars：**${github.stars}**`, '',
    '最近更新的原创公开仓库：', '',
    '不含归档仓库。推送不等同于个人提交。', '',
    ...github.recentRepos.map((repo) => `- [${markdown(repo.name)}](https://github.com/${encodeURIComponent(github.username)}/${encodeURIComponent(repo.name)}) · ${markdown(repo.language || '未标注语言')} · ${repo.stars} stars · ${repo.pushedAt.slice(0, 10)}`), '',
  ];
  switch (steam.state) {
    case 'ready':
      lines.push(`Steam 最近两周：**${hours(steam.totalMinutes)}**。`, '', '汇总全部近期游戏。以下列出时长前三名：', '',
        ...steam.games.map((game) => `- ${markdown(game.name)} · 两周 ${hours(game.recentMinutes)} · 累计 ${hours(game.totalMinutes)}`),
        '', `[Steam 个人主页](${steam.profileUrl}) · 快照：${steam.updatedAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}。`);
      break;
    case 'pending': lines.push('Steam 尚未接入。', '', '接入后展示两周游戏时长。'); break;
    case 'empty': lines.push('暂无公开近期记录。', '', '可能与游戏详情的隐私设置有关。'); break;
    case 'unavailable': lines.push('Steam 记录暂时无法获取。', '', '等待下一次刷新。'); break;
    default: throw new Error('Unexpected Steam state');
  }
  return [...lines, '', '数据每 6 小时刷新；属于定时快照。', '', '</details>'].join('\n');
}

async function check() {
  const readme = await readFile(new URL('README.md', root), 'utf8');
  if (!readme.includes(start) || !readme.includes(end)) throw new Error('README profile markers are missing');
  if (/spotify|now-playing|visitor-badge/i.test(readme)) throw new Error('Legacy embeds remain in README');
  for (const file of files) {
    const svg = await readFile(new URL(file, root), 'utf8');
    if (!svg.startsWith('<svg ') || !svg.includes('</svg>') || !svg.includes('<title ')) throw new Error(`Invalid asset: ${file}`);
    if (/<script|<foreignObject|(?:href|src)\s*=/i.test(svg)) throw new Error(`Unsupported SVG content: ${file}`);
    if (!readme.includes(file)) throw new Error(`README does not use ${file}`);
  }
  console.log(`Profile check passed: ${files.length} self-contained SVGs, README markers and embeds.`);
}

async function update() {
  const readmePath = new URL('README.md', root);
  const readme = await readFile(readmePath, 'utf8');
  const first = readme.indexOf(start);
  const last = readme.indexOf(end);
  if (first < 0 || last < first || readme.indexOf(start, first + start.length) !== -1
    || readme.indexOf(end, last + end.length) !== -1) throw new Error('README must have one ordered pair of profile markers');
  const [github, steam] = await Promise.all([
    fetchGithub('Evity', { token: process.env.GITHUB_TOKEN }),
    fetchSteam({ apiKey: process.env.STEAM_API_KEY, steamId: process.env.STEAM_ID }),
  ]);
  const renderers = [renderHero, (mobile) => renderGithub(github, mobile), (mobile) => renderSteam(steam, mobile)];
  await mkdir(new URL('assets/', root), { recursive: true });
  for (let index = 0; index < names.length; index += 1) {
    for (const mobile of [false, true]) {
      await writeFile(new URL(`assets/${names[index]}${mobile ? '-mobile' : ''}.svg`, root), renderers[index](mobile));
    }
  }
  await writeFile(readmePath, readme.slice(0, first + start.length) + '\n\n'
    + summary(github, steam) + '\n\n' + readme.slice(last));
  console.log(`Profile refreshed for ${github.username}. Steam state: ${steam.state}.`);
  await check();
}

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/update-profile.mjs [--check]\nUpdate public GitHub and optional Steam cards, or check existing assets offline.');
} else if (args.some((arg) => arg !== '--check')) {
  console.error('Unknown option. Use --help for usage.');
  process.exitCode = 1;
} else {
  try { await (args.includes('--check') ? check() : update()); }
  catch (error) {
    console.error(error instanceof Error ? error.message : 'Profile update failed');
    process.exitCode = 1;
  }
}
