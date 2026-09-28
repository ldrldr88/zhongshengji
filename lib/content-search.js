const contentIndex = require('../public/agent-api/content-index.json');

const ALLOWED_LANGUAGES = new Set(['zh-Hans', 'zh-Hant', 'en']);
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const MAX_QUERY_LENGTH = 100;
const SEARCH_SYNONYM_GROUPS = [
  ['什么是', '是什么', '什么意思', '意思', '含义', '介绍'],
  ['准备', '需要', '备齐'],
  ['物品', '材料', '用品', '物料'],
  ['防骗', '骗局', '诈骗', '骗术', '辨别', '真假'],
  ['费用', '价格', '多少钱', '收费', '报价'],
  ['流程', '步骤', '过程', '怎么做', '做法'],
  ['风险', '代价', '后果', '坏处', '禁忌'],
  ['多久', '时间', '见效', '何时'],
];

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

function expandToken(token) {
  const group = SEARCH_SYNONYM_GROUPS.find(items => items.includes(token));
  return { token, alternatives: group || [token] };
}

function buildQueryTerms(normalizedQuery) {
  const rawTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (rawTokens.length > 1) return rawTokens.map(expandToken);

  const matchedGroups = SEARCH_SYNONYM_GROUPS
    .map(items => ({ token: items.find(item => normalizedQuery.includes(item)), alternatives: items }))
    .filter(term => term.token);

  return matchedGroups.length > 0
    ? matchedGroups
    : rawTokens.map(expandToken);
}

function includesAny(value, alternatives) {
  return alternatives.some(alternative => value.includes(alternative));
}

function scoreEntry(entry, normalizedQuery, terms) {
  const title = normalize(entry.title);
  const description = normalize(entry.description);
  const url = normalize(entry.url);
  const searchable = `${title} ${description} ${url}`;

  if (!terms.every(term => includesAny(searchable, term.alternatives))) return -1;

  let score = 0;
  if (title === normalizedQuery) score += 100;
  if (title.includes(normalizedQuery)) score += 50;
  if (description.includes(normalizedQuery)) score += 20;
  terms.forEach(term => {
    if (title.includes(term.token)) score += 12;
    else if (includesAny(title, term.alternatives)) score += 8;
    if (description.includes(term.token)) score += 4;
    else if (includesAny(description, term.alternatives)) score += 2;
    if (url.includes(term.token)) score += 1;
  });
  return score;
}

function searchPublicContent(input = {}) {
  const { query, language, limit } = validateSearchInput(input);
  const normalizedQuery = normalize(query);
  const terms = buildQueryTerms(normalizedQuery);

  const matches = contentIndex.entries
    .filter(entry => !language || entry.language === language)
    .map(entry => ({ entry, score: scoreEntry(entry, normalizedQuery, terms) }))
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
  SEARCH_SYNONYM_GROUPS,
  SearchError,
  buildQueryTerms,
  searchPublicContent,
  validateSearchInput,
};
