# 修改说明

本包已按要求忽略“内容信任度加强”相关内容，只处理技术、SEO、构建、部署和性能层面的修改。

## 已处理

1. 修复 `mingren-fuhao-zhong-sheng-ji` slug 错误
   - 统一修正西里尔字母 `о` 和误写中文字符 `芯`
   - 重新生成简体、繁体、英文相关链接
   - sitemap 已不再包含错误 URL

2. 修复 canonical / hreflang
   - 繁体页 canonical 已指向 `/zh-tw/.../`
   - 简体、繁体、英文动态页已互相声明 hreflang
   - x-default 指向简体页

3. 修复构建系统
   - `build.js` 已支持自动生成 `data/video/*.json` 下的视频页
   - sitemap 改为根据数据源和真实 `dateModified` / 文件时间生成
   - 构建时会自动删除旧错误 slug 输出目录和 `index_backup.html`

4. 修复 sitemap
   - 当前 sitemap 共 81 个 URL
   - 无重复 URL
   - 无错误 slug
   - 动态页 lastmod 优先使用 JSON-LD 中的 `dateModified`

5. 优化 meta
   - 英文动态页 title / description 已缩短
   - 英文首页 title / description 已缩短
   - 当前生成页面未发现过长 meta

6. FAQ schema 可见性
   - 对带 FAQPage schema 的动态页，已把 FAQ 问答渲染到页面正文
   - 避免结构化数据标记页面不可见内容

7. 性能优化
   - 已把模板生成页和静态首页/关于/预约页的 inline CSS 拆到 `/public/assets/css/`
   - 所有 Google Fonts 页面已补充 `fonts.gstatic.com` preconnect

8. 安全与部署配置
   - `vercel.json` 已加入 HSTS、Permissions-Policy、CSP
   - `X-XSS-Protection` 改为 `0`
   - 为旧错误 slug 添加 301 redirect
   - 调整 Cache-Control，支持 clean URL 页面缓存策略

9. 发布包清理
   - 新增 `.gitignore`
   - 最终下载包不包含 `.git/`
   - 最终下载包不包含 `node_modules/`
   - 删除 `public/index_backup.html`

## 已验证

- `npm run build` 成功
- `node --check build.js` 成功
- `npm ci --ignore-scripts --dry-run` 成功
- 全站内部链接检查：0 个坏链接
- sitemap：81 个 URL，0 个重复
- public 输出中无旧错误 slug
- public 输出中无 inline `<style>` 标签
- public 输出中无过长 title / description
- 繁体动态页 canonical 检查通过


## 追加修复：旧错误 URL 跳转兜底

- `vercel.json` 新增 percent-encoded 版本的旧 URL redirect 规则。
- 新增 `middleware.js`，在 Vercel 文件系统路由前把两个旧错误 URL 308 到 `/mingren-fuhao-zhong-sheng-ji/`。
- `build.js` 现在会自动生成两个旧 URL 的 fallback 页面：即使服务器重定向未生效，浏览器也会自动跳到新页面。
- fallback 页面设置了 `noindex, follow` 和 canonical，避免旧 URL 被当成独立页面收录。
