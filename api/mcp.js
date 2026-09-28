const { SearchError, searchPublicContent } = require('../lib/content-search');

const PROTOCOL_VERSION = '2025-11-25';
const SUPPORTED_PROTOCOL_VERSIONS = new Set([
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
]);
const ALLOWED_ORIGINS = new Set([
  'https://www.zhongshengji.vip',
  'https://zhongshengji.vip',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const SEARCH_TOOL = {
  name: 'search_site_content',
  title: '搜索种生基网站公开内容',
  description: '按关键词和可选语言搜索 zhongshengji.vip 的公开文章与视频页面。只读，不提交预约或客户资料。',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['q'],
    properties: {
      q: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: '查询关键词；多个空格分隔的关键词必须同时匹配。',
      },
      language: {
        type: 'string',
        enum: ['zh-Hans', 'zh-Hant', 'en'],
        description: '可选语言过滤。',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
        default: 5,
        description: '最多返回的结果数。',
      },
    },
  },
  outputSchema: {
    type: 'object',
    required: ['query', 'language', 'limit', 'total', 'results'],
    properties: {
      query: { type: 'string' },
      language: { type: ['string', 'null'] },
      limit: { type: 'integer' },
      total: { type: 'integer', minimum: 0 },
      results: {
        type: 'array',
        items: {
          type: 'object',
          required: ['language', 'title', 'description', 'url', 'updated'],
          properties: {
            language: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            updated: { type: 'string', format: 'date' },
          },
        },
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id: id === undefined ? null : id, error };
}

function handleMessage(message) {
  if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return jsonRpcError(message && message.id, -32600, 'Invalid Request');
  }

  const isNotification = message.id === undefined;
  if (message.method === 'notifications/initialized' || message.method.startsWith('notifications/')) {
    return isNotification ? null : jsonRpcResult(message.id, {});
  }

  if (message.method === 'initialize') {
    const requestedVersion = message.params && message.params.protocolVersion;
    const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requestedVersion)
      ? requestedVersion
      : PROTOCOL_VERSION;
    return jsonRpcResult(message.id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'zhongshengji-public-content', version: '1.0.0' },
      instructions: '仅搜索并返回 zhongshengji.vip 的公开内容。结果属于传统文化资料，不构成医疗、财务或效果保证。',
    });
  }

  if (message.method === 'ping') {
    return jsonRpcResult(message.id, {});
  }

  if (message.method === 'tools/list') {
    return jsonRpcResult(message.id, { tools: [SEARCH_TOOL] });
  }

  if (message.method === 'tools/call') {
    const name = message.params && message.params.name;
    if (name !== SEARCH_TOOL.name) {
      return jsonRpcError(message.id, -32602, 'Unknown tool', { name });
    }

    try {
      const result = searchPublicContent((message.params && message.params.arguments) || {});
      return jsonRpcResult(message.id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
        isError: false,
      });
    } catch (error) {
      if (error instanceof SearchError) {
        return jsonRpcResult(message.id, {
          content: [{ type: 'text', text: error.message }],
          isError: true,
        });
      }
      return jsonRpcError(message.id, -32603, 'Internal error');
    }
  }

  return jsonRpcError(message.id, -32601, 'Method not found');
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id');
  response.setHeader('Access-Control-Expose-Headers', 'Mcp-Protocol-Version');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Origin');
}

module.exports = function handler(request, response) {
  setCorsHeaders(response);

  const origin = request.headers && request.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    response.statusCode = 403;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    return response.end(JSON.stringify({ error: 'origin_not_allowed' }));
  }
  if (origin) response.setHeader('Access-Control-Allow-Origin', origin);

  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    return response.end();
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST, OPTIONS');
    response.statusCode = 405;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    return response.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  let message;
  try {
    message = request.body;
  } catch {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    return response.end(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')));
  }

  if (typeof message === 'string') {
    try {
      message = JSON.parse(message);
    } catch {
      response.statusCode = 400;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      return response.end(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')));
    }
  }

  const result = handleMessage(message);
  if (result === null) {
    response.statusCode = 202;
    return response.end();
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Mcp-Protocol-Version', PROTOCOL_VERSION);
  return response.end(JSON.stringify(result));
};

module.exports.handleMessage = handleMessage;
module.exports.SEARCH_TOOL = SEARCH_TOOL;
