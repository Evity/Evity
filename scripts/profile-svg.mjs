export const palette = Object.freeze({
  background: '#0d1117', surface: '#161b22', border: '#30363d',
  text: '#f0f6fc', muted: '#a9b6c7', accent: '#79ddd2',
  deep: '#163d3a', soft: '#b6f2e9', warning: '#e6bd7a',
});

export function escapeXml(value) {
  return Array.from(String(value)).filter((char) => {
    const code = char.codePointAt(0);
    return code === 9 || code === 10 || code === 13
      || (code >= 32 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd)
      || (code >= 0x10000 && code <= 0x10ffff);
  }).join('')
    .replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

const clip = (value, limit) => Array.from(String(value)).length > limit
  ? `${Array.from(String(value)).slice(0, limit - 1).join('')}…` : value;
const number = (value) => new Intl.NumberFormat('en-US').format(value);
export const hours = (minutes) => `${(minutes / 60).toFixed(1)} h`;
const date = (value) => value.slice(0, 10);
const label = (x, y, value, color = palette.muted, size = 16, weight = 400, anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-weight="${weight}">${escapeXml(value)}</text>`;
const rule = (y, width) => `<path d="M32 ${y}H${width - 32}" stroke="${palette.border}"/>`;

function frame(width, height, title, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title">
<title id="title">${escapeXml(title)}</title>
<defs><radialGradient id="light"><stop stop-color="${palette.deep}"/><stop offset="1" stop-color="${palette.background}"/></radialGradient>
<linearGradient id="rim" x2="1" y2="1"><stop stop-color="${palette.soft}"/><stop offset=".5" stop-color="${palette.accent}"/><stop offset="1" stop-color="${palette.deep}"/></linearGradient></defs>
<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="16" fill="${palette.background}" stroke="${palette.border}"/>
<g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">${content}</g></svg>\n`;
}

export function renderHero(mobile = false) {
  const width = mobile ? 420 : 840;
  const orbit = `<g transform="translate(${mobile ? 356 : 676} 132)" opacity="${mobile ? '.38' : '1'}">
<circle r="124" fill="url(#light)"/>
<g fill="none" stroke="${palette.border}"><ellipse rx="144" ry="58" transform="rotate(-32)"/><ellipse rx="144" ry="58" transform="rotate(32)"/><circle r="94" stroke-dasharray="2 10"/></g>
<ellipse rx="144" ry="58" transform="rotate(-32)" fill="none" stroke="url(#rim)" stroke-width="2"/>
<rect x="-48" y="-48" width="96" height="96" rx="24" fill="${palette.surface}" stroke="url(#rim)" transform="rotate(-12)"/>
<text x="0" y="24" text-anchor="middle" font-size="80" font-weight="700" fill="${palette.accent}">e</text>
<circle cx="120" cy="-66" r="5" fill="${palette.soft}"/></g>`;
  return frame(width, 280, 'Evity · Go developer', `${orbit}
${label(32, 48, 'EVITY / PERSONAL LOG', palette.accent, 16, 600)}
${label(28, 144, 'evity.', palette.text, 80, 700)}
${label(32, 188, 'Go developer.', palette.text, 24, 500)}
${rule(232, width)}${label(32, 260, '[i:viti]  ·  code & play', palette.muted)}`);
}

function metric(x, y, value, caption) {
  return label(x, y, number(value), palette.text, 36, 600) + label(x, y + 28, caption);
}

export function renderGithub(data, mobile = false) {
  const width = mobile ? 420 : 840;
  const height = mobile ? 528 : 448;
  const metrics = mobile
    ? metric(32, 124, data.publicRepos, 'Public repos') + metric(220, 124, data.followers, 'Followers')
      + metric(32, 208, data.stars, 'Original-repo stars')
    : metric(32, 124, data.publicRepos, 'Public repos') + metric(292, 124, data.followers, 'Followers')
      + metric(552, 124, data.stars, 'Original-repo stars');
  const divider = mobile ? 256 : 176;
  const rows = data.recentRepos.map((repo, index) => {
    const y = divider + 76 + index * 60;
    return label(32, y, clip(repo.name, mobile ? 28 : 56), palette.text, 18, 600)
      + label(32, y + 24, `${clip(repo.language || 'Repository', mobile ? 14 : 28)}  ·  ${number(repo.stars)} stars  ·  ${date(repo.pushedAt)}`);
  }).join('') || label(32, divider + 76, 'No public repository updates available.');
  return frame(width, height, 'GitHub public profile and recently pushed repositories',
    label(32, 44, 'The public log', palette.text, 24, 600) + metrics + rule(divider, width)
    + label(32, divider + 32, 'RECENT REPOSITORY UPDATES', palette.accent, 16, 600)
    + `<defs><clipPath id="rows"><rect x="32" y="${divider + 48}" width="${width - 64}" height="${height - divider - 76}"/></clipPath></defs><g clip-path="url(#rows)">${rows}</g>`
    + label(32, height - 20, `Snapshot · ${date(data.updatedAt)} UTC`, palette.muted, 16));
}

export function renderSteam(data, mobile = false) {
  const width = mobile ? 420 : 840;
  if (data.state !== 'ready') {
    const messages = {
      pending: ['Waiting to connect', 'The gaming log is next.', 'Recent games and hours, once connected.'],
      empty: ['No public recent activity', 'A quiet gaming log.', 'No recent games are publicly available.'],
      unavailable: ['Temporarily unavailable', 'The gaming log is taking a break.', 'Recent activity could not be retrieved.'],
    };
    const [status, heading, body] = messages[data.state];
    const height = mobile ? 280 : 236;
    const gamepad = `<g transform="translate(${mobile ? 284 : 672} ${mobile ? 192 : 104})" fill="none" stroke="${palette.accent}" stroke-width="2" opacity=".65">
<path d="M-26-20H26Q42-20 46-2L54 30Q54 48 38 38L20 22H-20L-38 38Q-54 48-54 30L-46-2Q-42-20-26-20Z"/>
<path d="M-30-4V14M-39 5H-21"/><circle cx="24" cy="1" r="3"/><circle cx="34" cy="11" r="3"/></g>`;
    return frame(width, height, `Steam: ${status}`, gamepad
      + label(32, 44, 'After hours', palette.text, 24, 600)
      + label(32, 84, status, palette.warning, 16, 500)
      + label(32, 132, heading, palette.text, 18, 500)
      + label(32, 164, body, palette.muted, mobile ? 16 : 18)
      + label(32, height - 24, 'STEAM / LAST 14 DAYS', palette.accent, 16, 600));
  }
  const height = mobile ? 424 : 384;
  const rows = data.games.map((game, index) => {
    const y = 204 + index * 56;
    return `<g clip-path="url(#game-names)">${label(32, y, clip(game.name, mobile ? 22 : 54), palette.text, 18, 600)}</g>`
      + label(width - 32, y, hours(game.recentMinutes), palette.accent, 18, 600, 'end')
      + label(32, y + 24, `${hours(game.totalMinutes)} lifetime`);
  }).join('');
  return frame(width, height, 'Steam recent games and hours played in the last two weeks',
    label(32, 44, 'After hours', palette.text, 24, 600)
    + label(32, 108, hours(data.totalMinutes), palette.text, 36, 600)
    + label(32, 140, 'Played in the last 14 days') + rule(164, width)
    + `<defs><clipPath id="game-names"><rect x="32" y="172" width="${width - 160}" height="180"/></clipPath></defs>` + rows
    + label(32, height - 20, `Snapshot · ${date(data.updatedAt)} UTC`));
}
