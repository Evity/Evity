const REQUEST_TIMEOUT_MS = 10_000;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const safeError = (service, message) => new Error(`${service}: ${message}`);
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

async function requestJson(url, service, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', ...extraHeaders },
      signal: controller.signal,
    });
    if (!response.ok) throw safeError(service, `request failed (${response.status})`);
    try {
      return await response.json();
    } catch {
      throw safeError(service, 'returned invalid JSON');
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`${service}:`)) throw error;
    if (error?.name === 'AbortError') throw safeError(service, 'request timed out');
    throw safeError(service, 'request failed');
  } finally {
    clearTimeout(timer);
  }
}

function requireGithubUser(value) {
  if (!isRecord(value) || typeof value.login !== 'string' || !isCount(value.followers)
    || !isCount(value.public_repos)) {
    throw safeError('GitHub', 'returned unexpected user data');
  }
  return value;
}

function requireGithubRepos(value) {
  if (!Array.isArray(value) || value.some((repo) => !isRecord(repo)
    || typeof repo.name !== 'string' || !repo.name || !isRecord(repo.owner)
    || typeof repo.owner.login !== 'string' || typeof repo.fork !== 'boolean'
    || typeof repo.private !== 'boolean' || typeof repo.archived !== 'boolean'
    || !isCount(repo.stargazers_count))) {
    throw safeError('GitHub', 'returned unexpected repository data');
  }
  return value;
}

/** Fetch the public GitHub profile and its recently pushed owned repositories. */
export async function fetchGithub(username, { token } = {}) {
  if (typeof username !== 'string' || username.trim() === '') {
    throw safeError('GitHub', 'username is required');
  }
  const login = username.trim();
  const headers = { 'X-GitHub-Api-Version': '2026-03-10', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const userUrl = `https://api.github.com/users/${encodeURIComponent(login)}`;
  const user = requireGithubUser(await requestJson(userUrl, 'GitHub', headers));
  const repositories = [];
  for (let page = 1; ; page += 1) {
    const url = `https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&direction=desc&type=owner&page=${page}`;
    const pageRepos = requireGithubRepos(await requestJson(url, 'GitHub', headers));
    repositories.push(...pageRepos);
    if (pageRepos.length < 100) break;
  }
  const ownedPublic = repositories.filter((repo) => repo.fork !== true && repo.private !== true
    && repo.owner.login.toLowerCase() === login.toLowerCase());
  const recentRepos = ownedPublic
    .filter((repo) => repo.archived !== true && typeof repo.pushed_at === 'string' && Number.isFinite(Date.parse(repo.pushed_at)))
    .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, 3)
    .map((repo) => ({
      name: typeof repo.name === 'string' ? repo.name : 'Unnamed repository',
      description: typeof repo.description === 'string' ? repo.description : null,
      language: typeof repo.language === 'string' ? repo.language : null,
      stars: repo.stargazers_count,
      pushedAt: repo.pushed_at,
      url: typeof repo.html_url === 'string' ? repo.html_url : `https://github.com/${encodeURIComponent(login)}`,
    }));
  return {
    state: 'ready',
    username: user.login,
    followers: user.followers,
    publicRepos: user.public_repos,
    stars: ownedPublic.reduce((sum, repo) => sum + (repo.stargazers_count), 0),
    recentRepos,
    updatedAt: new Date().toISOString(),
  };
}

/** Fetch the public Steam recent-games snapshot; no presence or profile summary calls. */
export async function fetchSteam({ apiKey, steamId } = {}) {
  const hasKey = typeof apiKey === 'string' && apiKey.trim() !== '';
  const hasId = typeof steamId === 'string' && /^\d{17}$/.test(steamId);
  if (!hasKey && !steamId) return { state: 'pending' };
  if (!hasKey || !hasId) return { state: 'unavailable', reason: 'Steam credentials are missing or invalid' };
  const endpoint = new URL('https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/');
  endpoint.search = new URLSearchParams({ key: apiKey, steamid: steamId, format: 'json', count: '0' }).toString();
  let payload;
  try {
    payload = await requestJson(endpoint, 'Steam');
  } catch {
    return { state: 'unavailable', reason: 'Steam recent games are unavailable' };
  }
  if (!isRecord(payload) || !isRecord(payload.response)) {
    return { state: 'unavailable', reason: 'Steam returned an unexpected response' };
  }
  const rawGames = payload.response.games;
  if (rawGames === undefined && !payload.response.total_count) {
    return { state: 'empty', updatedAt: new Date().toISOString() };
  }
  if (!Array.isArray(rawGames)) return { state: 'unavailable', reason: 'Steam returned an unexpected response' };
  if (rawGames.some((game) => !isRecord(game) || !isCount(game.appid) || game.appid === 0
    || typeof game.name !== 'string' || !game.name || !isCount(game.playtime_2weeks)
    || !isCount(game.playtime_forever))) {
    return { state: 'unavailable', reason: 'Steam returned incomplete game data' };
  }
  const games = rawGames.map((game) => ({
    name: game.name,
    appid: game.appid,
    recentMinutes: game.playtime_2weeks,
    totalMinutes: game.playtime_forever,
  }));
  if (games.length === 0) return { state: 'empty', updatedAt: new Date().toISOString() };
  games.sort((a, b) => b.recentMinutes - a.recentMinutes);
  return {
    state: 'ready',
    totalMinutes: games.reduce((sum, game) => sum + game.recentMinutes, 0),
    games: games.slice(0, 3),
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
    updatedAt: new Date().toISOString(),
  };
}
