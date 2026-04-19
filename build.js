const fs   = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const BASE_URL  = 'https://www.zhongshengji.vip';
const TODAY     = new Date().toISOString().split('T')[0];

// 读取模板
const templateSrc = fs.readFileSync('./templates/page.html', 'utf-8');
const template    = Handlebars.compile(templateSrc);

// 确保输出目录存在
if (!fs.existsSync('./public')) fs.mkdirSync('./public');

// ── 静态页面（固定，不走 JSON 工厂）──
const staticPages = [
  { loc: '/',        priority: '1.0', changefreq: 'weekly'  },
  { loc: '/about/',  priority: '0.8', changefreq: 'monthly' },
  { loc: '/yuyue/',  priority: '0.9', changefreq: 'monthly' },
];

// ── 读取 data/ 里的所有 JSON，生成页面 ──
const files = fs.readdirSync('./data').filter(f => f.endsWith('.json'));
const dynamicPages = [];

files.forEach(file => {
  const raw  = fs.readFileSync(`./data/${file}`, 'utf-8');
  const data = JSON.parse(raw);

  // Schema 转成字符串，填进模板
  data.schemaString = JSON.stringify(data.schema, null, 2);

  // 生成 HTML
  const html = template(data);

  // 以 slug 命名，写入 public/ 目录
  const outDir = `./public/${data.slug}`;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(`${outDir}/index.html`, html);

  console.log(`✓ Built: /${data.slug}/`);

  // 记录进 sitemap 动态列表
  dynamicPages.push({
    loc:        `/${data.slug}/`,
    priority:   '0.8',
    changefreq: 'monthly',
  });
});

// ── 自动生成 sitemap.xml ──
const allPages = [...staticPages, ...dynamicPages];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `
  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('')}
</urlset>
`;

fs.writeFileSync('./public/sitemap.xml', sitemapXml.trim());
console.log(`✓ sitemap.xml 已更新（${allPages.length} 个 URL）`);

console.log(`\n完成！共生成 ${files.length} 个动态页面，sitemap 包含 ${allPages.length} 个 URL。`);
