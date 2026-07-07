# 本次优化说明（2026-07-07）

按约定：联系方式保持微信 NSDG521 + 邮箱不变，转化路径保持大陆统一模式不变。

## 一、新增 14 个页面（简体 7 + 繁体 7）

### 支柱页
- `/zhong-sheng-ji-quan-guo-cheng/`（繁体 `/zh-tw/...`）
  种生基两天全过程详解：第一天消灾解厄/进钱补运/开光点眼、第二天龙穴现场八步骤，
  逐环节写明目的与用意。对应"用无法复制的过程锁定客户预期"的核心策略，
  可直接作为发给犹豫客户的说服链接。

### 场景着陆页（对应《非你不可场景》五大场景）
- `/guanjian-juece-qian-zhong-sheng-ji/` 重大决策前（IPO/并购/竞标/融资）
- `/zinv-kaoshi-shengxue-zhong-sheng-ji/` 子女考试升学/留学/接班
- `/jiankang-tiaoli-zhong-sheng-ji/` 健康调理（已写明"不替代医疗、请遵医嘱"边界，
  这是对客户负责也是自我保护，建议保留）
- `/yunshi-shoucuo-zhuanyun-zhong-sheng-ji/` 运势受挫转运
- `/qiyejia-jiazu-chuancheng-zhong-sheng-ji/` 企业家家族传承/圈层

### 区域页
- `/xianggang-zhong-sheng-ji/` 香港客户专属页（香港认知度最高但本地陷阱最多，
  正面打"塔位生基 vs 龙穴种生基"的差异）

所有新页面均含完整五层结构（H1/H2/H3/Meta/Article+FAQPage Schema），
数据文件在 `data/zh-hans/` 与 `data/zh-hant/`，与原有格式完全一致，`npm run build` 即生成。

## 二、繁体版全面补厚

原繁体内容仅为简体的 30-40% 厚度。本次以 OpenCC s2twp（台湾正体+台湾用语）
将全部 22 篇简体内容转换为同等厚度的繁体版（视频→影片、信息→资讯等本地化），
覆盖 `data/zh-hant/` 全部文件。繁体模板同时补上了缺失的语言切换器，
logo 改为「種 生 基」，「立即咨询」改为「立即諮詢」。

## 三、hreflang 修复（互指才生效）

- 简体首页原本 0 条 hreflang，已补齐 4 条；en/zh-tw 首页补 x-default，三首页完全互指。
- 「多久见效」页原本错误声明英文版为 benefits-effects（该英文页回指效果案例页，
  非互指会被 Google 整组忽略），已移除错误映射。
- build.js 新增互指校验：中文页只有在英文数据文件真实存在且 `slugZhHans` 指回本页时
  才输出 `hreflang="en"`；无英文版的页面（含全部新页）不输出，语言切换 EN 按钮
  自动兜底指向 `/en/` 首页，页脚同理。

## 四、社交分享与品牌资产

- 新增 `public/assets/img/og-default.png`（1200×630 品牌分享图）、
  `icon-192.png`、`icon-512.png`、`public/favicon.ico`。
- 全部模板与静态页补齐 og:image、twitter:card、favicon、apple-touch-icon。
  视频页 og:image 自动使用该视频的 YouTube 封面图。
- 微信/WhatsApp/LINE 中转发链接将显示品牌预览图。
- 建议后续用实拍图（法会现场、龙穴、宝盒）替换默认分享图，说服力更强。

## 五、E-E-A-T 与品牌实体

- `/about/` 注入完整 JSON-LD：林志萦大师 Person（生年、五本著作、易学百大人物、
  学会职务）、林家骅老师 Person（法名林易禅、张天师奏职、狮子会会长）、
  兹心阁 Organization（alternateName、创办时间、founder/employee 关联）。
- 首页 Organization schema 增加 alternateName（兹心阁、兹心阁开运会馆）。
- 全部文章页 hero 区新增可见署名行：作者梁东荣 + 内容监修林家骅。

## 六、首页内链结构

新增两个区块（复用现有样式，未改 CSS）：
- 「按场景了解」：6 张卡片链向新场景页与香港页；
- 「视频解答」：3 个精选视频 + 视频合集入口（原先首页对 31 个视频页零内链）。
页脚补 3 条新页链接。

## 七、缓存策略修正

`vercel.json` 中 css/js 等静态资源原为 `max-age=31536000, immutable`，
但文件名无内容指纹，改版后老访客一年拿不到新样式。
已改为 `max-age=86400, stale-while-revalidate=604800`。

## 构建与验证结果

- `npm run build` 通过；sitemap 由 81 增至 95 个 URL，无重复。
- 全站内链检查：0 坏链。
- hreflang 互指抽查通过（简体效果页 ↔ 英文 benefits 页双向一致）。
- 新页繁体版 canonical 正确指向 `/zh-tw/.../`。

## 建议的后续动作（本次未做）

1. 补实拍图片：法会现场、龙穴环境、生基宝盒，插入全过程页与首页，并替换 og 默认图。
2. 英文版场景页：若海外英文客群有量，可为 6 个新页补英文版
   （补好后在英文 JSON 中声明 slugZhHans，hreflang 会自动接通）。
3. 留资渠道：将 FAQ 24 问排版为 PDF 手册，在页面提供"邮件索取"入口，沉淀客户名单。
4. Google Search Console 提交新 sitemap，观察新页收录与场景词排名。
