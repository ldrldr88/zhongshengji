const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const BASE_URL = 'https://www.zhongshengji.vip';
const PUBLIC_DIR = './public';

const templates = {
  'zh-hans': Handlebars.compile(fs.readFileSync('./templates/page-zh-hans.html', 'utf-8')),
  'zh-hant': Handlebars.compile(fs.readFileSync('./templates/page-zh-hant.html', 'utf-8')),
  'en': Handlebars.compile(fs.readFileSync('./templates/page-en.html', 'utf-8')),
  'video': Handlebars.compile(fs.readFileSync('./templates/page-video.html', 'utf-8')),
};

const LANG_CONFIG = {
  'zh-hans': { dir: 'data/zh-hans', outPrefix: '', hreflang: 'zh-Hans', label: '简体中文' },
  'zh-hant': { dir: 'data/zh-hant', outPrefix: 'zh-tw/', hreflang: 'zh-Hant', label: '繁體中文' },
  'en': { dir: 'data/en', outPrefix: 'en/', hreflang: 'en', label: 'English' },
};

const staticPages = [
  { loc: '/', file: './public/index.html', priority: '1.0', changefreq: 'weekly' },
  { loc: '/about/', file: './public/about/index.html', priority: '0.8', changefreq: 'monthly' },
  { loc: '/yuyue/', file: './public/yuyue/index.html', priority: '0.9', changefreq: 'monthly' },
  { loc: '/zh-tw/', file: './public/zh-tw/index.html', priority: '1.0', changefreq: 'weekly' },
  { loc: '/en/', file: './public/en/index.html', priority: '1.0', changefreq: 'weekly' },
];

const stalePaths = [
  './public/index_backup.html',
];

const legacyRedirectPaths = [
  'mingren-fuhaо-zhong-sheng-ji', // Cyrillic о
  'mingren-fuha芯-zhong-sheng-ji',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function removeStalePaths() {
  stalePaths.forEach(p => {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  });
}

function legacyRedirectHtml() {
  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <title>页面已迁移</title>
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${BASE_URL}/mingren-fuhao-zhong-sheng-ji/">
  <meta http-equiv="refresh" content="0; url=/mingren-fuhao-zhong-sheng-ji/">
  <script>location.replace('/mingren-fuhao-zhong-sheng-ji/' + location.search);</script>
</head>
<body>
  <p>页面已迁移，请访问 <a href="/mingren-fuhao-zhong-sheng-ji/">新页面</a>。</p>
</body>
</html>`;
}

function writeLegacyRedirectPages() {
  legacyRedirectPaths.forEach(slug => {
    const outDir = path.join(PUBLIC_DIR, slug);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'index.html'), legacyRedirectHtml());
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => path.join(dir, f));
}

function getLastmod(data, filePath) {
  const schema = data && data.schema ? data.schema : {};
  const candidates = [
    schema.dateModified,
    schema.datePublished,
    schema.uploadDate,
    data.dateModified,
    data.datePublished,
  ].filter(Boolean);

  if (candidates.length > 0) return String(candidates[0]).slice(0, 10);

  if (fs.existsSync(filePath)) {
    return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function extractFaqItems(schema) {
  if (!schema) return [];

  const schemas = Array.isArray(schema['@graph']) ? schema['@graph'] : [schema];
  const items = [];

  schemas.forEach(node => {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    const isFaq = types.includes('FAQPage') || Array.isArray(node.mainEntity);
    if (!isFaq || !Array.isArray(node.mainEntity)) return;

    node.mainEntity.forEach(entity => {
      if (!entity || entity['@type'] !== 'Question') return;
      const answer = entity.acceptedAnswer && entity.acceptedAnswer.text;
      if (!entity.name || !answer) return;
      items.push({
        question: entity.name,
        answer,
      });
    });
  });

  return items;
}

function buildLanguageMaps() {
  const maps = {
    byEn: new Map(),
    byZhHans: new Map(),
    byZhHant: new Map(),
  };

  Object.entries(LANG_CONFIG).forEach(([lang, cfg]) => {
    listJsonFiles(cfg.dir).forEach(filePath => {
      const data = readJson(filePath);
      const zhHans = data.slugZhHans || (lang === 'zh-hans' ? data.slug : undefined);
      const zhHant = data.slugZhHant || (lang === 'zh-hant' ? data.slug : zhHans);
      const en = data.slugEn || (lang === 'en' ? data.slug : undefined);
      const record = { zhHans, zhHant, en };

      if (en && !maps.byEn.has(en)) maps.byEn.set(en, record);
      if (zhHans && !maps.byZhHans.has(zhHans)) maps.byZhHans.set(zhHans, record);
      if (zhHant && !maps.byZhHant.has(zhHant)) maps.byZhHant.set(zhHant, record);
    });
  });

  return maps;
}

function enrichDataForLanguage(data, lang, maps) {
  const enriched = { ...data };
  let record;

  if (lang === 'en') {
    record = maps.byEn.get(enriched.slug);
    enriched.slugEn = enriched.slug;
  } else if (lang === 'zh-hant') {
    record = maps.byZhHant.get(enriched.slug) || maps.byZhHans.get(enriched.slug);
    enriched.slugZhHant = enriched.slug;
  } else {
    record = maps.byZhHans.get(enriched.slug) || maps.byZhHant.get(enriched.slug);
    enriched.slugZhHans = enriched.slug;
  }

  enriched.slugZhHans = enriched.slugZhHans || (record && record.zhHans) || enriched.slug;
  enriched.slugZhHant = enriched.slugZhHant || (record && record.zhHant) || enriched.slugZhHans || enriched.slug;
  enriched.slugEn = enriched.slugEn || (record && record.en) || enriched.slug;

  enriched.schemaString = JSON.stringify(enriched.schema || {}, null, 2);
  enriched.faqItems = extractFaqItems(enriched.schema);
  enriched.lang = lang;

  return enriched;
}

function renderPage(tmpl, data, outDir) {
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), tmpl(data));
}

function sitemapEntry(page) {
  return `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
}

function build() {
  ensureDir(PUBLIC_DIR);
  ensureDir('./public/zh-tw');
  ensureDir('./public/en');
  removeStalePaths();
  writeLegacyRedirectPages();

  const maps = buildLanguageMaps();
  const pages = [];

  staticPages.forEach(page => {
    if (fs.existsSync(page.file)) {
      pages.push({
        ...page,
        lastmod: fs.statSync(page.file).mtime.toISOString().slice(0, 10),
      });
    }
  });

  Object.entries(LANG_CONFIG).forEach(([lang, cfg]) => {
    const files = listJsonFiles(cfg.dir);
    const tmpl = templates[lang];

    files.forEach(filePath => {
      const rawData = readJson(filePath);
      const data = enrichDataForLanguage(rawData, lang, maps);
      const loc = `/${cfg.outPrefix}${data.slug}/`;
      const outDir = path.join(PUBLIC_DIR, cfg.outPrefix, data.slug);

      renderPage(tmpl, data, outDir);
      console.log(`✓ [${cfg.label}] ${loc}`);

      pages.push({
        loc,
        lastmod: getLastmod(rawData, filePath),
        priority: '0.8',
        changefreq: 'monthly',
      });
    });
  });

  listJsonFiles('./data/video').forEach(filePath => {
    const rawData = readJson(filePath);
    const data = {
      ...rawData,
      schemaString: JSON.stringify(rawData.schema || {}, null, 2),
      faqItems: extractFaqItems(rawData.schema),
      lang: 'video',
    };
    const loc = `/${data.slug}/`;
    const outDir = path.join(PUBLIC_DIR, data.slug);

    renderPage(templates.video, data, outDir);
    console.log(`✓ [视频] ${loc}`);

    pages.push({
      loc,
      lastmod: getLastmod(rawData, filePath),
      priority: data.slug === 'videos' ? '0.8' : '0.7',
      changefreq: 'monthly',
    });
  });

  const seen = new Set();
  const uniquePages = pages
    .filter(page => {
      if (seen.has(page.loc)) return false;
      seen.add(page.loc);
      return true;
    })
    .sort((a, b) => a.loc.localeCompare(b.loc));

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniquePages.map(sitemapEntry).join('\n')}
</urlset>`;

  fs.writeFileSync('./public/sitemap.xml', sitemapXml);
  console.log(`\n✓ sitemap.xml 已更新（${uniquePages.length} 个 URL）`);
  console.log('✓ 完成！');
}

build();
