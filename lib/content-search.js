const contentIndex = require('../public/agent-api/content-index.json');

const ALLOWED_LANGUAGES = new Set(['zh-Hans', 'zh-Hant', 'en']);
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const MAX_QUERY_LENGTH = 100;

class SearchError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SearchError';
    this.code = code;
  }
}

function normalize(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase();
}

function parseLimit(rawLimit) {
  if (rawLimit === undefined || rawLimit === null || rawLimit === '') return DEFAULT_LIMIT;
  if (!/^\d+$/.test(String(rawLimit))) {
    throw new SearchError('invalid_limit', `limit 必须是 1 到 ${MAX_LIMIT} 之间的整数。`);
  }

  const limit = Number(rawLimit);
  if (limit < 1 || limit > MAX_LIMIT) {
    throw new SearchError('invalid_limit', `limit 必须是 1 到 ${MAX_LIMIT} 之间的整数。`);
  }
  return limit;
}

function validateSearchInput(input = {}) {
  const query = String(input.q || '').trim();
  if (!query) {
    throw new SearchError('missing_query', '缺少必填查询参数 q。');
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw new SearchError('query_too_long', `q 不能超过 ${MAX_QUERY_LENGTH} 个字符。`);
  }

  const language = input.language ? String(input.language) : null;
  if (language && !ALLOWED_LANGUAGES.has(language)) {
    throw new SearchError('invalid_language', 'language 必须是 zh-Hans、zh-Hant 或 en。');
  }

  return {
    query,
    language,
    limit: parseLimit(input.limit),
  };
}

function scoreEntry(entry, normalizedQuery, tokens) {
  const title = normalize(entry.title);
  const description = normalize(entry.description);
  const url = normalize(entry.url);
  const searchable = `${title} ${description} ${url}`;

  if (!tokens.every(token => searchable.includes(token))) return -1;

  let score = 0;
  if (title === normalizedQuery) score += 100;
  if (title.includes(normalizedQuery)) score += 50;
  if (description.includes(normalizedQuery)) score += 20;
  tokens.forEach(token => {
    if (title.includes(token)) score += 10;
    if (description.includes(token)) score += 3;
    if (url.includes(token)) score += 1;
  });
  return score;
}

function searchPublicContent(input = {}) {
  const { query, language, limit } = validateSearchInput(input);
  const normalizedQuery = normalize(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const matches = contentIndex.entries
    .filter(entry => !language || entry.language === language)
    .map(entry => ({ entry, score: scoreEntry(entry, normalizedQuery, tokens) }))
    .filter(match => match.score >= 0)
    .sort((a, b) => b.score - a.score
      || b.entry.updated.localeCompare(a.entry.updated)
      || a.entry.url.localeCompare(b.entry.url));

  return {
    query,
    language,
    limit,
    total: matches.length,
    results: matches.slice(0, limit).map(match => match.entry),
  };
}

module.exports = {
  ALLOWED_LANGUAGES,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_QUERY_LENGTH,
  SearchError,
  searchPublicContent,
  validateSearchInput,
};
