// Vercel Routing Middleware: normalize legacy typo URLs before static files are served.
// It catches both raw Unicode and percent-encoded forms:
//   /mingren-fuhaо-zhong-sheng-ji/  (Cyrillic о)
//   /mingren-fuha芯-zhong-sheng-ji/
export const config = {
  matcher: '/mingren-fuha:path*',
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

export default function middleware(request) {
  const url = new URL(request.url);
  const decodedPath = withTrailingSlash(safeDecodePath(url.pathname));

  if (LEGACY_PATHS.has(decodedPath)) {
    const target = new URL(TARGET_PATH, request.url);
    target.search = url.search;
    return Response.redirect(target, 308);
  }

  // Returning undefined lets Vercel continue to normal filesystem routing.
}
