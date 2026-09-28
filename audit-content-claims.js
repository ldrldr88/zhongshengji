const fs = require('fs');
const path = require('path');

const ROOTS = ['data/zh-hans', 'data/zh-hant', 'data/en', 'data/video'];
const TEXT_KEYS = new Set([
  'metaTitle',
  'metaDescription',
  'h1',
  'h2',
  'h3',
  'heroSub',
  'content',
  'contentSummary',
  'description',
  'text',
  'answer',
  'readingNote',
]);

const RISK_PATTERNS = [
  /(?:一定会|一定會|必定|必然|确保|確保|保证|保證|立竿见影|立竿見影)/i,
  /(?:最显著|最顯著|效果尤为|效果尤為|效果更佳|效果更加|效果最为|效果最為)/i,
  /(?:能助|能够|能夠|有助于|有助於|会直接|會直接).{0,24}(?:提升|改善|改变|改變|获得|獲得|成功|晋升|晉升|生育|健康|财富|財富|运势|運勢)/i,
  /(?:提升|改善|提振|开启|開啟|增加|增多|显现|顯現|实现|實現).{0,24}(?:运势|運勢|财运|財運|财富|財富|收入|薪酬|奖金|獎金|晋升|晉升|事业|事業|健康|婚姻|感情|生育|成绩|成績|录取|錄取|机会|機會|结果|結果)/i,
  /(?:运势|運勢|财运|財運|地气|地氣|龙气|龍氣|加持).{0,24}(?:提升|改善|滋养|滋養|开启|開啟|显现|顯現|实现|實現|带来|帶來|产生|產生)/i,
  /(?:速发财富|速發財富|快速见效|快速見效|固定见效|固定見效|一生运势|一生運勢|积累福荫|積累福廕|发挥效果|發揮效果)/i,
  /(?:具备效力|具備效力|发挥作用|發揮作用|持续加持|持續加持|永久连结|永久連結|源源引导|源源引導|吸取地气|吸取地氣|传导地气|傳導地氣|接收.*地气|接收.*地氣)/i,
  /(?:法力加持|注入法力|沟通.*神明|溝通.*神明|神明.*(?:知悉|接纳|接納)|护佑|護佑|改运效果|改運效果|真实的改运|真實的改運)/i,
  /(?:(?:消灾|消災).{0,20}(?:清走|清除|完成|发挥|發揮|稳固|穩固)|(?:补运|補運).{0,20}(?:注入|补足|補足|发挥|發揮))/i,
  /(?:一年左右显现|一年左右顯現|一年.*见效|一年.*見效|影响多代|影響多代|荫庇后代|蔭庇後代)/i,
  /\b(?:will|guarantees?|guaranteed|ensures?|proven|producing|rapid wealth generation|significant results?)\b.{0,80}\b(?:wealth|career|promotion|health|longevity|marriage|fertility|fortune|success|achievement|income|results?)\b/i,
];

const CONTEXT_PATTERN = /(?:传统|傳統|文化解释|文化解釋|说法|說法|服务方|服務方|从业者|從業者|声称|聲稱|传闻|傳聞|个人反馈|個人回饋|个人经验|個人經驗|风险|風險|不接受|没有|沒有|不是|不适合|不適合|不保证|不保證|不承诺|不承諾|不把|不能|不构成|不構成|不代表|无法|無法|未经|未經|可能|祈愿|祈願|愿望|願望|建议|建議|核实|核實|警惕|拒绝|拒絕|不要|并非|並非|不应|不應|不足以|traditional|cultural|provider|practitioner|claimed|reported|belief|cannot|does not|doesn't|not guarantee|no guarantee|not evidence|no evidence|may|might|should not|do not|avoid|warning)/i;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function inspect(value, filePath, jsonPath, key, findings) {
  if (typeof value === 'string') {
    if (!TEXT_KEYS.has(key)) return;
    const segments = value.split(/(?<=[。！？!?；;])/).map(segment => segment.trim()).filter(Boolean);
    segments.forEach(segment => {
      if (RISK_PATTERNS.some(pattern => pattern.test(segment)) && !CONTEXT_PATTERN.test(segment)) {
        findings.push({ file: filePath, path: jsonPath, text: segment });
      }
    });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, filePath, `${jsonPath}[${index}]`, key, findings));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([childKey, child]) => {
      inspect(child, filePath, `${jsonPath}.${childKey}`, childKey, findings);
    });
  }
}

const findings = [];
ROOTS.flatMap(walk)
  .filter(filePath => filePath.endsWith('.json'))
  .sort()
  .forEach(filePath => {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    inspect(payload, filePath, '$', '', findings);
  });

if (findings.length === 0) {
  console.log('✓ No unqualified outcome claims matched the full-site content check.');
  process.exit(0);
}

findings.forEach(finding => {
  console.log(`${finding.file}\t${finding.path}\t${finding.text}`);
});
console.error(`\nFound ${findings.length} unqualified outcome claim(s).`);
process.exit(1);
