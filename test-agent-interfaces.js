const assert = require('assert');
const fs = require('fs');

const contentSearchHandler = require('./api/content-search');
const mcpHandler = require('./api/mcp');

function invoke(handler, request) {
  const headers = {};
  let body = '';
  const response = {
    statusCode: 200,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    end(value = '') {
      body = value;
    },
  };
  handler(request, response);
  return { statusCode: response.statusCode, headers, body };
}

function json(body) {
  return body ? JSON.parse(body) : null;
}

const known = invoke(contentSearchHandler, {
  method: 'GET',
  query: { q: '费用', language: 'zh-Hans', limit: '3' },
});
assert.equal(known.statusCode, 200);
assert.ok(json(known.body).total > 0);
assert.ok(json(known.body).results.length <= 3);

const empty = invoke(contentSearchHandler, {
  method: 'GET',
  query: { q: '绝对不存在的查询词-8f1d2a' },
});
assert.equal(empty.statusCode, 200);
assert.deepEqual(json(empty.body).results, []);

const missing = invoke(contentSearchHandler, { method: 'GET', query: {} });
assert.equal(missing.statusCode, 400);
assert.equal(json(missing.body).error.code, 'missing_query');

const invalidLanguage = invoke(contentSearchHandler, {
  method: 'GET',
  query: { q: '费用', language: 'de' },
});
assert.equal(invalidLanguage.statusCode, 400);
assert.equal(json(invalidLanguage.body).error.code, 'invalid_language');

const naturalPreparationQuery = invoke(contentSearchHandler, {
  method: 'GET',
  query: { q: '种生基需要准备什么', language: 'zh-Hans', limit: '3' },
});
assert.equal(naturalPreparationQuery.statusCode, 200);
assert.ok(json(naturalPreparationQuery.body).total > 0);
assert.ok(json(naturalPreparationQuery.body).results.some(result => (
  result.url.endsWith('/zhong-sheng-ji-xuyao-sheme-wupin/')
)));

const scamPreventionQuery = invoke(contentSearchHandler, {
  method: 'GET',
  query: { q: '种生基怎么防骗', language: 'zh-Hans', limit: '3' },
});
assert.equal(scamPreventionQuery.statusCode, 200);
assert.ok(json(scamPreventionQuery.body).total > 0);
assert.ok(json(scamPreventionQuery.body).results.some(result => (
  result.url.endsWith('/zhong-sheng-ji-pian-ju-bian-bie/')
)));

const initialize = invoke(mcpHandler, {
  method: 'POST',
  headers: {},
  body: {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'local-audit', version: '1.0.0' },
    },
  },
});
assert.equal(initialize.statusCode, 200);
assert.equal(json(initialize.body).result.protocolVersion, '2025-11-25');

const list = invoke(mcpHandler, {
  method: 'POST',
  headers: {},
  body: { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
});
assert.equal(list.statusCode, 200);
assert.equal(json(list.body).result.tools[0].name, 'search_site_content');
assert.equal(json(list.body).result.tools[0].annotations.readOnlyHint, true);
assert.deepEqual(
  json(list.body).result.tools[0].outputSchema.properties.language.anyOf,
  [
    { type: 'string', enum: ['zh-Hans', 'zh-Hant', 'en'] },
    { type: 'null' },
  ],
);

const call = invoke(mcpHandler, {
  method: 'POST',
  headers: {},
  body: {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'search_site_content', arguments: { q: '流程', limit: 2 } },
  },
});
assert.equal(call.statusCode, 200);
assert.equal(json(call.body).result.isError, false);
assert.ok(json(call.body).result.structuredContent.total > 0);

const notification = invoke(mcpHandler, {
  method: 'POST',
  headers: {},
  body: { jsonrpc: '2.0', method: 'notifications/initialized' },
});
assert.equal(notification.statusCode, 202);
assert.equal(notification.body, '');

const rejectedOrigin = invoke(mcpHandler, {
  method: 'POST',
  headers: { origin: 'https://example.invalid' },
  body: { jsonrpc: '2.0', id: 4, method: 'tools/list', params: {} },
});
assert.equal(rejectedOrigin.statusCode, 403);

const openapi = JSON.parse(fs.readFileSync('./public/agent-api/openapi.json', 'utf8'));
assert.ok(openapi.paths['/api/content-search']);
const serverCard = JSON.parse(fs.readFileSync('./public/.well-known/mcp/server-card.json', 'utf8'));
assert.equal(serverCard.mcp.endpoint, 'https://www.zhongshengji.vip/api/mcp');

console.log('✓ Agent API 与只读 MCP 本地契约测试通过');
