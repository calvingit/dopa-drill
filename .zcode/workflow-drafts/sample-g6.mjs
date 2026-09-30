// 六年级对齐抽样脚本：7 个新增技能 + g6-ratio 的 ext 扩展 + 现有技能回归。
// 用法：node .zcode/workflow-drafts/sample-g6.mjs
// 口径：makeProblem 的 recent 传 new Set()；正则解析 p.text / p.cells 并重算验算。
import { makeRng, makeProblem, signature } from '../../app/js/problems.js';
import { SKILL, SKILLS, DEPTH } from '../../app/js/skills.js';
import { SERIES } from '../../app/js/trophies.js';

const N = 120;
let failures = 0;
const checks = [];
const ok = (cond, msg, count = null) => {
  checks.push(`${cond ? 'PASS' : 'FAIL'}  ${msg}${count == null ? '' : ` (n=${count})`}`);
  if (!cond) failures += 1;
};
const num = (s) => Number(String(s).replace(/,/g, ''));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const reduce = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
const decOf = (s) => (String(s).includes('.') ? String(s).split('.')[1].length : 0);
const isInt = (s) => /^\d+$/.test(s);
const decStr6 = (n, p) => { if (!p) return String(n); const s = String(n).padStart(p + 1, '0'); return `${s.slice(0, -p)}.${s.slice(-p)}`; };
const decMin6 = (n, p) => { let s = decStr6(n, p); while (s.includes('.') && s.endsWith('0')) s = s.slice(0, -1); return s.endsWith('.') ? s.slice(0, -1) : s; };
// 分数答案（可带整数部分）→ [整数, 分子, 分母]；整数答案 → [0, n, 1]。
const parseFracAns = (s) => {
  const m = String(s).match(/^(?:(\d+)又)?(\d+)\/(\d+)$/);
  if (m) return [num(m[1] || 0), num(m[2]), num(m[3])];
  if (isInt(s)) return [0, num(s), 1];
  return null;
};
const draw = (id, seed = 20261001) => {
  const rng = makeRng(seed);
  return Array.from({ length: N }, () => makeProblem(id, rng, new Set()));
};
// 教材形态的可达性：单个具体算式在签名全空间里占比很小，用大样本查。
const reachable = (id, targets, seed = 900, times = 120000) => {
  const seen = new Set();
  const rng = makeRng(seed);
  for (let i = 0; i < times; i += 1) seen.add(makeProblem(id, rng, new Set()).text);
  return targets.filter((t) => !seen.has(t));
};
// 「＝」两侧的给定格：左边是题目各项，右边是显示出来的那一边。
const eqSplit = (p) => {
  const eq = p.cells.find((c) => c.kind === 'op' && c.text === '＝');
  const left = p.cells.filter((c) => c.kind === 'given' && c.c < eq.c).sort((a, b) => a.c - b.c);
  const right = p.cells.filter((c) => c.kind === 'given' && c.c > eq.c).sort((a, b) => a.c - b.c);
  return { left, right };
};
const hasPct = (p) => p.cells.some((c) => c.kind === 'op' && c.text === '%');

// ---------------------------------------------------------------- g6-frac-chain 分数混合运算
{
  const ps = draw('g6-frac-chain');
  const forms = [0, 0, 0, 0, 0];
  let good = true; let maxCols = 0; let maxD = 0; let maxInt = 0;
  for (const p of ps) {
    maxCols = Math.max(maxCols, p.cols);
    if (p.cols > 16) good = false;
    const a = parseFracAns(p.answer);
    if (!a || a[2] === 0) { good = false; continue; }
    const val = (a[0] * a[2] + a[1]) / a[2];
    if (!(val > 0) || (a[2] === 1 ? a[1] > 999 : gcd(a[1], a[2]) !== 1 || a[1] > 99 || a[2] > 99)) good = false; // 结果为正：整数 ≤999，分数/带分数最简且 ≤99
    let m; let want; let f;
    if ((m = p.text.match(/^(\d+) × (\d+)\/(\d+) × (\d+)\/(\d+)$/))) { // ① 整数×分数×分数
      forms[0] += 1; f = m;
      want = num(f[1]) * (num(f[2]) / num(f[3])) * (num(f[4]) / num(f[5]));
      maxInt = Math.max(maxInt, num(f[1]));
      maxD = Math.max(maxD, num(f[3]), num(f[5]));
      if (num(f[2]) >= num(f[3]) || num(f[4]) >= num(f[5])) good = false;
    } else if ((m = p.text.match(/^(\d+) ÷ (\d+)\/(\d+) ÷ (\d+)\/(\d+)$/))) { // ②a 整数÷分数÷分数
      forms[1] += 1; f = m;
      want = num(f[1]) / (num(f[2]) / num(f[3])) / (num(f[4]) / num(f[5]));
      maxInt = Math.max(maxInt, num(f[1]));
      maxD = Math.max(maxD, num(f[3]), num(f[5]));
    } else if ((m = p.text.match(/^(\d+)\/(\d+) ÷ (\d+)\/(\d+) × (\d+)\/(\d+)$/))) { // ②b 分数÷分数×分数
      forms[1] += 1; f = m;
      want = (num(f[1]) / num(f[2])) / (num(f[3]) / num(f[4])) * (num(f[5]) / num(f[6]));
      maxD = Math.max(maxD, num(f[2]), num(f[4]), num(f[6]));
    } else if ((m = p.text.match(/^(\d+)\/(\d+) × \((\d+)\/(\d+) ÷ (\d+)\/(\d+)\)$/))) { // ③a 分数×(分数÷分数)
      forms[2] += 1; f = m;
      want = (num(f[1]) / num(f[2])) * ((num(f[3]) / num(f[4])) / (num(f[5]) / num(f[6])));
      maxD = Math.max(maxD, num(f[2]), num(f[4]), num(f[6]));
    } else if ((m = p.text.match(/^(\d+) ÷ \((\d+)\/(\d+) × (\d+)\/(\d+)\)$/))) { // ③b 整数÷(分数×分数)
      forms[2] += 1; f = m;
      want = num(f[1]) / ((num(f[2]) / num(f[3])) * (num(f[4]) / num(f[5])));
      maxInt = Math.max(maxInt, num(f[1]));
      maxD = Math.max(maxD, num(f[3]), num(f[5]));
    } else if ((m = p.text.match(/^(\d+) × \(1([＋−])(\d+)\/(\d+)\)$/))) { // ④ 整数×(1±分数)
      forms[3] += 1; f = m;
      want = num(f[1]) * (m[2] === '＋' ? 1 + num(f[3]) / num(f[4]) : 1 - num(f[3]) / num(f[4]));
      maxInt = Math.max(maxInt, num(f[1]));
      maxD = Math.max(maxD, num(f[4]));
      if (!isInt(p.answer)) good = false; // 该形态结果恒为整数
      if (num(f[3]) >= num(f[4])) good = false;
    } else if ((m = p.text.match(/^\((\d+)\/(\d+) ＋ (\d+)\/(\d+)\) × (\d+)$/))) { // ⑤a (分数＋分数)×整数
      forms[4] += 1; f = m;
      want = (num(f[1]) / num(f[2]) + num(f[3]) / num(f[4])) * num(f[5]);
      maxInt = Math.max(maxInt, num(f[5]));
      maxD = Math.max(maxD, num(f[2]), num(f[4]));
      if (!isInt(p.answer)) good = false;
    } else if ((m = p.text.match(/^(\d+)\/(\d+) × (\d+) ＋ (\d+)\/(\d+) × (\d+)$/))) { // ⑤b 分数×整数＋分数×整数
      forms[4] += 1; f = m;
      want = (num(f[1]) / num(f[2])) * num(f[3]) + (num(f[4]) / num(f[5])) * num(f[6]);
      maxInt = Math.max(maxInt, num(f[3]), num(f[6]));
      maxD = Math.max(maxD, num(f[2]), num(f[5]));
      if (!isInt(p.answer)) good = false;
      if (num(f[2]) !== num(f[5]) || num(f[1]) + num(f[4]) !== num(f[2])) good = false; // 两个分数凑成 1
    } else { good = false; continue; }
    if (!near(val, want, 1e-9)) good = false;
  }
  ok(good, 'g6-frac-chain 每题逐步重算成立、结果为正的最简分数/带分数/整数（≤99）、≤16 列', maxCols);
  ok(maxD <= 21, 'g6-frac-chain 分数分子分母 ≤21', maxD);
  ok(maxInt <= 140, 'g6-frac-chain 整数项 ≤140', maxInt);
  forms.forEach((n, i) => ok(n >= 10, `g6-frac-chain 形态${['①整数×分数×分数', '②÷链', '③括号', '④1±分数', '⑤分配律'][i]} ≥10`, n));
}

// ---------------------------------------------------------------- g6-eq-frac 分数与百分数方程
{
  const ps = draw('g6-eq-frac');
  const forms = [0, 0, 0, 0, 0, 0, 0];
  let good = true; let maxX = 0;
  for (const p of ps) {
    const x = num(p.answer);
    maxX = Math.max(maxX, x);
    if (!isInt(p.answer) || x <= 0 || x > 9990) { good = false; continue; }
    let m; let lhs; let rhs;
    if ((m = p.text.match(/^x−(\d+)\/(\d+)x＝(\d+)$/))) { // ① x−(a/b)x＝C
      forms[0] += 1;
      lhs = x * (1 - num(m[1]) / num(m[2])); rhs = num(m[3]);
      if (num(m[2]) > 9 || num(m[1]) >= num(m[2]) || gcd(num(m[1]), num(m[2])) !== 1) good = false;
    } else if ((m = p.text.match(/^(\d+)\/(\d+)x＋(\d+)\/(\d+)x＝(\d+)$/))) { // ② (a/b)x＋(c/d)x＝C
      forms[1] += 1;
      lhs = x * (num(m[1]) / num(m[2]) + num(m[3]) / num(m[4])); rhs = num(m[5]);
      if (num(m[2]) > 9 || num(m[4]) > 9) good = false;
    } else if ((m = p.text.match(/^(\d+)＋(\d+)\/(\d+)x＝(\d+)$/))) { // ③ a＋(b/c)x＝C
      forms[2] += 1;
      lhs = num(m[1]) + x * (num(m[2]) / num(m[3])); rhs = num(m[4]);
      if (num(m[3]) > 9 || num(m[2]) >= num(m[3])) good = false;
    } else if ((m = p.text.match(/^(\d+)%x＝(\d+)$/))) { // ④ p%x＝C
      forms[3] += 1;
      lhs = x * (num(m[1]) / 100); rhs = num(m[2]);
    } else if ((m = p.text.match(/^x([＋−])([\d.]+)%x＝(\d+)$/))) { // ⑤ x±p%x＝C（含 12.5%）
      forms[4] += 1;
      const [nn, dd] = reduce(Math.round(num(m[2]) * 1000), 100000); // p% = nn/dd
      lhs = x * (m[1] === '＋' ? 1 + nn / dd : 1 - nn / dd); rhs = num(m[3]);
      if (num(m[2]) > 100) good = false;
    } else if ((m = p.text.match(/^(\d+)%x−(\d+)%x＝(\d+)$/))) { // ⑥ p%x−q%x＝C
      forms[5] += 1;
      lhs = x * ((num(m[1]) - num(m[2])) / 100); rhs = num(m[3]);
      if (num(m[1]) <= num(m[2])) good = false;
    } else if ((m = p.text.match(/^x−0\.(\d)x＝(\d+)$/))) { // ⑦ x−0.8x 型
      forms[6] += 1;
      lhs = x * ((10 - num(m[1])) / 10); rhs = num(m[2]);
      if (num(m[1]) < 2 || num(m[1]) > 9) good = false;
    } else { good = false; continue; }
    if (!near(lhs, rhs, 1e-9)) good = false; // 代入方程成立
  }
  ok(good, 'g6-eq-frac x 为正整数（≤9990）且代入方程成立', maxX);
  forms.forEach((n, i) => ok(n >= 5, `g6-eq-frac 形态${['①分数系数减', '②分数系数和', '③分数系数加', '④p%x', '⑤x±p%x', '⑥p%x−q%x', '⑦小数系数'][i]} ≥5`, n));
  const miss = reachable('g6-eq-frac', ['x−1/7x＝12', '60%x＝30', 'x＋12.5%x＝18', 'x−0.8x＝22'], 902);
  ok(miss.length === 0, `g6-eq-frac 教材形态均可出现${miss.length ? `（缺 ${miss.join('、')}）` : ''}`);
}

// ---------------------------------------------------------------- g6-pct-conv 百分数互化
{
  const ps = draw('g6-pct-conv');
  const dirs = { dec: 0, frac: 0, toDec: 0, toFrac: 0 };
  let good = true; let rounded = 0;
  for (const p of ps) {
    if (String(p.answer).includes('/')) { // ④ 百分数 → 分数
      dirs.toFrac += 1;
      const m = p.text.match(/^([\d.]+)%$/); if (!m) { good = false; continue; }
      const am = String(p.answer).match(/^(\d+)\/(\d+)$/); if (!am) { good = false; continue; }
      const v = Math.round(num(m[1]) * 10);
      if (!near(num(m[1]) / 100, num(am[1]) / num(am[2]), 1e-9)) good = false;
      if (gcd(num(am[1]), num(am[2])) !== 1 || num(am[1]) > 20 || num(am[2]) > 20) good = false;
      if (v % 10 === 0 ? decOf(m[1]) !== 0 : decOf(m[1]) !== 1) good = false;
    } else if (p.text.endsWith('%')) { // ③ 百分数 → 小数
      dirs.toDec += 1;
      const k = num(p.text.slice(0, -1));
      if (!near(num(p.answer), k / 100, 1e-9)) good = false; // 精确
      if (k < 1 || k > 999) good = false;
    } else if (p.text.includes('/')) { // ② 分数 → 百分数
      dirs.frac += 1;
      const m = p.text.match(/^(\d+)\/(\d+)$/); if (!m) { good = false; continue; }
      const n = num(m[1]); const d = num(m[2]);
      const eq = p.cells.find((c) => c.kind === 'op' && (c.text === '≈' || c.text === '＝'));
      if (!eq) { good = false; continue; }
      const t = (n * 1000) / d;
      if (eq.text === '＝') {
        if (!Number.isInteger(t)) good = false;
        if (p.answer !== decMin6(t, 1)) good = false;
      } else {
        rounded += 1;
        if (Number.isInteger(t)) good = false;
        if (p.answer !== decStr6(Math.round(t), 1) || decOf(p.answer) !== 1) good = false;
      }
      if (!near(num(p.answer), (n * 100) / d, 0.05 + 1e-9)) good = false; // 误差 ≤0.05（四舍五入）
      if (d < 2 || d > 20 || n >= d || gcd(n, d) !== 1) good = false;
      if (!hasPct(p)) good = false;
    } else { // ① 小数 → 百分数
      dirs.dec += 1;
      const v = num(p.text);
      const k = Math.round(v * 100);
      if (p.answer !== String(k) || p.text !== decMin6(k, 2)) good = false;
      if (k < 1 || k > 999) good = false;
      if (!hasPct(p)) good = false;
    }
  }
  ok(good, 'g6-pct-conv 四方向换算精确（除不尽恰一位小数、误差<0.05）、分数最简 ≤20、% 由 op 显示', rounded);
  ok(dirs.dec >= 20, 'g6-pct-conv 小数→百分数 ≥20', dirs.dec);
  ok(dirs.frac >= 20, 'g6-pct-conv 分数→百分数 ≥20', dirs.frac);
  ok(dirs.toDec >= 20, 'g6-pct-conv 百分数→小数 ≥20', dirs.toDec);
  ok(dirs.toFrac >= 20, 'g6-pct-conv 百分数→分数 ≥20', dirs.toFrac);
  ok(rounded >= 1, 'g6-pct-conv 除不尽保留一位小数（≈）形态出现（1/6→16.7 类）', rounded);
  const miss = reachable('g6-pct-conv', ['0.24', '3/4', '37%', '62.5%'], 903);
  ok(miss.length === 0, `g6-pct-conv 教材形态均可出现${miss.length ? `（缺 ${miss.join('、')}）` : ''}`);
}

// ---------------------------------------------------------------- g6-pct-rate 求百分率
{
  const ps = draw('g6-pct-rate');
  const forms = { plain: 0, subLt: 0, subGt: 0, whole: 0, subBig3: 0 };
  let good = true; let exact = 0; let approx = 0; let maxPct = 0;
  for (const p of ps) {
    if (!hasPct(p)) { good = false; continue; }
    let m; let a; let b; let ans;
    if ((m = p.text.match(/^(\d+)÷(\d+)$/))) { // ① a÷b＝( )%
      forms.plain += 1; a = num(m[1]); b = num(m[2]); ans = p.answer;
      if (a > 2 * b || a === b || b > 200 || a > 999) good = false;
    } else if ((m = p.text.match(/^\((\d+)−(\d+)\)÷(\d+)$/))) { // ② 两步减法，两个方向
      const total = num(m[1]); const part = num(m[2]); const div = num(m[3]);
      a = total - part; b = div; ans = p.answer;
      if (div === total) { forms.subLt += 1; } // 少方向：总量作分母（(24−18)÷24、(400−40)÷400 结构）
      else if (div === part && total > div) { forms.subGt += 1; } // 多方向：较小数作分母、被减数＞除数（(50−45)÷45 书87）
      else { good = false; continue; }
      if (part < 1 || part >= total) good = false;
      if (div === total && total >= 100) forms.subBig3 += 1; // 三位数总量的少方向
    } else if ((m = p.text.match(/^(\d+) ÷ (\d+)%$/))) { // ③ a÷p%＝( )
      forms.whole += 1;
      const R = num(p.answer); const pp = num(m[2]);
      if (!isInt(p.answer) || !near(num(m[1]) / (pp / 100), R, 1e-9)) good = false; // 精确
      if (R > 2000 || num(m[1]) > 999) good = false;
      continue;
    } else { good = false; continue; }
    const u = (a * 1000) / b; // 百分率×10
    maxPct = Math.max(maxPct, u / 10);
    if (Number.isInteger(u)) {
      exact += 1;
      if (ans !== decMin6(u, 1)) good = false;
    } else {
      approx += 1;
      const v = Math.round(u);
      if (ans !== decStr6(v, 1) || decOf(ans) !== 1) good = false; // 恰一位小数
    }
    if (!near(num(ans), (a * 100) / b, 0.05 + 1e-9) || num(ans) > 200 || num(ans) <= 0) good = false; // 四舍五入到一位小数，偏差 ≤0.05
    if (b < 2 || b > 500 || a < 1) good = false;
  }
  ok(good, 'g6-pct-rate 答案与商×100 一致（精确或恰一位小数）、百分率 ≤200%、% 由 op 显示', maxPct);
  ok(forms.plain >= 20, 'g6-pct-rate 形态① a÷b＝( )% ≥20', forms.plain);
  ok(forms.subLt >= 10, 'g6-pct-rate 形态②少方向 (a−b)÷a 总量作分母 ≥10', forms.subLt);
  ok(forms.subGt >= 10, 'g6-pct-rate 形态②多方向 (a−b)÷b 较小数作分母、被减数＞除数 ≥10（书87）', forms.subGt);
  ok(forms.whole >= 20, 'g6-pct-rate 形态③ a÷p%＝( ) 求总量 ≥20', forms.whole);
  ok(forms.subBig3 >= 1, 'g6-pct-rate 三位数总量的少方向出现（(400−40)÷400＝90% 结构，(400−10)÷400＝97.5 因 18 列版式不出）', forms.subBig3);
  ok(exact >= 1, 'g6-pct-rate 整数百分率形态出现（43÷50=86 类）', exact);
  ok(approx >= 1, 'g6-pct-rate 除不尽一位小数形态出现（52÷60≈86.7 类）', approx);
  const miss = reachable('g6-pct-rate', ['(50−45)÷45', '500 ÷ 40%'], 904, 300000);
  ok(miss.length === 0, `g6-pct-rate 教材形态均可出现${miss.length ? `（缺 ${miss.join('、')}）` : ''}`);
}

// ---------------------------------------------------------------- g6-ratio 相等的比（ext 扩展回归）
{
  const ps = draw('g6-ratio');
  const forms = { int: 0, dec: 0, frac: 0 };
  let good = true; let maxAns = 0;
  for (const p of ps) {
    maxAns = Math.max(maxAns, num(p.answer));
    const { left, right } = eqSplit(p);
    const hasFracTok = left.some((c) => c.cls === 'frac-n');
    const S = num(right[0].text);
    if (hasFracTok) { // 分数比：左边含分数项，化简成最简整数比
      forms.frac += 1;
      if (!/^\d$/.test(p.answer)) { good = false; continue; } // 答案格只填一个数字
      const parts = p.text.split(':').map((s) => (s.includes('/') ? s.split('/').map(num) : [num(s), 1]));
      if (parts.length !== 2) { good = false; continue; }
      const [xn, yn] = parts[0][1] === 1
        ? reduce(parts[0][0] * parts[1][1], parts[1][0]) // A : n/d → A·d : n
        : parts[1][1] === 1
          ? reduce(parts[0][0], parts[0][1] * parts[1][0]) // n/d : A → n : A·d
          : reduce(parts[0][0] * parts[1][1], parts[0][1] * parts[1][0]); // n1/d1 : n2/d2
      if (xn > 9 || yn > 9 || xn === yn) good = false;
      if (!((num(p.answer) === xn && S === yn) || (num(p.answer) === yn && S === xn))) good = false;
    } else if (left.some((c) => String(c.text).includes('.'))) { // 小数比：两项同乘 t/100
      forms.dec += 1;
      if (!/^\d$/.test(p.answer)) { good = false; continue; } // 答案格只填一个数字
      if (left.length !== 2 || right.length !== 1) { good = false; continue; }
      const L = left.map((c) => Math.round(num(c.text) * 100));
      const [xn, yn] = reduce(L[0], L[1]);
      if (!((num(p.answer) === xn && S === yn) || (num(p.answer) === yn && S === xn))) good = false;
      if (L[0] % 100 === 0 && L[1] % 100 === 0) good = false; // 至少一项是小数
    } else { // 整数比（原形态，答案可为两位数 x·k ≤ 81）
      forms.int += 1;
      if (left.length !== 2 || right.length !== 1) { good = false; continue; }
      const x = num(left[0].text); const y = num(left[1].text);
      if (x > 9 || y > 9 || x === y || gcd(x, y) !== 1) good = false;
      if (num(p.answer) < 2 || num(p.answer) > 81) good = false;
      // 答案＝空出边另一项÷k（k 2–9）：answer·y === S·x 或 answer·x === S·y
      const hit = (num(p.answer) * y === S * x && S / y >= 2) || (num(p.answer) * x === S * y && S / x >= 2);
      if (!hit) good = false;
    }
  }
  ok(good, 'g6-ratio 三形态化简恒等、答案为单个数字、整数比 k 2–9', maxAns);
  ok(forms.int >= 15, 'g6-ratio 整数比形态 ≥15', forms.int);
  ok(forms.dec >= 15, 'g6-ratio 小数比形态 ≥15（0.7:0.8＝7:( ) 类）', forms.dec);
  ok(forms.frac >= 15, 'g6-ratio 分数比形态 ≥15（2/5:1/4＝8:( )、1:3/4＝( ):3 类）', forms.frac);
  const miss = reachable('g6-ratio', ['7:8', '8:5', '4:3'], 905, 60000);
  ok(miss.length === 0, `g6-ratio 扩展形态的最简比均可出现${miss.length ? `（缺 ${miss.join('、')}）` : ''}`);
}

// ---------------------------------------------------------------- g6-ratio-quo 求比值
{
  const ps = draw('g6-ratio-quo');
  const kinds = { int: 0, dec: 0, frac: 0 };
  let good = true;
  for (const p of ps) {
    const m = p.text.match(/^(\d+):(\d+)$/); if (!m) { good = false; continue; }
    const a = num(m[1]); const b = num(m[2]);
    if (a < 1 || a > 99 || b < 1 || b > 99 || a === b) good = false;
    if (isInt(p.answer)) { // 整除 → 整数
      kinds.int += 1;
      if (a % b !== 0 || num(p.answer) !== a / b) good = false;
    } else if (String(p.answer).includes('/')) { // 其余 → 最简分数（含循环商，不重抽）
      kinds.frac += 1;
      const am = p.answer.match(/^(\d+)\/(\d+)$/); if (!am) { good = false; continue; }
      if (gcd(num(am[1]), num(am[2])) !== 1 || !near(num(am[1]) / num(am[2]), a / b, 1e-9)) good = false;
      if (a % b === 0) good = false;
    } else { // 一位有限小数
      kinds.dec += 1;
      if (decOf(p.answer) !== 1 || !near(num(p.answer), a / b, 1e-9)) good = false;
      if ((a * 10) % b !== 0) good = false;
    }
  }
  ok(good, 'g6-ratio-quo a、b 1–99 且不同，整数/一位小数/最简分数与商一致、无循环小数写法');
  ok(kinds.int >= 30 && kinds.int <= 66, 'g6-ratio-quo 整除形态约四成（40%±15pp）', kinds.int);
  ok(kinds.dec >= 18 && kinds.dec <= 54, 'g6-ratio-quo 一位小数形态约三成（30%±15pp）', kinds.dec);
  ok(kinds.frac >= 18 && kinds.frac <= 54, 'g6-ratio-quo 最简分数形态约三成（30%±15pp）', kinds.frac);
  const miss = reachable('g6-ratio-quo', ['40:2', '6:4', '2:3'], 906, 200000);
  ok(miss.length === 0, `g6-ratio-quo 教材形态均可出现${miss.length ? `（缺 ${miss.join('、')}）` : ''}`);
}

// ---------------------------------------------------------------- g6-ratio-solve 解比例
{
  const ps = draw('g6-ratio-solve');
  const forms = [0, 0, 0];
  let good = true; let decTerms = 0;
  for (const p of ps) {
    const x = num(p.answer);
    if (!(isInt(p.answer) || decOf(p.answer) === 1) || x < 1 || x > 999) { good = false; continue; }
    const xt = Math.round(x * 10);
    let m;
    if ((m = p.text.match(/^(\d+):(\d+)＝([\d.]+):x$/))) { // a:b＝c:x → a·x = b·c
      forms[0] += 1;
      if (num(m[1]) * xt !== num(m[2]) * Math.round(num(m[3]) * 10)) good = false;
    } else if ((m = p.text.match(/^(\d+):(\d+)＝x:([\d.]+)$/))) { // a:b＝x:c → a·c = b·x
      forms[1] += 1;
      if (num(m[1]) * Math.round(num(m[3]) * 10) !== num(m[2]) * xt) good = false;
    } else if ((m = p.text.match(/^(\d+):x＝(\d+):([\d.]+)$/))) { // a:x＝b:c → a·c = b·x
      forms[2] += 1;
      if (num(m[1]) * Math.round(num(m[3]) * 10) !== num(m[2]) * xt) good = false;
    } else { good = false; continue; }
    if (/x[:＝]/.test(p.text.replace(/^[^＝]*/, (s) => s.replace(/x[:＝]/g, ''))) || /\d\.\d/.test(p.answer) || /\d\.\d/.test(p.text.split('＝')[1] || '')) decTerms += 1;
  }
  ok(good, 'g6-ratio-solve 内项积＝外项积重算成立、答案为正整数或一位小数（≤999）');
  forms.forEach((n, i) => ok(n >= 5, `g6-ratio-solve 形态${['a:b＝c:x', 'a:b＝x:c', 'a:x＝b:c'][i]} ≥5`, n));
  ok(decTerms >= 1, 'g6-ratio-solve 含一位小数项的形态出现（4:9＝x:3.6 类）', decTerms);
}

// ---------------------------------------------------------------- g6-pct-more 多（少）百分之几的数
{
  const ps = draw('g6-pct-more');
  const signs = { plus: 0, minus: 0 };
  let good = true; let minA = Infinity; let maxA = 0; let maxAns = 0;
  for (const p of ps) {
    const m = p.text.match(/^(\d+) × \(1([＋−])(\d+)%\)$/); if (!m) { good = false; continue; }
    const a = num(m[1]); const pcent = num(m[3]);
    const want = (a * (100 + (m[2] === '＋' ? pcent : -pcent))) / 100;
    minA = Math.min(minA, a); maxA = Math.max(maxA, a); maxAns = Math.max(maxAns, want);
    if (!isInt(p.answer) || num(p.answer) !== want) good = false;
    if (a < 10 || a > 1000 || want < 1 || want > 2000) good = false;
    if (pcent < 1 || pcent > 99) good = false;
    if (m[2] === '＋') signs.plus += 1; else signs.minus += 1;
  }
  ok(good, 'g6-pct-more 答案＝a×(1±p%) 为正整数 ≤2000、a 10–1000', maxAns);
  ok(minA >= 10 && maxA <= 1000, 'g6-pct-more a 的范围 10–1000（含 1000 试一试例题）', `${minA}–${maxA}`);
  ok(signs.plus >= 20 && signs.minus >= 20, 'g6-pct-more 加减两形态都出现', `${signs.plus}/${signs.minus}`);
  const miss = reachable('g6-pct-more', ['180 × (1＋50%)', '1000 × (1−10%)'], 908);
  ok(miss.length === 0, `g6-pct-more 教材形态均可出现${miss.length ? `（缺 ${miss.join('、')}）` : ''}`);
}

// ---------------------------------------------------------------- 回归：现有 3 个六年级技能
{
  let good = true;
  for (const p of draw('g6-frac-dec', 701)) {
    const m = p.text.match(/^([\d.]+) × (\d+)\/(\d+)$/); if (!m) { good = false; continue; }
    const t = num(m[1]) * 10;
    if (![2, 4, 5, 6, 8].includes(t)) good = false; // 0.2、0.4、0.5、0.6、0.8
    const n = num(m[2]); const d = num(m[3]);
    if (d < 2 || d > 9 || n >= d || gcd(n, d) !== 1) good = false;
    const am = String(p.answer).match(/^(\d+)\/(\d+)$/);
    if (!am || gcd(num(am[1]), num(am[2])) !== 1 || num(am[1]) > 99 || num(am[2]) > 99) good = false;
    if (!near(num(am[1]) / num(am[2]), num(m[1]) * n / d, 1e-9)) good = false;
  }
  ok(good, 'g6-frac-dec 小数∈{0.2,0.4,0.5,0.6,0.8}、分母 2–9、约分后 ≤99');
  const bases = [20, 40, 50, 60, 80, 100, 200, 300, 400, 500];
  const pcts = [5, 10, 20, 25, 30, 40, 50, 60, 75];
  let pgood = true;
  for (const p of draw('g5-percent', 702)) {
    const m = p.text.match(/^(\d+)的(\d+)%$/); if (!m) { pgood = false; continue; }
    if (!bases.includes(num(m[1])) || !pcts.includes(num(m[2]))) pgood = false;
    if (!isInt(p.answer) || num(p.answer) !== (num(m[1]) * num(m[2])) / 100) pgood = false;
  }
  ok(pgood, 'g5-percent base/p 属既定集合且结果为正整数');
  let lgood = true; let minX = Infinity;
  for (const p of draw('g6-letter', 703)) {
    let m;
    if ((m = p.text.match(/^x×(\d+)＝(\d+)$/))) {
      if (!isInt(p.answer) || num(p.answer) * num(m[1]) !== num(m[2])) lgood = false;
    } else if ((m = p.text.match(/^x＋(\d+)＝(\d+)$/))) {
      if (num(m[1]) % 3 !== 0 || num(m[1]) < 6 || num(m[1]) > 27) lgood = false; // 加数恰为 3 的倍数 6–27
      if (!isInt(p.answer) || num(p.answer) + num(m[1]) !== num(m[2])) lgood = false;
    } else if ((m = p.text.match(/^x−(\d+)＝(\d+)$/))) {
      if (!isInt(p.answer) || num(p.answer) !== num(m[1]) + num(m[2])) lgood = false;
      minX = Math.min(minX, num(m[2]));
    } else { lgood = false; continue; }
  }
  ok(lgood && minX >= 2, 'g6-letter 三种一步形态：加数∈{6,9,…,27}、x∈2–12', minX);
}

// ---------------------------------------------------------------- 防重复（need=15）与结构
{
  const g6 = SKILLS.filter((s) => s.grade === 6);
  ok(g6.length === 11, '6 年级技能数 11', g6.length);
  for (const s of g6) {
    const rng = makeRng(99);
    const recent = new Set();
    let firstRepeat = Infinity;
    for (let i = 0; i < 15; i += 1) {
      const p = makeProblem(s.id, rng, recent);
      if (recent.has(signature(p)) && firstRepeat === Infinity) firstRepeat = i;
      recent.add(signature(p));
    }
    ok(firstRepeat >= 15, `${s.id} 15 题内不重复（firstRepeat=${firstRepeat}）`);
  }
  ok(SKILLS.length === 92, '技能总数 92', SKILLS.length);
  const per = [1, 2, 3, 4, 5, 6].map((g) => SKILLS.filter((s) => s.grade === g).length);
  ok(per.join('/') === '12/13/21/18/17/11', '分年级技能数 12/13/21/18/17/11', per.join('/'));
  const lanes = [2, 3].map((l) => g6.filter((s) => s.lane === l).length);
  ok(lanes.join('/') === '2/9', '6 年级 lane 分布 小数与分数 2、其他 9', lanes.join('/'));
  let req = true;
  for (const s of SKILLS) for (const r of s.req) if (!SKILL[r] || SKILL[r].grade > s.grade) req = false;
  ok(req, '全部技能的 id 唯一、前置存在且不来自更晚的年级');
  ok(Number.isFinite(DEPTH['g6-ratio-solve']) && DEPTH['g6-ratio-solve'] > DEPTH['g6-ratio'], 'g6-ratio-solve 在 g6-ratio 之后（无环）');
  // trophies 四阶梯顶格值
  const top = (key) => SERIES.find((s) => s.key === key).items.at(-1).need;
  ok(top('unlocked') === 92 && top('mastered') === 92 && top('star5') === 92 && top('starsTotal') === 460, 'trophies 四阶梯 92/92/92/460', `${top('unlocked')}/${top('mastered')}/${top('star5')}/${top('starsTotal')}`);
}

// ---------------------------------------------------------------- 未改动生成器的回归：hadd 交换 / tensToo、hsub 破十、carry:'yes'、竖式参数
function carries(a, b) {
  let c = 0; let n = 0;
  while (a > 0 || b > 0) { const s = (a % 10) + (b % 10) + c; c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); }
  return n;
}
function borrows(a, b) {
  let br = 0; let n = 0;
  while (a > 0) { const t = (a % 10) - br - (b % 10); br = t < 0 ? 1 : 0; n += br; a = Math.floor(a / 10); b = Math.floor(b / 10); }
  return n;
}
{
  const binop = (p) => p.text.match(/^([\d.]+) ([+−×÷]) ([\d.]+)$/);
  let good = true; let tensToo = 0;
  for (const p of draw('g1-add-2d1', 555)) {
    const m = binop(p); if (!m || m[2] !== '+') { good = false; continue; }
    const a = num(m[1]); const b = num(m[3]);
    if (!near(a + b, num(p.answer), 1e-9)) good = false;
    if (carries(a, b) !== 0) good = false;                   // carry: none
    if (a % 10 === 0 && b % 10 === 0) tensToo += 1;          // tensToo 整十形态（两边均可为两位数）
    else if (b < 1 || b > 9) good = false;
  }
  ok(good && tensToo >= 1, 'g1-add-2d1 验算成立、carry:none、tensToo 的整十形态出现', tensToo);
  const low = draw('g1-add-2d2', 557).filter((p) => { const m = p.text.match(/^(\d+) \+ (\d+)$/); return m && num(m[1]) < num(m[2]); }).length;
  ok(low > 0 && low < N, 'hadd 交换两个加数：两个显示顺序都出现', `${low}/${N}`);
  let cy = 0;
  for (const p of draw('g1-add-c', 558)) { const m = binop(p); if (m && carries(num(m[1]), num(m[3])) > 0) cy += 1; }
  ok(cy === N, "carry:'yes' 每题都进位", cy);
  let brGood = true; let po = 0;
  for (const p of draw('g1-sub-b', 560)) {
    const m = p.text.match(/^(\d+) − (\d+)$/); if (!m) { brGood = false; continue; }
    const a = num(m[1]); const b = num(m[2]);
    if (borrows(a, b) < 1) brGood = false;                    // borrow: yes
    if (b <= 9) { if (p.help !== `10 − ${b} ＝ ${10 - b}`) brGood = false; po += 1; } // 破十只对 y≤9
    else if (!p.help.startsWith('10 −')) brGood = false;
  }
  ok(brGood, 'hsub 破十法提示只对一位数减数成立（y≤9）', po);
  let vGood = true; let some = 0;
  for (const p of draw('g3-vadd3', 564)) {
    if (p.kind !== 'add' || p.a < 100 || p.a > 999 || p.b < 100 || p.b > 999) vGood = false;
    if (carries(p.a, p.b) > 0) some += 1;                     // carry: some
  }
  for (const p of draw('g3-vsub3', 565)) {
    if (p.kind !== 'sub' || p.a < 100 || p.a > 999 || p.b < 10 || p.b > 999) vGood = false;
    if (borrows(p.a, p.b) < 1) vGood = false;                 // borrow: some
  }
  for (const p of draw('g4-vdiv-3d2', 568)) {
    if (p.kind !== 'div' || p.a < 100 || p.a > 999 || p.b < 11 || p.b > 90) vGood = false;
    if (p.a < 2 * p.b) vGood = false;                         // 除数上界 dsMax=90
  }
  ok(vGood && some === N, '竖式参数：vadd/vsub 的位数与进退位、vdiv 的除数上界 dsMax=90', some);
}

// ---------------------------------------------------------------- 汇总
console.log(checks.join('\n'));
console.log(`\n${checks.filter((c) => c.startsWith('PASS')).length} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
