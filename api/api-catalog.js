const BASE_URL = 'https://www.zhongshengji.vip';

module.exports = function handler(request, response) {
  response.setHeader('Content-Type', 'application/linkset+json; charset=utf-8');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  response.statusCode = 200;
  response.end(JSON.stringify({
    linkset: [{
      anchor: `${BASE_URL}/agent-api/content-index.json`,
      'service-desc': [{
        href: `${BASE_URL}/agent-api/openapi.json`,
        type: 'application/vnd.oai.openapi+json;version=3.1',
      }],
      'service-doc': [{
        href: `${BASE_URL}/agent-api/docs.html`,
        type: 'text/html',
      }],
    }],
  }));
};
