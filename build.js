const fs   = require('fs');
const Handlebars = require('handlebars');

const BASE_URL = 'https://www.zhongshengji.vip';
const TODAY    = new Date().toISOString().split('T')[0];

// ── 三语言模板 ──
const templates = {
  'zh-hans': Handlebars.compile(fs.readFileSync('./templates/page-zh-hans.html', 'utf-8')),
  'zh-hant': Handlebars.compile(fs.readFileSync('./templates/page-zh-hant.html', 'utf-8')),
  'en':      Handlebars.compile(fs.readFileSync('./templates/page-en.html',      'utf-8')),
};

// ── 确保输出目录存在 ──
['./public', './public/zh-tw', './public/en'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── 语言配置 ──
const LANG_CONFIG = {
  'zh-hans': { dir: 'data/zh-hans', outPrefix: '',       hreflang: 'zh-Hans', label: '简体中文' },
  'zh-hant': { dir: 'data/zh-hant', outPrefix: 'zh-tw/', hreflang: 'zh-Hant', label: '繁體中文' },
  'en':      { dir: 'data/en',      outPrefix: 'en/',    hreflang: 'en',      label: 'English'  },
};

// ── 静态页 ──
const staticPages = [
  { loc: '/',       priority: '1.0', changefreq: 'weekly'  },
  { loc: '/about/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/yuyue/', priority: '0.9', changefreq: 'monthly' },
  { loc: '/zh-tw/', priority: '1.0', changefreq: 'weekly'  },
  { loc: '/en/',    priority: '1.0', changefreq: 'weekly'  },
];

const allDynamicPages = [];

// ── 逐语言构建 ──
Object.entries(LANG_CONFIG).forEach(([lang, cfg]) => {
  const dataDir = `./${cfg.dir}`;
  if (!fs.existsSync(dataDir)) {
    console.warn(`⚠  目录不存在，跳过：${cfg.dir}`);
    return;
  }

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  const tmpl  = templates[lang];

  files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(`${dataDir}/${file}`, 'utf-8'));

    data.schemaString = JSON.stringify(data.schema, null, 2);
    data.lang         = lang;
    data.hreflang     = cfg.hreflang;

    const html   = tmpl(data);
    const outDir = `./public/${cfg.outPrefix}${data.slug}`;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(`${outDir}/index.html`, html);

    const loc = `/${cfg.outPrefix}${data.slug}/`;
    console.log(`✓ [${cfg.label}] ${loc}`);

    allDynamicPages.push({ loc, priority: '0.8', changefreq: 'monthly' });
  });
});

// ── 生成 sitemap.xml ──
const allPages = [...staticPages, ...allDynamicPages];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `
  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('')}
</urlset>`.trim();

fs.writeFileSync('./public/sitemap.xml', sitemapXml);
console.log(`\n✓ sitemap.xml 已更新（${allPages.length} 个 URL）`);
console.log(`✓ 完成！动态页共 ${allDynamicPages.length} 个，sitemap 共 ${allPages.length} 个 URL。`);
