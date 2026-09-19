const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Handlebars = require('handlebars');

const BASE_URL = 'https://www.zhongshengji.vip';
const PUBLIC_DIR = './public';
const contentEntries = [];

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
  './public/mingren-fuha#U043e-zhong-sheng-ji',
  './public/mingren-fuha#U82af-zhong-sheng-ji',
  './public/mingren-fuhaо-zhong-sheng-ji',
  './public/mingren-fuha芯-zhong-sheng-ji',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function removeStalePaths() {
  stalePaths.forEach(p => {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlMeta(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]
    || '';
  return { title: stripHtml(title), description: stripHtml(description) };
}

function htmlToMarkdown(html) {
  return String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, '')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

function writeMarkdownRepresentations() {
  const stack = [PUBLIC_DIR];
  let count = 0;

  while (stack.length) {
    const dir = stack.pop();
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.name === 'index.html') {
        const html = fs.readFileSync(fullPath, 'utf-8');
        if (/name=["']robots["'][^>]+noindex/i.test(html)) return;
        fs.writeFileSync(path.join(dir, 'index.md'), htmlToMarkdown(html));
        count += 1;
      }
    });
  }

  return count;
}

function writeAgentResources() {
  const apiDir = path.join(PUBLIC_DIR, 'agent-api');
  const wellKnownDir = path.join(PUBLIC_DIR, '.well-known');
  const skillPublicDir = path.join(wellKnownDir, 'agent-skills', 'site-content');
  ensureDir(apiDir);
  ensureDir(skillPublicDir);

  const indexDocument = {
    name: '种生基网站公开内容索引',
    description: '用于搜索和引用本站已公开文章。内容属于传统文化资料，不构成医疗、财务或结果保证。',
    generatedAt: `${contentEntries.reduce((latest, entry) => entry.updated > latest ? entry.updated : latest, '1970-01-01')}T00:00:00.000Z`,
    total: contentEntries.length,
    entries: contentEntries,
  };
  fs.writeFileSync(path.join(apiDir, 'content-index.json'), JSON.stringify(indexDocument, null, 2));

  const openapi = {
    openapi: '3.1.0',
    info: {
      title: '种生基网站公开内容 API',
      version: '1.0.0',
      description: '只读内容索引，用于查找并引用本站公开页面。',
    },
    servers: [{ url: BASE_URL }],
    paths: {
      '/agent-api/content-index.json': {
        get: {
          operationId: 'listPublicContent',
          summary: '列出可公开检索的页面',
          responses: {
            200: {
              description: '公开内容索引',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
    },
  };
  fs.writeFileSync(path.join(apiDir, 'openapi.json'), JSON.stringify(openapi, null, 2));
  fs.writeFileSync(path.join(apiDir, 'docs.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>种生基网站公开内容 API</title><body><main><h1>种生基网站公开内容 API</h1><p>这是只读公开内容索引，用于查找并引用本站文章。</p><ul><li><a href="/agent-api/content-index.json">内容索引</a></li><li><a href="/agent-api/openapi.json">OpenAPI 文档</a></li></ul><p>传统文化内容不构成医疗、财务或结果保证。</p></main></body></html>`);

  const skillSource = './agent-skills/site-content/SKILL.md';
  const skillText = fs.readFileSync(skillSource, 'utf-8');
  const skillDigest = crypto.createHash('sha256').update(skillText).digest('hex');
  fs.writeFileSync(path.join(skillPublicDir, 'SKILL.md'), skillText);
  fs.writeFileSync(path.join(wellKnownDir, 'agent-skills', 'index.json'), JSON.stringify({
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [{
      name: 'site-content',
      type: 'skill-md',
      description: '搜索、读取并引用种生基网站的公开内容。',
      url: `${BASE_URL}/.well-known/agent-skills/site-content/SKILL.md`,
      digest: `sha256:${skillDigest}`,
    }],
  }, null, 2));

  const apiCatalogText = JSON.stringify({
    linkset: [{
      anchor: `${BASE_URL}/agent-api/content-index.json`,
      'service-desc': [{ href: `${BASE_URL}/agent-api/openapi.json`, type: 'application/vnd.oai.openapi+json;version=3.1' }],
      'service-doc': [{ href: `${BASE_URL}/agent-api/docs.html`, type: 'text/html' }],
    }],
  }, null, 2);
  fs.writeFileSync(path.join(wellKnownDir, 'api-catalog.json'), apiCatalogText);

  fs.writeFileSync(path.join(wellKnownDir, 'ai-catalog.json'), JSON.stringify({
    specVersion: '1.0',
    host: { displayName: '种生基网站', identifier: 'did:web:www.zhongshengji.vip' },
    entries: [
      {
        identifier: 'urn:air:www.zhongshengji.vip:api:public-content',
        displayName: '种生基网站公开内容索引',
        type: 'application/vnd.oai.openapi+json;version=3.1',
        url: `${BASE_URL}/agent-api/openapi.json`,
        representativeQueries: ['什么是种生基', '种生基需要准备什么', '种生基费用和流程是什么'],
      },
      {
        identifier: 'urn:air:www.zhongshengji.vip:skill:site-content',
        displayName: '种生基网站内容查询 Skill',
        type: 'text/markdown',
        url: `${BASE_URL}/.well-known/agent-skills/site-content/SKILL.md`,
        representativeQueries: ['搜索种生基相关文章', '读取种生基常见问题', '引用种生基网站公开资料'],
      },
    ],
  }, null, 2));

  const llmsLines = [
    '# 种生基网站',
    '',
    '> 台湾兹心阁种生基公开资料。内容属于传统文化介绍，个人体验因人而异，不构成医疗、财务或结果保证。',
    '',
    '## 公开内容',
    '',
    ...contentEntries.map(entry => `- [${entry.title}](${entry.url}): ${entry.description}`),
    '',
    '## 机器可读入口',
    '',
    `- [内容索引](${BASE_URL}/agent-api/content-index.json)`,
    `- [OpenAPI](${BASE_URL}/agent-api/openapi.json)`,
    `- [Agent Skill](${BASE_URL}/.well-known/agent-skills/site-content/SKILL.md)`,
  ];
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsLines.join('\n') + '\n');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsLines.join('\n') + '\n');
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
    // 互指校验：仅当英文数据文件真实存在且声明了对应中文 slug 时，
    // 中文页才输出 hreflang="en"，避免非互指的 hreflang 被 Google 忽略
    enTargetByZhHans: new Map(),
  };

  listJsonFiles(LANG_CONFIG['en'].dir).forEach(filePath => {
    const data = readJson(filePath);
    if (data.slug && data.slugZhHans) {
      maps.enTargetByZhHans.set(data.slugZhHans, data.slug);
    }
  });

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

  if (lang === 'en') {
    enriched.hasEn = true;
    enriched.slugEn = enriched.slug;
  } else {
    // 只承认互指的英文版：英文数据文件必须声明 slugZhHans 指回本页
    const reciprocalEn = maps.enTargetByZhHans.get(enriched.slugZhHans);
    enriched.hasEn = Boolean(reciprocalEn);
    enriched.slugEn = reciprocalEn || '';
  }

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

  const maps = buildLanguageMaps();
  const pages = [];

  staticPages.forEach(page => {
    if (fs.existsSync(page.file)) {
      const meta = htmlMeta(page.file);
      pages.push({
        ...page,
        lastmod: fs.statSync(page.file).mtime.toISOString().slice(0, 10),
      });
      contentEntries.push({
        language: page.loc === '/en/' ? 'en' : page.loc === '/zh-tw/' ? 'zh-Hant' : 'zh-Hans',
        title: meta.title,
        description: meta.description,
        url: `${BASE_URL}${page.loc}`,
        updated: fs.statSync(page.file).mtime.toISOString().slice(0, 10),
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
      contentEntries.push({
        language: cfg.hreflang,
        title: stripHtml(rawData.metaTitle || rawData.h1),
        description: stripHtml(rawData.metaDescription || rawData.heroSub),
        url: `${BASE_URL}${loc}`,
        updated: getLastmod(rawData, filePath),
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
    contentEntries.push({
      language: 'zh-Hans',
      title: stripHtml(rawData.metaTitle || rawData.h1),
      description: stripHtml(rawData.metaDescription || rawData.heroSub),
      url: `${BASE_URL}${loc}`,
      updated: getLastmod(rawData, filePath),
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
  writeAgentResources();
  const markdownCount = writeMarkdownRepresentations();
  console.log(`✓ AI 公开内容索引已更新（${contentEntries.length} 条）`);
  console.log(`✓ Markdown 表示已更新（${markdownCount} 个页面）`);
  console.log('✓ 完成！');
}

build();
