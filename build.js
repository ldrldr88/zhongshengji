
const fs = require('fs');
const Handlebars = require('handlebars');

const BASE_URL = 'https://www.zhongshengji.vip';
const TODAY = new Date().toISOString().split('T')[0];

const templates = {
  'zh-hans': Handlebars.compile(fs.readFileSync('./templates/page-zh-hans.html', 'utf-8')),
  'zh-hant': Handlebars.compile(fs.readFileSync('./templates/page-zh-hant.html', 'utf-8')),
  'en': Handlebars.compile(fs.readFileSync('./templates/page-en.html', 'utf-8')),
};

['./public', './public/zh-tw', './public/en'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const LANG_CONFIG = {
  'zh-hans': { dir: 'data/zh-hans', outPrefix: '', hreflang: 'zh-Hans', label: '简体中文' },
  'zh-hant': { dir: 'data/zh-hant', outPrefix: 'zh-tw/', hreflang: 'zh-Hant', label: '繁體中文' },
  'en': { dir: 'data/en', outPrefix: 'en/', hreflang: 'en', label: 'English' },
};

const staticPages = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/about/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/yuyue/', priority: '0.9', changefreq: 'monthly' },
  { loc: '/zh-tw/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/en/', priority: '1.0', changefreq: 'weekly' },
];

const videoPages = [
  { loc: '/videos/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-24-wenti/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-bian-bie-zhengjia/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-duojiu-youxiaoguo/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-fei-yong-wei-he-gao/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-fenmudi-zhong-sheng-ji/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-fuchao/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-fuzhoyong/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-guanyu-women/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-hewei-zhong-sheng-ji/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-jiali-zhong-sheng-ji/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-kehu-quancheng/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-liang-dongrong-tiyan/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-longxue-tudi/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-misi/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-nian-ji-zhong-sheng-ji/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-qita-gaiyun/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-qiyuan/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-san-fenzhong-jieshao/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-shui-xuyao-zhong-sheng-ji/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-sihou-youyong/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-tou-zhong-sheng-ji/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-tuandui-zhongshengji/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-women-geng-hao/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-xuanxue-yiju/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-yingxiang-zisun/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-zhengming-bu-pian/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-zhong-ji-ci/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-zhong-sheng-ji-chengxu/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-zhong-sheng-ji-gonghao/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-zhong-sheng-ji-haochu/', priority: '0.8', changefreq: 'monthly' },
  { loc: '/video-zuojianfanke/', priority: '0.8', changefreq: 'monthly' },
];

const allDynamicPages = [];

Object.entries(LANG_CONFIG).forEach(([lang, cfg]) => {
  const dataDir = `./${cfg.dir}`;
  if (!fs.existsSync(dataDir)) {
    console.warn(`⚠  目录不存在，跳过：${cfg.dir}`);
    return;
  }

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  const tmpl = templates[lang];

  files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(`${dataDir}/${file}`, 'utf-8'));

    data.schemaString = JSON.stringify(data.schema, null, 2);
    data.lang = lang;
    data.hreflang = cfg.hreflang;

    const html = tmpl(data);
    const outDir = `./public/${cfg.outPrefix}${data.slug}`;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(`${outDir}/index.html`, html);

    const loc = `/${cfg.outPrefix}${data.slug}/`;
    console.log(`✓ [${cfg.label}] ${loc}`);

    allDynamicPages.push({ loc, priority: '0.8', changefreq: 'monthly' });
  });
});

const allPages = [...staticPages, ...videoPages, ...allDynamicPages];
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
console.log(`
✓ sitemap.xml 已更新（${allPages.length} 个 URL）`);
console.log(`✓ 完成！动态页共 ${allDynamicPages.length} 个，sitemap 共 ${allPages.length} 个 URL。`);
