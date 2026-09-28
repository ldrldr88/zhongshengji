const { SearchError, searchPublicContent } = require('../lib/content-search');

function setCommonHeaders(response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
}

module.exports = function handler(request, response) {
  setCommonHeaders(response);

  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    return response.end();
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, OPTIONS');
    response.statusCode = 405;
    return response.end(JSON.stringify({
      error: { code: 'method_not_allowed', message: '仅支持 GET 查询。' },
    }));
  }

  try {
    const result = searchPublicContent({
      q: request.query && request.query.q,
      language: request.query && request.query.language,
      limit: request.query && request.query.limit,
    });
    response.statusCode = 200;
    return response.end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof SearchError) {
      response.statusCode = 400;
      return response.end(JSON.stringify({
        error: { code: error.code, message: error.message },
      }));
    }

    response.statusCode = 500;
    return response.end(JSON.stringify({
      error: { code: 'internal_error', message: '内容查询暂时不可用。' },
    }));
  }
};
