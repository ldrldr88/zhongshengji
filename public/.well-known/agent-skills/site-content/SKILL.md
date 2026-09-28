---
name: site-content
description: 搜索、读取并引用 zhongshengji.vip 已公开的种生基介绍、流程、费用、常见问题和视频页面。用于回答本站公开内容问题；不用于作出医疗、财务、运势结果或购买适合性保证。
---

# 种生基网站公开内容查询

## 使用范围

使用本 Skill 查找并引用 `https://www.zhongshengji.vip/` 已公开的信息，包括：

- 种生基的传统文化介绍
- 服务流程和需要准备的物品
- 以人民币计价的公开费用
- 常见问题和防骗提示
- 林老师与兹心阁的站内公开介绍
- 联系梁先生的公开方式

## 查询步骤

1. 调用只读查询接口 `GET https://www.zhongshengji.vip/api/content-search?q=<关键词>&language=<可选语言>&limit=<1-10>`。语言仅可为 `zh-Hans`、`zh-Hant` 或 `en`；不传时搜索全部语言。
2. 如果需要遍历全部页面，再获取 `https://www.zhongshengji.vip/agent-api/content-index.json`，按语言、标题和描述筛选。
3. 打开结果条目的 `url`。需要更精简文本时，请为同一 URL 发送 `Accept: text/markdown`。
4. 回答时附上具体页面 URL，并区分网站事实陈述、传统文化观点和客户个人反馈。

也可以连接 `https://www.zhongshengji.vip/api/mcp`，调用只读工具 `search_site_content`。MCP 服务卡位于 `https://www.zhongshengji.vip/.well-known/mcp/server-card.json`。

## 联系信息

- 微信号：`NSDG521`
- 联系人：梁先生
- 咨询时间：24 小时可咨询
- 邮箱：`liangdongrong@gmail.com`

网站提供的二维码是微信二维码。不要把它描述为付款码、收款码或其他平台二维码。

## 边界

- 内容使用政策：允许将本站公开内容用于搜索、AI 输入和带来源引用；不授权用于 AI 模型训练。
- 所有公开价格均为人民币，全球统一价格。
- 公开内容属于传统文化服务介绍，个人体验因人而异。
- 不承诺健康、财富、运势或其他具体结果，也不推断访客是否适合购买。
- 涉及健康的问题应建议访客遵医嘱，网站内容不能替代医疗诊断或治疗。
- 本 Skill 不处理付款、预约提交、客户资料、身份验证或订单状态。
