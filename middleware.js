// Vercel middleware: canonical host, legacy redirects and Markdown negotiation.
export const config = {
  matcher: '/:path*',
};

const TARGET_PATH = '/mingren-fuhao-zhong-sheng-ji/';
const LEGACY_PATHS = new Set([
  '/mingren-fuhaо-zhong-sheng-ji/', // the "о" is Cyrillic U+043E, not Latin o
  '/mingren-fuha芯-zhong-sheng-ji/',
]);

function safeDecodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function withTrailingSlash(pathname) {
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const decodedPath = withTrailingSlash(safeDecodePath(url.pathname));

  if (url.hostname === 'zhongshengji.vip') {
    url.hostname = 'www.zhongshengji.vip';
    return Response.redirect(url, 308);
  }

  if (LEGACY_PATHS.has(decodedPath)) {
    const target = new URL(TARGET_PATH, request.url);
    target.search = url.search;
    return Response.redirect(target, 308);
  }

  if (url.pathname === '/.well-known/api-catalog') {
    const catalogUrl = new URL('/.well-known/api-catalog.json', request.url);
    const response = await fetch(catalogUrl, { headers: { accept: 'application/json' } });
    const headers = new Headers(response.headers);
    headers.set('content-type', 'application/linkset+json; charset=utf-8');
    headers.set('access-control-allow-origin', '*');
    return new Response(request.method === 'HEAD' ? null : await response.text(), {
      status: response.status,
      headers,
    });
  }

  const acceptsMarkdown = request.method === 'GET'
    && (request.headers.get('accept') || '').toLowerCase().includes('text/markdown');
  const looksLikePage = url.pathname.endsWith('/') || !pathSegment(url.pathname).includes('.');

  if (acceptsMarkdown && looksLikePage) {
    const markdownUrl = new URL(request.url);
    markdownUrl.pathname = url.pathname === '/'
      ? '/index.md'
      : `${withTrailingSlash(url.pathname)}index.md`;
    markdownUrl.search = '';

    const response = await fetch(markdownUrl, {
      headers: { accept: 'text/plain' },
    });
    if (response.ok) {
      const body = await response.text();
      const headers = new Headers(response.headers);
      headers.set('content-type', 'text/markdown; charset=utf-8');
      headers.set('vary', 'Accept');
      headers.set('x-markdown-tokens', String(Math.max(1, Math.ceil(body.length / 4))));
      return new Response(body, { status: 200, headers });
    }
  }

  // Returning undefined lets Vercel continue to normal filesystem routing.
}

function pathSegment(pathname) {
  return pathname.split('/').filter(Boolean).pop() || '';
}
