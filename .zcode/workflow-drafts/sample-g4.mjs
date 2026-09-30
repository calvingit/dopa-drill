// 四年级对齐抽样脚本：8 个新增技能 + 5 处参数扩宽，每技能 120 题。
// 用法：node .zcode/workflow-drafts/sample-g4.mjs
// 口径：makeProblem 的 recent 传 new Set()；正则解析 p.text 并重算验算。
import { makeRng, makeProblem } from '../../app/js/problems.js';
import { SKILL } from '../../app/js/skills.js';

const N = 120;
let failures = 0;
const checks = [];
const ok = (cond, msg, count = null) => {
  checks.push(`${cond ? 'PASS' : 'FAIL'}  ${msg}${count == null ? '' : ` (n=${count})`}`);
  if (!cond) failures += 1;
};
const evalArith = (t) => {
  const js = t.replace(/＋/g, '+').replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/\[/g, '(').replace(/\]/g, ')');
  try { return Function(`"use strict";return (${js})`)(); } catch { return NaN; }
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

const draw = (id) => {
  const rng = makeRng(20260930);
  return Array.from({ length: N }, () => makeProblem(id, rng, new Set()));
};

// ---------------------------------------------------------------- g4-eq-1 解方程（一步）
{
  const ps = draw('g4-eq-1');
  const cls = { add: 0, sub: 0, axb: 0, dxa: 0, cox: 0, dec: 0 };
  let good = true;
  for (const p of ps) {
    const x = Number(p.answer);
    let m;
    if ((m = p.text.match(/^x＋(\d+)＝(\d+)$/))) { cls.add += 1; good &&= near(Number(m[1]) + x, Number(m[2])) && x >= 1; }
    else if ((m = p.text.match(/^x−(\d+)＝(\d+)$/))) { cls.sub += 1; good &&= near(x - Number(m[1]), Number(m[2])) && x >= 1; }
    else if ((m = p.text.match(/^(\d+)＋x＝(\d+)$/))) { cls.cox += 1; good &&= near(Number(m[1]) + x, Number(m[2])) && x >= 1; }
    else if ((m = p.text.match(/^x×(\d+)＝(\d+)$/))) { cls.axb += 1; good &&= near(x * Number(m[1]), Number(m[2])) && x >= 1; }
    else if ((m = p.text.match(/^x÷(\d+)＝(\d+)$/))) { cls.dxa += 1; good &&= near(x / Number(m[1]), Number(m[2])) && x >= 1; }
    else if ((m = p.text.match(/^x([＋−])(\d+\.\d)＝(\d+\.\d)$/))) {
      cls.dec += 1;
      good &&= near(m[1] === '−' ? x - Number(m[2]) : x + Number(m[2]), Number(m[3]), 1e-9) && /^\d+\.\d$/.test(p.answer) && x > 0;
    } else good = false;
  }
  ok(good, 'g4-eq-1 每题代回恒等、解为正；小数形态答案一位小数');
  for (const [k, msg] of [['add', 'x＋a＝b'], ['sub', 'x−a＝b'], ['cox', 'a＋x＝b'], ['axb', 'x×a＝b'], ['dxa', 'x÷a＝b'], ['dec', '一位小数形态 x±a＝b']]) ok(cls[k] >= 1, `g4-eq-1 ${msg} 出现`, cls[k]);
}

// ---------------------------------------------------------------- g4-eq-2 解方程（两步）
{
  const ps = draw('g4-eq-2');
  const cls = { plus: 0, minus: 0, cox: 0 };
  let good = true;
  for (const p of ps) {
    const x = Number(p.answer);
    let m;
    if ((m = p.text.match(/^(\d+)×x＋(\d+)＝(\d+)$/))) { cls.plus += 1; good &&= near(x * Number(m[1]) + Number(m[2]), Number(m[3])) && x >= 1; }
    else if ((m = p.text.match(/^(\d+)×x−(\d+)＝(\d+)$/))) { cls.minus += 1; good &&= near(x * Number(m[1]) - Number(m[2]), Number(m[3])) && x >= 1; }
    else if ((m = p.text.match(/^(\d+)＋(\d+)×x＝(\d+)$/))) { cls.cox += 1; good &&= near(Number(m[1]) + x * Number(m[2]), Number(m[3])) && x >= 1; }
    else good = false;
  }
  ok(good, 'g4-eq-2 每题代回恒等、解为正整数');
  ok(cls.plus >= 1, 'g4-eq-2 ax＋b＝c 出现', cls.plus);
  ok(cls.minus >= 1, 'g4-eq-2 ax−b＝c 出现', cls.minus);
  ok(cls.cox >= 1, 'g4-eq-2 a＋bx＝c 出现', cls.cox);
}

// ---------------------------------------------------------------- g4-conv-add 加法凑整
{
  const ps = draw('g4-conv-add');
  let all = 0;
  for (const p of ps) {
    const m = p.text.match(/^(\d+)＋(\d+)＋(\d+)$/);
    if (!m) continue;
    const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const pair = [[a, b], [a, c], [b, c]].some(([u, v]) => (u + v) % 100 === 0 && u + v >= 100);
    if (pair && Number(p.answer) === a + b + c) all += 1;
  }
  ok(all === N, 'g4-conv-add 每题含一对整百加数、答案为三数和', all);
}

// ---------------------------------------------------------------- g4-conv-mul 乘法凑整
{
  const ps = draw('g4-conv-mul');
  const cls = { liancheng: 0, jia: 0, jian: 0, jian100: 0, x99: 0 };
  let pair254 = 0; let pair1258 = 0; let good = true;
  for (const p of ps) {
    let m;
    if ((m = p.text.match(/^(\d+)×(\d+)×(\d+)$/))) {
      cls.liancheng += 1;
      const f = [Number(m[1]), Number(m[2]), Number(m[3])];
      const pair = [[0, 1], [0, 2], [1, 2]].find(([i, j]) => (f[i] * f[j]) % 100 === 0 && f[i] * f[j] >= 100);
      if (!pair) good = false;
      const key = f[0] * f[1] === 100 || f[0] * f[2] === 100 || f[1] * f[2] === 100 ? [f[0], f[1], f[2]] : null;
      if (key && ((key.includes(25) && key.includes(4)) || (key.includes(125) && key.includes(8)))) { if (key.includes(125)) pair1258 += 1; else pair254 += 1; }
    } else if ((m = p.text.match(/^(\d+)×(\d+)＋(\d+)×(\d+)$/)) && m[1] === m[3]) {
      cls.jia += 1;
      good &&= (Number(m[2]) + Number(m[4])) % 100 === 0 && near(evalArith(p.text), Number(p.answer));
    } else if ((m = p.text.match(/^(\d+)×(\d+)−(\d+)×(\d+)$/)) && m[2] === m[4]) {
      cls.jian += 1;
      const diff = Number(m[1]) - Number(m[3]);
      if (diff % 100 === 0) cls.jian100 += 1;
      good &&= diff % 10 === 0 && diff >= 10 && Number(p.answer) > 0 && near(evalArith(p.text), Number(p.answer));
    } else if ((m = p.text.match(/^(\d+)×99$/))) {
      cls.x99 += 1;
      good &&= near(evalArith(p.text), Number(p.answer));
    } else good = false;
  }
  ok(good, 'g4-conv-mul 连乘含整百凑整对；分配形态因子相同、差为整十/整百且结果为正');
  ok(cls.liancheng >= 1, 'g4-conv-mul 连乘形态出现', cls.liancheng);
  ok(pair254 >= 1 || pair1258 >= 1, 'g4-conv-mul 连乘含 25×4 / 125×8 凑整对', pair254 + pair1258);
  ok(cls.jia >= 1, 'g4-conv-mul 分配加法 a×b＋a×c（b＋c 整百）出现', cls.jia);
  ok(cls.jian >= 1, 'g4-conv-mul 分配减法 a×b−a×c（差整十/整百）出现', cls.jian);
  ok(cls.jian100 >= 1, 'g4-conv-mul 分配减法含差为整百的题（206×14−6×14 类）', cls.jian100);
  ok(cls.x99 >= 1, 'g4-conv-mul a×99 特例出现', cls.x99);
}

// ---------------------------------------------------------------- g4-dec-mix 小数加减混合
{
  const ps = draw('g4-dec-mix');
  const cls = { f0: 0, f1: 0, f2: 0, f3: 0, f4: 0 };
  let good = true;
  for (const p of ps) {
    let m;
    if ((m = p.text.match(/^([\d.]+)＋([\d.]+)−([\d.]+)$/))) cls.f0 += 1;
    else if ((m = p.text.match(/^([\d.]+)−([\d.]+)＋([\d.]+)$/))) cls.f1 += 1;
    else if ((m = p.text.match(/^([\d.]+)−\(([\d.]+)＋([\d.]+)\)$/))) cls.f2 += 1;
    else if ((m = p.text.match(/^([\d.]+)−\(([\d.]+)−([\d.]+)\)$/))) cls.f3 += 1;
    else if ((m = p.text.match(/^([\d.]+)＋([\d.]+)＋([\d.]+)$/))) cls.f4 += 1;
    else { good = false; continue; }
    good &&= Number(p.answer) > 0 && /^\d+(\.\d{1,2})?$/.test(p.answer) && !/0$/.test(p.answer) && near(evalArith(p.text), Number(p.answer), 1e-9);
  }
  ok(good, 'g4-dec-mix 每题结果为正、小数位数≤2 且无末尾 0、算式验算成立');
  for (const [k, msg] of [['f0', 'a＋b−c'], ['f1', 'a−b＋c'], ['f2', 'a−(b＋c)'], ['f3', 'a−(b−c)'], ['f4', 'a＋b＋c']]) ok(cls[k] >= 1, `g4-dec-mix ${msg} 出现`, cls[k]);
}

// ---------------------------------------------------------------- g4-dec-shift 小数点移动
{
  const ps = draw('g4-dec-shift');
  const dirs = {};
  let exact = true; let noTrail = true; let div5 = 0; let mulInt = 0;
  for (const p of ps) {
    const m = p.text.match(/^([\d.]+)(×|÷)(10|100|1000)$/);
    if (!m) { exact = false; continue; }
    const dir = `${m[2]}${m[3]}`;
    dirs[dir] = (dirs[dir] || 0) + 1;
    const x = Number(m[1]); const mul = Number(m[3]);
    const want = m[2] === '×' ? x * mul : x / mul;
    if (!near(want, Number(p.answer), 1e-9)) exact = false;
    if (p.answer.includes('.') && /0$/.test(p.answer)) noTrail = false;
    if (dir === '÷1000' && /^0\.\d{5}$/.test(p.answer)) div5 += 1;
    if (dir === '×1000') { mulInt += 1; if (!/^\d+$/.test(p.answer)) exact = false; }
  }
  ok(exact, 'g4-dec-shift 结果精确（×1000 全为整数）、无末尾 0 歧义');
  ok(noTrail, 'g4-dec-shift 小数答案末位非 0');
  for (const d of ['×10', '×100', '×1000', '÷10', '÷100', '÷1000']) ok((dirs[d] || 0) >= 1, `g4-dec-shift ${d} 出现`, dirs[d] || 0);
  ok(div5 >= 1, 'g4-dec-shift ÷1000 出现五位小数答案（0.04321 类）', div5);
  ok(mulInt >= 1, 'g4-dec-shift ×1000 出现整数答案（90 类）', mulInt);
}

// ---------------------------------------------------------------- g4-vmul-3x2-zero 末尾有0的三位数乘两位数
{
  const ps = draw('g4-vmul-3x2-zero');
  let b1 = 0; let b2 = 0; let good = true;
  for (const p of ps) {
    const m = p.text.match(/^(\d+) × (\d+)$/);
    if (!m) { good = false; continue; }
    const a = Number(m[1]); const b = Number(m[2]);
    if (a < 100 || a > 999 || b < 10 || b > 99) good = false;
    if (a % 10 === 0) b1 += 1;
    else if (b % 10 === 0) b2 += 1;
    else good = false;
  }
  ok(good, 'g4-vmul-3x2-zero 范围为三位数×两位数、两因数至少一个末位为 0');
  ok(b1 >= 10, 'g4-vmul-3x2-zero 被乘数 0 结尾形态（210×47 类）≥10', b1);
  ok(b2 >= 10, 'g4-vmul-3x2-zero 乘数 0 结尾且被乘数非 0 结尾形态（632×50 类）≥10', b2);
}

// ---------------------------------------------------------------- g4-rewrite 大数改写
{
  const ps = draw('g4-rewrite');
  let wan = 0; let yi = 0; let good = true;
  for (const p of ps) {
    const m = p.text.match(/^(\d+)＝(\d+)(万|亿)$/);
    if (!m) { good = false; continue; }
    const n = Number(m[1]); const k = Number(m[2]);
    if (m[3] === '万') { wan += 1; good &&= n % 10 ** 4 === 0 && p.answer === m[2]; }
    else { yi += 1; good &&= n % 10 ** 8 === 0 && p.answer === m[2]; }
  }
  ok(good, 'g4-rewrite n 为 10^4/10^8 整倍数、答案与单位一致');
  ok(wan >= 10, 'g4-rewrite 「万」改写出现', wan);
  ok(yi >= 10, 'g4-rewrite 「亿」改写出现', yi);
}

// ---------------------------------------------------------------- g4-vdiv-3d2 三位数除以两位数（扩宽）
{
  const ps = draw('g4-vdiv-3d2');
  let ge50 = 0; let round50 = 0; let exact = 0; let rem = 0; let good = true;
  const divisors = new Set();
  for (const p of ps) {
    const m = p.text.match(/^(\d+) ÷ (\d+)$/);
    if (!m) { good = false; continue; }
    const D = Number(m[1]); const d = Number(m[2]);
    divisors.add(d);
    if (d < 11 || d > 90 || D < 100 || D > 999 || D < 2 * d) good = false;
    const q = Math.floor(D / d);
    if (q < 1 || q > 99) good = false;
    if (D % d === 0) exact += 1; else rem += 1;
    if (d >= 50 && d % 10 !== 0) ge50 += 1;
    if (d >= 50 && d % 10 === 0) round50 += 1;
  }
  ok(good, 'g4-vdiv-3d2 除数 11–90、被除数三位数且 ≥2d、商 1–2 位');
  ok(ge50 >= 40, 'g4-vdiv-3d2 除数 ≥50 的非整十出现（361÷54 类）', ge50);
  ok(round50 >= 1, 'g4-vdiv-3d2 整十除数 50–90 出现（350÷90 类）', round50);
  ok(exact >= 1 && rem >= 1, `g4-vdiv-3d2 整除与有余数两态出现（整除 ${exact} / 有余数 ${rem}）`);
  // 89/90 等具体值的补抽存在性检查（120 题里个位值出现期望约 1.5 次，单独验证可出现）。
  const rng2 = makeRng(777);
  const seen = new Set(); let sawExact = false;
  for (let i = 0; i < 5000 && !(seen.has(89) && seen.has(90) && sawExact); i++) {
    const p = makeProblem('g4-vdiv-3d2', rng2, new Set());
    const m = p.text.match(/^(\d+) ÷ (\d+)$/);
    if (!m) continue;
    seen.add(Number(m[2]));
    if (Number(m[1]) % Number(m[2]) === 0) sawExact = true;
  }
  ok(seen.has(89), 'g4-vdiv-3d2 除数 89 可出现（448÷89 类，补抽存在性）');
  ok(seen.has(90), 'g4-vdiv-3d2 除数 90 可出现（720÷90 类，补抽存在性）');
  ok(sawExact, 'g4-vdiv-3d2 整除题可出现（补抽存在性）');
}

// ---------------------------------------------------------------- g4-order 运算顺序（扩宽）
{
  const ps = draw('g4-order');
  const cls = { f0: 0, f1: 0, f2: 0, f3: 0, muldivAdd: 0, muldivSub: 0, brMinus: 0, brDiv: 0 };
  let good = true;
  for (const p of ps) {
    const t = p.text;
    const div = t.match(/(\d+)÷(\d+)/);
    if (div && Number(div[1]) % Number(div[2]) !== 0) good = false;
    let m;
    if ((m = t.match(/^\d＋\d×\d$/))) cls.f0 += 1;
    else if ((m = t.match(/^\d×\(\d＋\d\)$/))) cls.f1 += 1;
    else if ((m = t.match(/^\(\d−\d\)×\d$/))) cls.f2 += 1;
    else if ((m = t.match(/^\d+−\d×\d$/))) cls.f3 += 1;
    else if ((m = t.match(/^\d×\d＋\d+÷\d$/))) cls.muldivAdd += 1;
    else if ((m = t.match(/^\d×\d−\d+÷\d$/))) cls.muldivSub += 1;
    else if ((m = t.match(/^\d+−\[\d×\(\d−\d\)\]$/))) cls.brMinus += 1;
    else if ((m = t.match(/^\d+÷\[\d×\(\d−\d\)\]$/))) cls.brDiv += 1;
    else good = false;
    good &&= t.includes('[') === (t.includes(']'));
    good &&= Number(p.answer) > 0 && Number(p.answer) <= 999 && near(evalArith(t), Number(p.answer), 1e-9);
  }
  ok(good, 'g4-order 除法整除、中括号成对、答案为正≤999 且验算成立');
  for (const [k, msg] of [['f0', 'a＋b×c'], ['f1', 'a×(b＋c)'], ['f2', '(a−b)×c'], ['f3', 'x−b×c'], ['muldivAdd', 'a×b＋c÷d'], ['muldivSub', 'a×b−c÷d'], ['brMinus', 'x−[b×(c−d)]'], ['brDiv', 'x÷[b×(c−d)]']]) ok(cls[k] >= 1, `g4-order ${msg} 出现`, cls[k]);
}

// ---------------------------------------------------------------- g4-round 近似数（扩宽）
{
  const ps = draw('g4-round');
  const plOf = { 十: 1, 百: 2, 千: 3, 万: 4, 十万: 5, 亿: 8 };
  const below = { 1: '个', 2: '十', 3: '百', 4: '千', 5: '万', 8: '千万' };
  const seen = new Set();
  let good = true;
  for (const p of ps) {
    const m = p.text.match(/^(\d+)精确到(.+)位的近似数$/);
    const h = (p.help || '').match(/^(.+)位四舍五入$/);
    if (!m || !h || !(m[2] in plOf)) { good = false; continue; }
    const n = Number(m[1]); const pl = plOf[m[2]];
    seen.add(m[2]);
    const ans = Math.round(n / 10 ** pl) * 10 ** pl;
    good &&= String(ans).length <= String(n).length && p.answer === String(ans) && h[1] === below[pl];
  }
  ok(good, 'g4-round 答案位数不增加、help 为目标位的下一位名称（万位→千位四舍五入等）');
  for (const nm of ['十', '百', '千', '万', '十万', '亿']) ok(seen.has(nm), `g4-round 目标位「${nm}位」出现`);
}

// ---------------------------------------------------------------- g4-dec-add2 两位小数加减（扩宽）
{
  const ps = draw('g4-dec-add2');
  let intMinuend = 0; let intSub2 = 0; let good = true;
  for (const p of ps) {
    const m = p.text.match(/^(\d+)\.00 − (\d+\.\d{1,2})$/);
    if (m) {
      intMinuend += 1;
      if (m[2].includes('.') && m[2].split('.')[1].length === 2) intSub2 += 1;
      good &&= near(Number(m[1]) - Number(m[2]), Number(p.answer), 1e-9);
    }
  }
  ok(good, 'g4-dec-add2 整数被减数按补 0 显示（38.00）且验算成立');
  ok(intMinuend >= 8, 'g4-dec-add2 整数被减数形态 ≥8（减法题内约 1/4，全卷期望约 1/8）', intMinuend);
  ok(intSub2 >= 1, 'g4-dec-add2 整数被减数＋两位小数减数形态出现', intSub2);
}

// ---------------------------------------------------------------- g4-dec-mul 小数乘整数（扩宽）
{
  const ps = draw('g4-dec-mul');
  let sub1 = 0; let small = 0; let two = 0; let good = true;
  for (const p of ps) {
    const m = p.text.match(/^(\d+\.\d) × (\d)$/);
    if (!m) { good = false; continue; }
    const a = Number(m[1]); const b = Number(m[2]);
    if (near(a * b, Number(p.answer), 1e-9)) { /* verified below */ } else good = false;
    if (/^0\.\d$/.test(m[1])) {
      sub1 += 1;
      if (Number(p.answer) < 1) small += 1;
    } else two += 1;
    good &&= !/0$/.test(p.answer) || !p.answer.includes('.');
  }
  ok(good, 'g4-dec-mul 验算成立、积无末尾 0');
  ok(sub1 >= 10, 'g4-dec-mul 0.x×一位数出现（0.2×4 类）', sub1);
  ok(small >= 1, 'g4-dec-mul 积小于 1 的题出现（0.8 类）', small);
  ok(two >= 10, 'g4-dec-mul 两位数×一位数（4.6×2 类）出现', two);
}

// ---------------------------------------------------------------- 汇总
console.log(checks.join('\n'));
console.log(`\n${checks.filter((c) => c.startsWith('PASS')).length} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
