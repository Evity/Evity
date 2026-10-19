const timestamp = () => new Date().toISOString();
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function xmlText(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, name) => {
    if (!name.startsWith('#')) return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[name.toLowerCase()];
    const code = name[1].toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : entity;
  }).trim();
}

/** Read the text fields in Douban's collection RSS, never its embedded HTML. */
export function parseDoubanFeed(xml) {
  if (typeof xml !== 'string' || xml.length > 1_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Invalid Douban feed');
  const source = xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,
    (_, text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  if (!/^\s*(?:<\?xml[^?]*\?>\s*)?<rss\b[^>]*>\s*<channel>[\s\S]*<\/channel>\s*<\/rss>\s*$/.test(source)) throw new Error('Invalid Douban feed');
  const items = [...source.matchAll(/<item>\s*([\s\S]*?)<\/item>/g)];
  if (items.length !== (source.match(/<item\b/g) || []).length) throw new Error('Incomplete Douban feed');
  return items.map(([, item]) => {
    const field = (name) => xmlText(item.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1] || '');
    const rawTitle = field('title');
    const url = new URL(field('link'));
    const published = new Date(field('pubDate'));
    if (!rawTitle || url.protocol !== 'https:' || !/^(movie|book|music)\.douban\.com$/.test(url.hostname)
      || !Number.isFinite(published.getTime())) throw new Error('Invalid Douban item');
    const status = rawTitle.match(/^(想看|在看|看过|想读|在读|读过|想听|在听|听过)/)?.[1] || '';
    const title = rawTitle.slice(status.length).trim();
    if (!title) throw new Error('Invalid Douban title');
    const rating = field('description').match(/推荐\s*[:：]\s*(很差|较差|还行|推荐|力荐)/)?.[1];
    return { title, subtitle: [status, rating, published.toISOString().slice(0, 10)].filter(Boolean).join(' · '), url };
  }).slice(0, 3).map((item) => ({ ...item, url: item.url.href }));
}

export async function fetchDouban(username = 'Evity') {
  if (typeof username !== 'string' || !/^[\w-]+$/.test(username)) return { state: 'unavailable', items: [] };
  try {
    const response = await fetch(`https://www.douban.com/feed/people/${username}/interests`, {
      headers: { accept: 'application/rss+xml, text/xml' }, signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error('Douban request failed');
    const items = parseDoubanFeed(await response.text());
    return { state: items.length ? 'ready' : 'empty', items, profileUrl: `https://www.douban.com/people/${username}/`, updatedAt: timestamp() };
  } catch {
    return { state: 'unavailable', items: [], profileUrl: `https://www.douban.com/people/${username}/` };
  }
}

/** Only a normalized, public snapshot is committed; login credentials never belong here. */
export function musicHistory(snapshot) {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.songs)) throw new Error('Invalid QQ Music history snapshot');
  if (snapshot.updatedAt === null && snapshot.songs.length === 0) return { state: 'pending', items: [] };
  if (typeof snapshot.updatedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.updatedAt))
    || snapshot.songs.some((song) => !isRecord(song) || typeof song.title !== 'string' || !song.title.trim()
      || typeof song.artist !== 'string' || !song.artist.trim())) throw new Error('Invalid QQ Music history snapshot');
  return { state: snapshot.songs.length ? 'ready' : 'empty', updatedAt: snapshot.updatedAt,
    items: snapshot.songs.slice(0, 3).map((song) => ({ title: song.title.trim(), subtitle: song.artist.trim() })) };
}
