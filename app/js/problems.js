// Problem generation and layouts. Every problem is a small grid of cells
// (digits, operators, lines) plus an ordered list of input steps; each step
// is one digit typed into one cell. Layout families:
//   column add/sub (with decimals), column multiplication, long division,
//   and horizontal expressions (integers, decimals, fractions, remainders).
import { SKILL } from './skills.js';

export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLACE = ['个位', '十位', '百位', '千位', '万位', '十万位'];
const DEC_PLACE = ['十分位', '百分位', '千分位'];
const digits = (n) => String(n).split('').map(Number);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
// Multiples of d up to the first one above n (hint for "how many d in n").
const table = (d, n) => { const out = []; for (let k = 1; k <= 9; k++) { out.push(d * k); if (d * k > n) break; } return `${d}的倍数：${out.join(' ')}`; };
// Decimal string for an integer scaled by 10^p (1234, 2 -> "12.34").
const decStr = (n, p) => { if (!p) return String(n); const s = String(n).padStart(p + 1, '0'); return `${s.slice(0, -p)}.${s.slice(-p)}`; };
// Same, with trailing zeros dropped (1200 at 2 places -> "12", 4050 at 3 -> "4.05").
const decMin = (n, p) => { let s = decStr(n, p); while (s.includes('.') && s.endsWith('0')) s = s.slice(0, -1); return s.endsWith('.') ? s.slice(0, -1) : s; };

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
const hasZeroBorrow = (a, b) => { const as = String(a); const bs = String(b).padStart(as.length, '0'); for (let i = 1; i < as.length - 1; i++) if (as[i] === '0' && bs[i] === '0' && Number(as[as.length - 1]) < Number(bs[bs.length - 1])) return true; return false; };

// ================================================================ column add / sub
// a, b are integers scaled by 10^pa / 10^pb; the decimal point is aligned.
function buildAdd(a, b, pa = 0, pb = 0) {
  const P = Math.max(pa, pb);
  const A = a * 10 ** (P - pa); const B = b * 10 ** (P - pb);
  const sum = A + B;
  const as = decDigits(A, P); const bs = decDigits(B, P); const ss = decDigits(sum, P);
  const W = Math.max(as.length, bs.length, ss.length);
  const cols = W + 1;
  const cells = [];
  // Hide padded trailing zeros of the shorter decimal.
  const shown = (str, p, i) => i < str.length - (P - p);
  as.forEach((d, i) => { if (shown(as, pa, i)) cells.push({ id: `a${cols - as.length + i}`, r: 1, c: cols - as.length + i, text: d, kind: 'given' }); });
  bs.forEach((d, i) => { if (shown(bs, pb, i)) cells.push({ id: `b${cols - bs.length + i}`, r: 2, c: cols - bs.length + i, text: d, kind: 'given' }); });
  cells.push({ id: 'op', r: 2, c: cols - Math.max(as.length, bs.length) - 1, text: '＋', kind: 'op' });
  if (P) addDots(cells, cols - 1 - P, [1, 2, 3]);
  const steps = [];
  let carry = 0;
  const ad = as.slice().reverse().map(Number); const bd = bs.slice().reverse().map(Number);
  for (let i = 0; i < ss.length; i++) {
    const c = cols - 1 - i;
    const s = (ad[i] || 0) + (bd[i] || 0) + carry;
    const carryIn = carry;
    carry = s >= 10 ? 1 : 0;
    const terms = [ad[i], bd[i]].filter((x, k) => x !== undefined && (k === 0 ? shown(as, pa, as.length - 1 - i) : shown(bs, pb, bs.length - 1 - i)));
    const help = { ids: [`a${c}`, `b${c}`, ...(carryIn ? [`k${c}`] : [])], text: terms.length ? `${terms.join(' ＋ ')}${carryIn ? ' ＋ 1' : ''}` : '进位的 1' };
    const digit = ss[ss.length - 1 - i];
    cells.push({ id: `s${c}`, r: 3, c, text: digit, kind: 'input' });
    const after = [];
    if (carry && i < ss.length - 1) { cells.push({ id: `k${c - 1}`, r: 0, c: c - 1, text: '1', kind: 'carry', small: true }); after.push(`k${c - 1}`); }
    steps.push({ cell: `s${c}`, digit, label: placeLabel(i, P), after, carryFrom: after.length ? c : null, help });
  }
  const text = `${decStr(a, pa)} + ${decStr(b, pb)}`;
  return { kind: 'add', a, b, answer: decStr(sum, P), text, title: P ? '小数加法' : '加法', rows: 4, cols, cells, lines: [{ r: 2, c0: 0, c1: cols - 1 }], steps, bracket: null };
}

function buildSub(a, b, pa = 0, pb = 0) {
  const P = Math.max(pa, pb);
  const A = a * 10 ** (P - pa); const B = b * 10 ** (P - pb);
  const res = A - B;
  const as = decDigits(A, P); const bs = decDigits(B, P);
  const rsFull = decDigits(res, P);
  const W = as.length;
  const cols = W + 1;
  const cells = [];
  const shown = (str, p, i) => i < str.length - (P - p);
  as.forEach((d, i) => { if (shown(as, pa, i)) cells.push({ id: `a${i + 1}`, r: 1, c: i + 1, text: d, kind: 'given' }); });
  bs.forEach((d, i) => { if (shown(bs, pb, i)) cells.push({ id: `b${cols - bs.length + i}`, r: 2, c: cols - bs.length + i, text: d, kind: 'given' }); });
  cells.push({ id: 'op', r: 2, c: 0, text: '−', kind: 'op' });
  if (P) addDots(cells, cols - 1 - P, [1, 2, 3]);
  const cur = [null, ...as.map(Number)];
  const bcol = (c) => { const i = c - (cols - bs.length); return i >= 0 ? Number(bs[i]) : 0; };
  const steps = [];
  for (let i = 0; i < rsFull.length; i++) {
    const c = cols - 1 - i;
    const marks = [];
    if (cur[c] < bcol(c)) {
      let k = c - 1;
      while (cur[k] === 0) { cur[k] = 9; marks.push({ c: k, text: '9' }); k -= 1; }
      cur[k] -= 1; marks.push({ c: k, text: String(cur[k]) });
      cur[c] += 10; marks.push({ c, text: String(cur[c]) });
    }
    const digit = rsFull[rsFull.length - 1 - i];
    cells.push({ id: `s${c}`, r: 3, c, text: digit, kind: 'input' });
    const help = { ids: [`a${c}`, `b${c}`, `m${c}`], text: `${cur[c]} − ${bcol(c)}` };
    steps.push({ cell: `s${c}`, digit, label: placeLabel(i, P), after: [], marks, help });
  }
  for (let c = 1; c < cols; c++) cells.push({ id: `m${c}`, r: 0, c, text: '', kind: 'mark', small: true });
  const text = `${decStr(a, pa)} − ${decStr(b, pb)}`;
  return { kind: 'sub', a, b, answer: decStr(res, P), text, title: P ? '小数减法' : '减法', rows: 4, cols, cells, lines: [{ r: 2, c0: 0, c1: cols - 1 }], steps, bracket: null };
}

// Digits of a scaled decimal, with at least one digit before the point.
function decDigits(n, p) { return String(n).padStart(p + 1, '0').split(''); }
function placeLabel(i, P) { return i < P ? DEC_PLACE[P - 1 - i] : PLACE[i - P]; }
// Decimal points sit on the right edge of the ones column in each row.
function addDots(cells, c, rows, hidden = false) { rows.forEach((r) => cells.push({ id: `dot${r}`, r, c, text: '.', kind: hidden ? 'auto' : 'dot' })); }

// ================================================================ column multiplication
// a × b with b of 1 or 2 digits; pa/pb decimal places (product point is placed at the end).
// Sub-1 decimals show their leading 0 (0.2); the product's leading 0
// (0.2 × 4 ＝ 0.8) is typed like any digit, as in column add/sub.
function buildMul(a, b, pa = 0, pb = 0) {
  const prod = a * b;
  const P = pa + pb;
  const as0 = String(a); const bs0 = String(b); const ps0 = String(prod);
  const as = pa && a < 10 ** pa ? `0${as0}` : as0;
  const bs = pb && b < 10 ** pb ? `0${bs0}` : bs0;
  const ps = P && prod < 10 ** P ? `0${ps0}` : ps0;
  const cols = Math.max(ps.length, as.length, bs.length + 1) + 1;
  const cells = [];
  [...as].forEach((d, i) => cells.push({ id: `a${cols - as.length + i}`, r: 1, c: cols - as.length + i, text: d, kind: 'given' }));
  [...bs].forEach((d, i) => cells.push({ id: `b${cols - bs.length + i}`, r: 2, c: cols - bs.length + i, text: d, kind: 'given' }));
  cells.push({ id: 'op', r: 2, c: cols - Math.max(as.length, bs.length) - 1, text: '×', kind: 'op' });
  if (pa) cells.push({ id: 'dota', r: 1, c: cols - 1 - pa, text: '.', kind: 'dot' });
  if (pb) cells.push({ id: 'dotb', r: 2, c: cols - 1 - pb, text: '.', kind: 'dot' });
  const lines = [{ r: 2, c0: 0, c1: cols - 1 }];
  const steps = [];
  const bd = digits(b).reverse();
  const partialRow = (row, factor, shift, tag, lead) => {
    const part = String(a * factor);
    const str = (lead ? '0' : '') + part;
    let carry = 0;
    const ad = digits(a).reverse();
    for (let i = 0; i < str.length; i++) {
      const c = cols - 1 - shift - i;
      const digit = str[str.length - 1 - i];
      cells.push({ id: `${tag}${c}`, r: row, c, text: digit, kind: 'input' });
      const x = ad[i];
      const help = i >= part.length ? { ids: [], text: '先按整数乘，再点上小数点' }
        : x !== undefined ? { ids: [`a${c + shift}`, `b${cols - 1 - shift}`], text: `${x} × ${factor}${carry ? ` ＋ ${carry}` : ''}` } : { ids: [], text: `进位的 ${carry}` };
      carry = x !== undefined ? Math.floor((x * factor + carry) / 10) : 0;
      steps.push({ cell: `${tag}${c}`, digit, label: i >= part.length ? '补 0' : `乘 ${factor}`, after: [], help });
    }
  };
  if (bs0.length === 1) {
    partialRow(3, b, 0, 's', ps.length > ps0.length);
  } else {
    partialRow(3, bd[0], 0, 'p');
    partialRow(4, bd[1], 1, 'q');
    lines.push({ r: 4, c0: 0, c1: cols - 1 });
    const p1 = a * bd[0]; const p2 = a * bd[1] * 10;
    let carry = 0;
    for (let i = 0; i < ps.length; i++) {
      const c = cols - 1 - i;
      const x = Math.floor(p1 / 10 ** i) % 10; const y = i ? Math.floor(p2 / 10 ** i) % 10 : 0;
      const digit = ps[ps.length - 1 - i];
      cells.push({ id: `s${c}`, r: 5, c, text: digit, kind: 'input' });
      const help = i >= ps0.length ? { ids: [], text: '先按整数乘，再点上小数点' } : { ids: [`p${c}`, `q${c}`], text: `${x}${i ? ` ＋ ${y}` : ''}${carry ? ` ＋ ${carry}` : ''}` };
      carry = Math.floor((x + y + carry) / 10);
      steps.push({ cell: `s${c}`, digit, label: i >= ps0.length ? '补 0' : `相加（${PLACE[i]}）`, after: [], help });
    }
  }
  const lastRow = bs0.length === 1 ? 3 : 5;
  if (P) { cells.push({ id: 'dotp', r: lastRow, c: cols - 1 - P, text: '.', kind: 'auto' }); steps[steps.length - 1].after.push('dotp'); }
  const text = `${decStr(a, pa)} × ${decStr(b, pb)}`;
  return { kind: 'mul', a, b, answer: decStr(prod, P), text, title: P ? '小数乘法' : '乘法', rows: lastRow + 1, cols, cells, lines, steps, bracket: null };
}

// ================================================================ long division
// D ÷ d (d of 1-2 digits), integer quotient, remainder allowed.
function buildDiv(D, d) {
  const Ds = String(D); const ds = String(d);
  const off = ds.length; // dividend columns start after the divisor
  const cols = off + Ds.length;
  const cells = [];
  [...ds].forEach((x, i) => cells.push({ id: `dv${i}`, r: 1, c: i, text: x, kind: 'given' }));
  [...Ds].forEach((x, i) => cells.push({ id: `D${i + 1}`, r: 1, c: off + i, text: x, kind: 'given' }));
  const q = Math.floor(D / d); const rem = D % d;
  // First partial dividend: fewest leading digits that are >= d.
  let k = 1;
  while (Number(Ds.slice(0, k)) < d && k < Ds.length) k += 1;
  let cur = Number(Ds.slice(0, k));
  let col = off + k - 1;
  let rowP = 1; // row holding the current partial dividend
  const steps = [];
  const lines = [];
  const place = (n, endCol, r, prefix, kind) => digits(n).map((x, i, arr) => {
    const c = endCol - (arr.length - 1 - i);
    const id = `${prefix}${r}_${c}`;
    cells.push({ id, r, c, text: String(x), kind });
    return id;
  });
  const divIds = [...ds].map((_, i) => `dv${i}`);
  for (;;) {
    const qd = Math.floor(cur / d);
    const qid = `q${col}`;
    cells.push({ id: qid, r: 0, c: col, text: String(qd), kind: 'input' });
    const last = col === cols - 1;
    const qStep = { cell: qid, digit: String(qd), label: `商的${PLACE[cols - 1 - col]}`, hint: `${cur}里有几个${d}`, after: [], help: { ids: divIds, text: table(d, cur) } };
    steps.push(qStep);
    let r = cur;
    if (qd > 0) {
      const m = qd * d;
      const pr = rowP + 1;
      const mids = place(m, col, pr, 'm', 'auto');
      const lid = `L${pr}`;
      lines.push({ id: lid, r: pr, c0: col - String(Math.max(m, cur)).length + 1, c1: col, hidden: true });
      qStep.after.push(...mids, lid);
      r = cur - m;
      rowP = pr + 1;
      // Remainder of this subtraction, typed right to left (omitted when 0 and more digits follow).
      if (r === 0 && last) {
        // Exact division: the final 0 appears on its own.
        const zid = `z${rowP}_${col}`;
        cells.push({ id: zid, r: rowP, c: col, text: '0', kind: 'auto' });
        qStep.after.push(zid);
      } else if (r > 0) {
        const rs = String(r);
        for (let i = rs.length - 1; i >= 0; i--) {
          const c = col - (rs.length - 1 - i);
          const id = `r${rowP}_${c}`;
          cells.push({ id, r: rowP, c, text: rs[i], kind: 'input' });
          steps.push({ cell: id, digit: rs[i], label: '减去后的余数', hint: `${cur} − ${m}`, after: [], help: { ids: mids, text: `${cur} − ${m}` } });
        }
      }
    }
    if (last) break;
    // Bring down the next digit beside the remainder.
    const nextDigit = Ds[col - off + 1];
    const bid = `bd${rowP}_${col + 1}`;
    cells.push({ id: bid, r: rowP, c: col + 1, text: nextDigit, kind: 'auto', drop: `D${col - off + 2}` });
    steps[steps.length - 1].after.push(bid);
    cur = r * 10 + Number(nextDigit);
    col += 1;
  }
  const row = rowP;
  const rows = row + 1;
  const answer = rem ? `${q} 余 ${rem}` : String(q);
  return {
    kind: 'div', a: D, b: d, answer, text: `${D} ÷ ${d}`, title: '除法', rows, cols, cells, lines, steps,
    bracket: { r: 1, c0: off, c1: cols - 1 }, rem,
  };
}

// ================================================================ horizontal expressions
// tokens: { n: '12' } given number, { op: '＋' }, { w: '余' } word,
// { ans: '12.5' } answer (digits typed left to right, point auto),
// { f: [n, d, whole?] } given fraction, { fa: [n, d, whole?] } answer fraction,
// { br: true } line break.
function buildH(tokens, meta) {
  const hasFrac = tokens.some((t) => t.f || t.fa);
  const cells = []; const lines = []; const steps = [];
  const rowH = hasFrac ? 2 : 1;
  let r = 0; let c = 0; let maxC = 0;
  let uid = 0;
  const id = (p) => `${p}${uid++}`;
  const span = { rs: rowH };
  const ansIds = [];
  for (const t of tokens) {
    if (t.br) { maxC = Math.max(maxC, c); c = 0; r += rowH; continue; }
    if (t.n !== undefined || t.op !== undefined || t.w !== undefined) {
      const text = String(t.n ?? t.op ?? t.w);
      const kind = t.n !== undefined ? 'given' : t.op !== undefined ? 'op' : 'word';
      const w = kind === 'word' ? Math.max(1, Math.ceil(text.length / 2)) : kind === 'given' ? text.replace('.', '').length : 1;
      const cid = id(kind[0]);
      cells.push({ id: cid, r, c, cs: w, ...span, text, kind });
      if (kind === 'given') ansIds.push(cid);
      c += w;
    } else if (t.ans !== undefined) {
      const s = String(t.ans);
      for (const ch of s) {
        if (ch === '.') { cells.push({ id: id('dot'), r, c: c - 1, ...span, text: '.', kind: 'dot' }); continue; }
        const cid = id('x');
        cells.push({ id: cid, r, c, ...span, text: ch, kind: 'input' });
        steps.push({ cell: cid, digit: ch, label: t.label || '答案', after: [], help: meta.help ? { ids: [...ansIds], text: meta.help } : null });
        c += 1;
      }
    } else if (t.f || t.fa) {
      const [n, d, whole] = t.f || t.fa;
      const given = !!t.f;
      if (whole) {
        const ws = String(whole);
        if (given) { cells.push({ id: id('w'), r, c, cs: ws.length, ...span, text: ws, kind: 'given' }); c += ws.length; } else {
          for (const ch of ws) { const cid = id('x'); cells.push({ id: cid, r, c, ...span, text: ch, kind: 'input' }); steps.push({ cell: cid, digit: ch, label: '整数部分', after: [], help: meta.help ? { ids: [], text: meta.help } : null }); c += 1; }
        }
      }
      const ns = String(n); const dsx = String(d);
      const w = Math.max(ns.length, dsx.length);
      lines.push({ r, c0: c, c1: c + w - 1, frac: true });
      if (given) {
        cells.push({ id: id('n'), r, c, cs: w, text: ns, kind: 'given', cls: 'frac-n' });
        cells.push({ id: id('d'), r: r + 1, c, cs: w, text: dsx, kind: 'given', cls: 'frac-d' });
      } else {
        // Denominator first, then numerator (as taught in school).
        const put = (str, row, label, cls) => [...str].forEach((ch, i) => {
          const cid = id('x');
          cells.push({ id: cid, r: row, c: c + w - str.length + i, text: ch, kind: 'input', cls });
          steps.push({ cell: cid, digit: ch, label, after: [], help: meta.help ? { ids: [], text: meta.help } : null });
        });
        put(dsx, r + 1, '分母', 'frac-d');
        put(ns, r, '分子', 'frac-n');
      }
      c += w;
    }
    maxC = Math.max(maxC, c);
  }
  return { kind: 'h', rows: r + rowH, cols: Math.max(maxC, c), cells, lines, steps, bracket: null, ...meta };
}

// ================================================================ generators
const R = (rng) => (a, b) => a + Math.floor(rng() * (b - a + 1));
const pickOf = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const range = (v, rng) => (Array.isArray(v) ? R(rng)(v[0], v[1]) : v);
const nDigit = (r, n) => r(10 ** (n - 1), 10 ** n - 1);
const reduce = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
// Fraction answer token, as a mixed number when requested.
function fracAns(n, d, mixed) {
  [n, d] = reduce(n, d);
  if (mixed && n > d) return { fa: [n % d, d, Math.floor(n / d)], text: `${Math.floor(n / d)}又${n % d}/${d}` };
  return { fa: [n, d], text: `${n}/${d}` };
}
const fracTok = (n, d, whole) => ({ f: [n, d, whole] });

// 小数混合运算, the ×/÷ half of dec3 (`four`). Seven shapes of 五上·一 调查
// 「生活垃圾」: a÷b÷c, a÷(b×c), a÷(b÷c), a−b×c, (a−b)÷c, a×b÷c and 1−a×c.
// Every division is exact — the quotient is drawn and the dividend built back
// from it — and every value is printed with the places it really has, so
// 1−0.35×0.7 stays 0.755 instead of 0.76. Terms are whole numbers or 1-2
// decimals (never ending in 0); a result is a whole number or has 1-3 decimals.
function dec3Four(rng) {
  const r = R(rng);
  // One term: a whole number or a 1-2 decimal number that never ends in 0.
  const term = () => {
    const k = r(0, 3);
    if (k === 0) { const n = r(2, 15); return { s: String(n), m: n * 1000 }; }
    if (k === 1) { const n = r(11, 99); if (n % 10 === 0) return null; return { s: decStr(n, 1), m: n * 100 }; }
    if (k === 2) { const n = r(11, 999); if (n % 10 === 0) return null; return { s: decStr(n, 2), m: n * 10 }; }
    const n = r(11, 99); if (n % 10 === 0) return null;
    return { s: decStr(n, 2), m: n * 10 };
  };
  // Candidates for the result, in thousandths: whole numbers and two decimals,
  // or — for 1−a×c, whose result is below 1 — the multiples of C/gcd(C, 1000)
  // that make a×C exact, plus three decimals (0.755). A short list beats
  // redrawing the whole shape, because only some of them divide exactly.
  const cands = (small, C) => {
    const out = [];
    if (small) {
      const g = C.m / gcd(C.m, 1000);
      const hi = Math.floor(999 / g);
      for (let i = 0; i < 4; i += 1) { const t = r(1, hi); if (t % 10 !== 0) out.push(1000 - t * g); }
      for (let i = 0; i < 3; i += 1) { const m = r(1, 999); if (m % 10 !== 0) out.push(m); }
      return out;
    }
    for (let i = 0; i < 4; i += 1) out.push(r(1, 99) * 10 + r(1, 9));
    for (let i = 0; i < 3; i += 1) out.push(r(1, 99) * 1000);
    return out;
  };
  const whole = (m) => m > 0 && m <= 99990 && m % 10 === 0; // at most 2 decimals
  const s = (m) => decMin(m, 3);
  // Build one shape, or null when the division is not exact / a is not a term.
  const build = (form, B, C, R) => {
    let toks; let help; let a;
    if (form <= 1) { // a÷b÷c and a÷(b×c) are the same arithmetic
      a = R * B.m * C.m / 1e6; if (!Number.isInteger(a)) return null;
      toks = form === 0
        ? [{ n: s(a) }, { op: '÷' }, { n: B.s }, { op: '÷' }, { n: C.s }]
        : [{ n: s(a) }, { op: '÷' }, { op: '(' }, { n: B.s }, { op: '×' }, { n: C.s }, { op: ')' }];
      if (form === 1) { help = `先算 ${B.s} × ${C.s} ＝ ${s(B.m * C.m / 1000)}`; } else {
        // The step shown in the hint keeps to three decimals like everything else.
        const m = a / B.m * 1000; if (!Number.isInteger(m)) return null;
        help = `先算 ${s(a)} ÷ ${B.s} ＝ ${s(m)}`;
      }
    } else if (form === 2) { // a÷(b÷c)
      const w = B.m * 1000 / C.m; if (!Number.isInteger(w)) return null;
      a = R * w / 1000; if (!Number.isInteger(a)) return null;
      toks = [{ n: s(a) }, { op: '÷' }, { op: '(' }, { n: B.s }, { op: '÷' }, { n: C.s }, { op: ')' }];
      help = `先算 ${B.s} ÷ ${C.s} ＝ ${s(w)}`;
    } else if (form === 3) { // a−b×c
      const p = B.m * C.m / 1000; if (!Number.isInteger(p)) return null;
      a = R + p;
      toks = [{ n: s(a) }, { op: '−' }, { n: B.s }, { op: '×' }, { n: C.s }];
      help = `先算 ${B.s} × ${C.s} ＝ ${s(p)}`;
    } else if (form === 4) { // (a−b)÷c
      const m = R * C.m / 1000; if (!Number.isInteger(m)) return null;
      a = m + B.m;
      toks = [{ op: '(' }, { n: s(a) }, { op: '−' }, { n: B.s }, { op: ')' }, { op: '÷' }, { n: C.s }];
      help = `先算 ${s(a)} − ${B.s} ＝ ${s(m)}`;
    } else if (form === 5) { // a×b÷c
      const p = R * C.m / 1000; if (!Number.isInteger(p)) return null;
      a = p * 1000 / B.m; if (!Number.isInteger(a)) return null;
      toks = [{ n: s(a) }, { op: '×' }, { n: B.s }, { op: '÷' }, { n: C.s }];
      help = `先算 ${s(a)} × ${B.s} ＝ ${s(p)}`;
    } else { // 1−a×c
      a = (1000 - R) * 1000 / C.m; if (!Number.isInteger(a)) return null;
      toks = [{ n: 1 }, { op: '−' }, { n: s(a) }, { op: '×' }, { n: C.s }];
      help = `先算 ${s(a)} × ${C.s} ＝ ${s(1000 - R)}`;
    }
    if (!whole(a)) return null;
    return { toks, help, a };
  };
  // One shape per block, then a redraw of the shape: the seven are not equally
  // easy to hit, and a single loop would hand most of the volume to the easy
  // ones (a÷b÷c and a÷(b×c) are the same arithmetic and share their draw).
  for (let block = 0; block < 16; block += 1) {
    const form = r(0, 6);
    for (let g = 0; g < 120; g += 1) {
      const B = term(); const C = term(); if (!B || !C) continue;
      for (const R of cands(form === 6, C)) {
        const b = build(form, B, C, R); if (!b) continue;
        const grid = buildH([...b.toks, { op: '＝' }, { ans: s(R) }], { title: '小数混合', text: b.toks.map((t) => t.n ?? t.op).join(''), answer: s(R), help: b.help });
        if (grid.cols > 16) continue;
        return grid;
      }
    }
  }
  throw new Error('dec3Four');
}

// 分数加减混合 (五下·一 分数混合运算): a three-term chain a/b − c/d − e/f, or
// four terms in two pairs that each add up to 1 (1/4＋3/4＋2/5＋3/5＝2, the
// 交换律 / 结合律 of the textbook). Denominators 2-9, results positive and
// shown in lowest terms. The form is drawn first, because the chain needs
// three distinct denominators with a small common one and is the rarer one.
function fracMix(rng) {
  const r = R(rng);
  // One shape per block, because the chain needs three distinct denominators
  // with a small common one and is much the rarer draw of the two.
  for (let block = 0; block < 8; block += 1) {
    if (rng() < 0.5) {
      for (let g = 0; g < 150; g += 1) {
        const d1 = r(2, 9); const d2 = r(2, 9); const d3 = r(2, 9);
        if (d1 === d2 || d2 === d3 || d1 === d3) continue;
        const L = lcm(lcm(d1, d2), d3); if (L > 36) continue;
        const n2 = r(1, d2 - 1); const n3 = r(1, d3 - 1);
        if (gcd(n2, d2) !== 1 || gcd(n3, d3) !== 1) continue;
        // About a quarter of the chains start from 1.
        const one = rng() < 0.25;
        const n1 = r(1, d1 - 1); if (!one && gcd(n1, d1) !== 1) continue;
        const res = one ? L - n2 * (L / d2) - n3 * (L / d3) : n1 * (L / d1) - n2 * (L / d2) - n3 * (L / d3);
        if (res <= 0) continue;
        const [rn, rd] = reduce(res, L); if (rd === 1) continue;
        const a = fracAns(rn, rd, true);
        const grid = buildH([one ? { n: 1 } : fracTok(n1, d1), { op: '−' }, fracTok(n2, d2), { op: '−' }, fracTok(n3, d3), { op: '＝' }, a], { title: '分数加减混合', text: `${one ? 1 : `${n1}/${d1}`} − ${n2}/${d2} − ${n3}/${d3}`, answer: a.text, help: `通分后分母是 ${L}` });
        if (grid.cols > 16) continue;
        return grid;
      }
    } else {
      for (let g = 0; g < 30; g += 1) {
        const d1 = r(2, 9); const d2 = r(2, 9); if (d1 === d2) continue;
        const n1 = r(1, d1 - 1); if (n1 * 2 === d1) continue;
        const n2 = r(1, d2 - 1); if (n2 * 2 === d2) continue;
        // 交换律: each pair may be shown in either order (1/4＋3/4 / 3/4＋1/4).
        const f = rng() < 0.5 ? [n1, d1 - n1, d1] : [d1 - n1, n1, d1];
        const t = rng() < 0.5 ? [n2, d2 - n2, d2] : [d2 - n2, n2, d2];
        const grid = buildH([fracTok(f[0], f[2]), { op: '＋' }, fracTok(f[1], f[2]), { op: '＋' }, fracTok(t[0], t[2]), { op: '＋' }, fracTok(t[1], t[2]), { op: '＝' }, { ans: 2 }], { title: '分数加减混合', text: `${f[0]}/${f[2]} ＋ ${f[1]}/${f[2]} ＋ ${t[0]}/${t[2]} ＋ ${t[1]}/${t[2]}`, answer: '2', help: `先算 ${f[0]}/${f[2]} ＋ ${f[1]}/${f[2]} ＝ 1` });
        if (grid.cols > 16) continue;
        return grid;
      }
    }
  }
  throw new Error('fracMix');
}

// 分数混合运算 (六上·二 分数混合运算(一)(二), the two lessons merged): five
// shapes — integer×frac×frac, ÷ chains turned into multiply-by-the-reciprocal,
// brackets, integer×(1±frac) and the distributive law. Fraction numerators and
// denominators stay ≤ 21, integers ≤ 140; every result is positive, in lowest
// terms, and fits the fraction / mixed-number input. One shape per block, the
// way dec3Four does it: the draws differ a lot in how often they succeed.
function fracChain(rng) {
  const r = R(rng);
  // A value is [n, d], kept reduced; fmtF is for hints, ansOf for the answer.
  const fmtF = ([n, d]) => (d === 1 ? String(n) : n > d ? `${Math.floor(n / d)}又${n % d}/${d}` : `${n}/${d}`);
  const ansOf = ([n, d]) => (d === 1 ? { tok: { ans: n }, text: String(n) } : (() => { const f = fracAns(n, d, true); return { tok: f, text: f.text }; })());
  const proper = (dMax) => { const d = r(2, dMax); const n = r(1, d - 1); return gcd(n, d) === 1 ? [n, d] : null; };
  for (let block = 0; block < 25; block += 1) {
    const form = r(0, 4); // 每块随机定形态，命中率差别大的形态才不会被第一种独占
    for (let g = 0; g < 200; g += 1) {
      let out = null;
      if (form === 0) { // 整数×分数×分数 (12×1/3×3/4)
        const A = r(2, 140);
        const f1 = proper(12); const f2 = proper(12); if (!f1 || !f2) continue;
        const [rn, rd] = reduce(A * f1[0] * f2[0], f1[1] * f2[1]);
        if (rn > 999 || rd > 99) continue;
        out = { toks: [{ n: A }, { op: '×' }, fracTok(...f1), { op: '×' }, fracTok(...f2)], text: `${A} × ${f1[0]}/${f1[1]} × ${f2[0]}/${f2[1]}`, help: `先算 ${A} × ${f1[0]}/${f1[1]} ＝ ${fmtF(reduce(A * f1[0], f1[1]))}`, val: [rn, rd] };
      } else if (form === 1) { // 除法混合，转乘倒数 (12÷4/5÷3/8、3/8÷1/10×5/7)
        if (rng() < 0.5) {
          const A = r(2, 140);
          const f1 = proper(12); const f2 = proper(12); if (!f1 || !f2) continue;
          const [rn, rd] = reduce(A * f1[1] * f2[1], f1[0] * f2[0]);
          if (rn > 999 || rd > 99) continue;
          out = { toks: [{ n: A }, { op: '÷' }, fracTok(...f1), { op: '÷' }, fracTok(...f2)], text: `${A} ÷ ${f1[0]}/${f1[1]} ÷ ${f2[0]}/${f2[1]}`, help: `把 ${f1[0]}/${f1[1]}、${f2[0]}/${f2[1]} 颠倒过来再乘`, val: [rn, rd] };
        } else {
          const f1 = proper(21); const f2 = proper(21); const f3 = proper(12); if (!f1 || !f2 || !f3) continue;
          const [rn, rd] = reduce(f1[0] * f2[1] * f3[0], f1[1] * f2[0] * f3[1]);
          if (rn > 999 || rd > 99) continue;
          out = { toks: [fracTok(...f1), { op: '÷' }, fracTok(...f2), { op: '×' }, fracTok(...f3)], text: `${f1[0]}/${f1[1]} ÷ ${f2[0]}/${f2[1]} × ${f3[0]}/${f3[1]}`, help: `把 ${f2[0]}/${f2[1]} 颠倒过来再乘`, val: [rn, rd] };
        }
      } else if (form === 2) { // 带括号 (4/7×(5/8÷5/14)、2÷(2/5×1/4))
        if (rng() < 0.5) {
          const f1 = proper(12); const f2 = proper(21); const f3 = proper(21); if (!f1 || !f2 || !f3) continue;
          const inner = reduce(f2[0] * f3[1], f2[1] * f3[0]); // f2 ÷ f3
          const [rn, rd] = reduce(f1[0] * inner[0], f1[1] * inner[1]);
          if (rn > 999 || rd > 99) continue;
          out = { toks: [fracTok(...f1), { op: '×' }, { op: '(' }, fracTok(...f2), { op: '÷' }, fracTok(...f3), { op: ')' }], text: `${f1[0]}/${f1[1]} × (${f2[0]}/${f2[1]} ÷ ${f3[0]}/${f3[1]})`, help: `先算括号里的 ${f2[0]}/${f2[1]} ÷ ${f3[0]}/${f3[1]}`, val: [rn, rd] };
        } else {
          const A = r(2, 140);
          const f1 = proper(12); const f2 = proper(12); if (!f1 || !f2) continue;
          const inner = reduce(f1[0] * f2[0], f1[1] * f2[1]);
          const [rn, rd] = reduce(A * inner[1], inner[0]); // A ÷ inner
          if (rn > 999 || rd > 99) continue;
          out = { toks: [{ n: A }, { op: '÷' }, { op: '(' }, fracTok(...f1), { op: '×' }, fracTok(...f2), { op: ')' }], text: `${A} ÷ (${f1[0]}/${f1[1]} × ${f2[0]}/${f2[1]})`, help: `先算括号里的 ${f1[0]}/${f1[1]} × ${f2[0]}/${f2[1]} ＝ ${fmtF(inner)}`, val: [rn, rd] };
        }
      } else if (form === 3) { // 整数×(1±分数) (50×(1+1/5)＝60)
        const f = proper(12); if (!f) continue;
        const k = r(2, 10); const A = f[1] * k; if (A > 140) continue;
        const plus = rng() < 0.5;
        const rn = k * (plus ? f[1] + f[0] : f[1] - f[0]);
        out = { toks: [{ n: A }, { op: '×' }, { op: '(' }, { n: 1 }, { op: plus ? '＋' : '−' }, fracTok(...f), { op: ')' }], text: `${A} × (1${plus ? '＋' : '−'}${f[0]}/${f[1]})`, help: `先算 1 ${plus ? '＋' : '−'} ${f[0]}/${f[1]}`, val: [rn, 1] };
      } else if (rng() < 0.5) { // 分配律：(6/7＋8/21)×21
        const d1 = r(2, 9); const d2 = r(2, 9); if (d1 === d2) continue;
        const L = lcm(d1, d2); if (L > 42) continue;
        const n1 = r(1, d1 - 1); const n2 = r(1, d2 - 1);
        if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1) continue;
        const kk = r(1, 6); const A = L * kk; if (A > 140) continue;
        const S = n1 * (L / d1) + n2 * (L / d2);
        out = { toks: [{ op: '(' }, fracTok(n1, d1), { op: '＋' }, fracTok(n2, d2), { op: ')' }, { op: '×' }, { n: A }], text: `(${n1}/${d1} ＋ ${n2}/${d2}) × ${A}`, help: `先算 ${n1}/${d1} ＋ ${n2}/${d2} ＝ ${fmtF(reduce(S, L))}`, val: [S * kk, 1] };
      } else { // 分配律：5/6×17＋1/6×17，两个分数凑成 1
        const d = r(2, 12); const n1 = r(1, d - 1); if (gcd(n1, d) !== 1) continue; const n2 = d - n1;
        const A = r(2, 99);
        out = { toks: [fracTok(n1, d), { op: '×' }, { n: A }, { op: '＋' }, fracTok(n2, d), { op: '×' }, { n: A }], text: `${n1}/${d} × ${A} ＋ ${n2}/${d} × ${A}`, help: `先算 ${n1}/${d} ＋ ${n2}/${d} ＝ 1`, val: [A, 1] };
      }
      const a = ansOf(out.val);
      const grid = buildH([...out.toks, { op: '＝' }, a.tok], { title: '分数混合', text: out.text, answer: a.text, help: out.help });
      if (grid.cols > 16) continue;
      return grid;
    }
  }
  throw new Error('fracChain');
}

const GEN = {
  compose(rng, { total }) {
    const a = R(rng)(1, total - 1);
    return buildH([{ n: total }, { w: '是' }, { n: a }, { w: '和' }, { ans: total - a }], { title: '几和几', text: `${total}是${a}和`, answer: String(total - a), help: `${a}再加几是${total}` });
  },
  hadd(rng, { a, b, carry, tensToo, maxSum }) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      let x; let y;
      if (tensToo && rng() < 0.3) { x = r(1, 8) * 10; y = r(1, 9 - x / 10) * 10; } else { x = range(a, rng); y = range(b, rng); }
      if (maxSum && x + y > maxSum) continue;
      const c = carries(x, y);
      if (carry === 'none' && c) continue;
      if (carry === 'yes' && !c) continue;
      if (rng() < 0.5 && !tensToo) [x, y] = [y, x];
      const help = carry === 'yes' ? `${x}再加${10 - (x % 10)}凑成10` : null;
      return buildH([{ n: x }, { op: '＋' }, { n: y }, { op: '＝' }, { ans: x + y }], { title: '加法', text: `${x} + ${y}`, answer: String(x + y), help: help || `${x} ＋ ${y}` });
    }
    throw new Error('hadd');
  },
  hsub(rng, { a, b, borrow, tensToo, allowEqual }) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      let x; let y;
      if (tensToo && rng() < 0.3) { x = r(2, 9) * 10; y = r(1, x / 10 - 1) * 10; } else { x = range(a, rng); y = range(b, rng); }
      if (allowEqual ? y > x : y >= x) continue;
      const br = borrows(x, y);
      if (borrow === 'none' && br) continue;
      if (borrow === 'yes' && !br) continue;
      // 破十提示只对一位数减数成立；两位数减数回退为整式。
      const help = borrow === 'yes' && y <= 9 ? `10 − ${y} ＝ ${10 - y}` : `${x} − ${y}`;
      return buildH([{ n: x }, { op: '−' }, { n: y }, { op: '＝' }, { ans: x - y }], { title: '减法', text: `${x} − ${y}`, answer: String(x - y), help });
    }
    throw new Error('hsub');
  },
  add3(rng, { max = 20, min = 1 } = {}) {
    const r = R(rng);
    if (min >= 100) {
      // Three-digit mode (grade 3): the four +- forms come up evenly instead
      // of the 0.6 draw. Chain additions may include one two-digit addend;
      // about 15% of the chain subtractions fix a at 1000 (the textbook's
      // "999+1" anchor, the only 16-column layout in the app).
      for (let g = 0; g < 400; g++) {
        const form = r(0, 3);
        let a; let b; let c; let s1; let s2; let o1; let o2;
        if (form === 0) { // a＋b＋c
          a = r(100, 750); b = r(86, 400); c = r(80, 400);
          if (rng() < 1 / 3) { if (rng() < 0.5) b = r(80, 99); else c = r(80, 99); }
          if (a + b + c > max) continue;
          o1 = '＋'; o2 = '＋'; s1 = a + b; s2 = s1 + c;
        } else if (form === 1) { // a−b−c
          a = rng() < 0.15 ? 1000 : r(400, 999); b = r(86, 400); c = r(80, 400);
          if (a - b - c < 0) continue;
          o1 = '−'; o2 = '−'; s1 = a - b; s2 = s1 - c;
        } else if (form === 2) { // a＋b−c
          a = r(100, 900); b = r(100, 900); c = r(100, 900);
          s1 = a + b; if (s1 - c < 0 || s1 - c > max) continue;
          o1 = '＋'; o2 = '−'; s2 = s1 - c;
        } else { // a−b＋c
          a = r(100, 900); b = r(100, 900); c = r(100, 900);
          s1 = a - b; if (s1 < 0 || s1 + c > max) continue;
          o1 = '−'; o2 = '＋'; s2 = s1 + c;
        }
        return buildH([{ n: a }, { op: o1 }, { n: b }, { op: o2 }, { n: c }, { op: '＝' }, { ans: s2 }], { title: '三个数', text: `${a}${o1}${b}${o2}${c}`, answer: String(s2), help: `先算 ${a} ${o1} ${b} ＝ ${s1}` });
      }
      throw new Error('add3');
    }
    for (let g = 0; g < 400; g++) {
      const a = r(min, max); const b = r(min, max); const c = r(min, max);
      const o1 = rng() < 0.6 ? '＋' : '−'; const o2 = rng() < 0.6 ? '＋' : '−';
      const s1 = o1 === '＋' ? a + b : a - b; if (s1 < 0) continue;
      const s2 = o2 === '＋' ? s1 + c : s1 - c; if (s2 < 0 || s2 > max) continue;
      return buildH([{ n: a }, { op: o1 }, { n: b }, { op: o2 }, { n: c }, { op: '＝' }, { ans: s2 }], { title: '三个数', text: `${a}${o1}${b}${o2}${c}`, answer: String(s2), help: `先算 ${a} ${o1} ${b} ＝ ${s1}` });
    }
    throw new Error('add3');
  },
  kuku(rng, { dans }) {
    const a = pickOf(rng, dans); const b = R(rng)(1, 9);
    return buildH([{ n: a }, { op: '×' }, { n: b }, { op: '＝' }, { ans: a * b }], { title: '乘法', text: `${a} × ${b}`, answer: String(a * b), help: table(a, a * (b - 1)) });
  },
  // Whole tens (and with `hundreds` whole hundreds) times 1-2 digits, shown in
  // either order; the hint splits the tens/hundreds factor.
  mulTens(rng, { hundreds, twoDigit }) {
    const r = R(rng);
    let t; let u;
    if (twoDigit) { t = r(1, 9) * 10; u = r(11, 99); }
    else if (hundreds && rng() < 0.3) { t = r(1, 9) * 100; u = r(2, 9); }
    else { t = r(1, 9) * 10; u = r(2, 9); }
    if (rng() < 0.5) [t, u] = [u, t];
    const big = t % 10 === 0 ? t : u;
    const unit = big % 100 === 0 ? 100 : 10;
    return buildH([{ n: t }, { op: '×' }, { n: u }, { op: '＝' }, { ans: t * u }], { title: '乘法', text: `${t} × ${u}`, answer: String(t * u), help: `${big / unit} × ${big === t ? u : t} 的${unit}倍` });
  },
  // Mental 2-digit × 1-digit (grade 3): the hint splits the tens
  // (12 × 3 ＝ 10 × 3 ＋ 2 × 3).
  hmul(rng, { a, b, maxProd }) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const x = range(a, rng); if (x % 10 === 0) continue;
      const y = range(b, rng);
      if (x * y > maxProd) continue;
      return buildH([{ n: x }, { op: '×' }, { n: y }, { op: '＝' }, { ans: x * y }], { title: '乘法', text: `${x} × ${y}`, answer: String(x * y), help: `${x - (x % 10)} × ${y} ＋ ${x % 10} × ${y}` });
    }
    throw new Error('hmul');
  },
  mul3(rng, { a = [3, 45], b = [2, 18], c = [2, 9], max = 999 } = {}) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const x = range(a, rng); const y = range(b, rng); const z = range(c, rng);
      if (x * y * z > max) continue;
      return buildH([{ n: x }, { op: '×' }, { n: y }, { op: '×' }, { n: z }, { op: '＝' }, { ans: x * y * z }], { title: '连乘', text: `${x} × ${y} × ${z}`, answer: String(x * y * z), help: `先算 ${x} × ${y} ＝ ${x * y}` });
    }
    throw new Error('mul3');
  },
  // Two-step ×/÷ chains (grade 3). Every division step must land on a mental
  // quotient (one digit 2-9, whole tens 10-90 or whole hundreds 100-900:
  // long division sits in grade 4), so the textbook's general-quotient
  // problems (850÷5×3 etc.) are out of scope on purpose.
  muldiv(rng) {
    const r = R(rng);
    const mental = (n) => (n >= 2 && n <= 9) || (n % 10 === 0 && n <= 90) || (n % 100 === 0 && n <= 900);
    const quot = () => [r(2, 9), r(1, 9) * 10, r(1, 9) * 100][r(0, 2)];
    for (let g = 0; g < 400; g++) {
      const form = r(0, 3);
      let toks; let ans; let help;
      if (form === 0) { // a÷b×c
        const b = r(2, 9); const c = r(2, 9); const m = quot();
        if (b * m > 999 || m * c > 999) continue;
        toks = [{ n: b * m }, { op: '÷' }, { n: b }, { op: '×' }, { n: c }]; ans = m * c;
        help = `先算 ${b * m} ÷ ${b} ＝ ${m}`;
      } else if (form === 1) { // a×b÷c
        const a = r(11, 99); const b = r(2, 10); const p = a * b;
        if (b !== 10 && a % 10 !== 0 && p > 98) continue;
        const cs = [2, 3, 4, 5, 6, 7, 8, 9].filter((c) => c !== b && p % c === 0 && mental(p / c));
        if (!cs.length) continue;
        const c = pickOf(rng, cs);
        toks = [{ n: a }, { op: '×' }, { n: b }, { op: '÷' }, { n: c }]; ans = p / c;
        help = `先算 ${a} × ${b} ＝ ${p}`;
      } else if (form === 2) { // a÷b÷c
        const b = r(2, 9); const c = r(2, 9); const k = quot();
        if (!mental(c * k) || b * c * k > 999) continue;
        toks = [{ n: b * c * k }, { op: '÷' }, { n: b }, { op: '÷' }, { n: c }]; ans = k;
        help = `先算 ${b * c * k} ÷ ${b} ＝ ${c * k}`;
      } else { // a÷(b×c)
        const b = r(2, 9); const c = r(2, 9); const k = quot();
        if (b * c * k > 999) continue;
        toks = [{ n: b * c * k }, { op: '÷' }, { op: '(' }, { n: b }, { op: '×' }, { n: c }, { op: ')' }]; ans = k;
        help = `先算 ${b} × ${c} ＝ ${b * c}`;
      }
      const text = toks.map((t) => t.n ?? t.op).join('');
      return buildH([...toks, { op: '＝' }, { ans }], { title: '乘除两步', text, answer: String(ans), help });
    }
    throw new Error('muldiv');
  },
  // Whole hundreds or whole tens add/sub (grade 2 skill): about half of each
  // form; sums stay within 2000 and subtraction takes the larger number first.
  tensCalc(rng) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const add = rng() < 0.5;
      let a; let b;
      if (rng() < 0.5) { a = r(2, 18) * 100; b = r(1, 9) * 100; } else { a = r(12, 99) * 10; b = r(1, 45) * 10; }
      if (add ? a + b > 2000 : b >= a) continue;
      const o = add ? '＋' : '−';
      return buildH([{ n: a }, { op: o }, { n: b }, { op: '＝' }, { ans: add ? a + b : a - b }], { title: add ? '加法' : '减法', text: `${a} ${add ? '+' : '−'} ${b}`, answer: String(add ? a + b : a - b), help: `${a} ${o} ${b}` });
    }
    throw new Error('tensCalc');
  },
  fracOf(rng, { dens }) {
    const d = pickOf(rng, dens); const q = R(rng)(1, 9);
    return buildH([{ n: q * d }, { w: '的' }, fracTok(1, d), { w: '是' }, { ans: q }], { title: '分数', text: `${q * d}的1/${d}`, answer: String(q), help: `把${q * d}平均分成${d}份` });
  },
  div(rng) {
    const d = R(rng)(2, 9); const q = R(rng)(1, 9);
    return buildH([{ n: q * d }, { op: '÷' }, { n: d }, { op: '＝' }, { ans: q }], { title: '除法', text: `${q * d} ÷ ${d}`, answer: String(q), help: table(d, q * d) });
  },
  divRem(rng) {
    const d = R(rng)(2, 9); const q = R(rng)(1, 9); const rem = R(rng)(1, d - 1);
    const D = q * d + rem;
    return buildH([{ n: D }, { op: '÷' }, { n: d }, { op: '＝' }, { ans: q, label: '商' }, { w: '余' }, { ans: rem, label: '余数' }], { title: '有余数的除法', text: `${D} ÷ ${d}`, answer: `${q} 余 ${rem}`, help: table(d, D) });
  },
  // With `big`, two 3-digit forms join the two 2-digit ones (丰收了 of the
  // textbook): hundreds-tens ÷ 1 digit = whole tens, whole hundreds/thousands
  // hundreds ÷ 1 digit = whole hundreds. Every form divides exactly.
  divTens(rng, { big }) {
    const r = R(rng);
    for (let g = 0; g < 200; g++) {
      const d = r(2, 9);
      const form = big ? r(0, 3) : r(0, 1);
      if (form === 0) { // whole tens ÷ 1 digit = whole tens (2 digits)
        const q = r(1, 9); if (q * d * 10 > 99) continue;
        return buildH([{ n: q * d * 10 }, { op: '÷' }, { n: d }, { op: '＝' }, { ans: q * 10 }], { title: '除法', text: `${q * d * 10} ÷ ${d}`, answer: String(q * 10), help: `${q * d} ÷ ${d} 的10倍` });
      }
      if (form === 2) { // hundreds-tens / whole hundreds ÷ 1 digit = whole tens
        const q = r(2, 9); if (q * d < 10) continue;
        return buildH([{ n: q * d * 10 }, { op: '÷' }, { n: d }, { op: '＝' }, { ans: q * 10 }], { title: '除法', text: `${q * d * 10} ÷ ${d}`, answer: String(q * 10), help: `${q * d} ÷ ${d} 的10倍` });
      }
      if (form === 3) { // whole hundreds / thousands-hundreds ÷ 1 digit = whole hundreds
        const h = r(1, 9);
        return buildH([{ n: h * d * 100 }, { op: '÷' }, { n: d }, { op: '＝' }, { ans: h * 100 }], { title: '除法', text: `${h * d * 100} ÷ ${d}`, answer: String(h * 100), help: `${h * d} ÷ ${d} 的100倍` });
      }
      const t = r(1, 4); const o = r(1, 4); const D = (t * 10 + o) * d; if (D > 99 || Math.floor(D / 10) % d || (D % 10) % d) continue;
      return buildH([{ n: D }, { op: '÷' }, { n: d }, { op: '＝' }, { ans: D / d }], { title: '除法', text: `${D} ÷ ${d}`, answer: String(D / d), help: `${Math.floor(D / 10) * 10} ÷ ${d} 和 ${D % 10} ÷ ${d}` });
    }
    throw new Error('divTens');
  },
  vadd(rng, { da, db, carry, maxDigits, minSum }) {
    const r = R(rng);
    for (let g = 0; g < 600; g++) {
      const a = nDigit(r, range(da, rng)); const b = nDigit(r, range(db, rng));
      const s = a + b; const c = carries(a, b);
      if (String(s).length > maxDigits) continue;
      if (minSum && s < minSum) continue;
      if (carry === 'none' && c) continue;
      if (carry === 'some' && !c) continue;
      if (carry === 'many' && c < 2) continue;
      return buildAdd(a, b);
    }
    throw new Error('vadd');
  },
  vsub(rng, { da, db, borrow, aMax }) {
    const r = R(rng);
    for (let g = 0; g < 800; g++) {
      let a = nDigit(r, range(da, rng)); const b = nDigit(r, range(db, rng));
      if (borrow === 'zero' && rng() < 0.6) a = Math.floor(a / 100) * 100 + r(0, 9);
      if (aMax && a > aMax) continue;
      if (b >= a) continue;
      const br = borrows(a, b);
      if (borrow === 'none' && br) continue;
      if (borrow === 'some' && !br) continue;
      if (borrow === 'zero' && !(br >= 2 && (hasZeroBorrow(a, b) || rng() < 0.3))) continue;
      return buildSub(a, b);
    }
    throw new Error('vsub');
  },
  vmul(rng, { da, db, pa = 0, pb = 0, aMax, aEnd, bEnd, subOne }) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const a = nDigit(r, range(da, rng)); const b = db === 1 ? r(2, 9) : nDigit(r, db);
      // aMax is a replacing upper bound on the multiplicand; aEnd: 'zero'
      // requires it to end in 0 (末尾有0的乘法), otherwise it must not. With
      // bEnd the two endings split about 50/50: half keep a ending in 0 with
      // b free (460×23), the rest have only b ending in 0 (632×50).
      if (aEnd ? (bEnd && rng() >= 0.5 ? a % 10 === 0 || b % 10 !== 0 : a % 10 !== 0)
               : a % 10 === 0 || (db > 1 && b % 10 === 0)) continue;
      if (aMax && a > aMax) continue;
      const P = pa + pb; const prod = a * b;
      // subOne lets the product drop below 1 (0.2 × 4 ＝ 0.8); its leading 0
      // is typed, and products ending in 0 (1.0) stay excluded.
      if (P && (prod % 10 === 0 || (prod < 10 ** P && !subOne))) continue;
      return buildMul(a, b, pa, pb);
    }
    throw new Error('vmul');
  },
  vdiv(rng, { dd, ds, dsMax }) {
    const r = R(rng);
    for (let g = 0; g < 600; g++) {
      const d = ds === 1 ? r(2, 9) : r(11, dsMax || 49);
      const D = nDigit(r, dd);
      if (D < d * 2) continue;
      const q = Math.floor(D / d);
      if (ds === 2 && dd === 2 && q > 9) continue;
      if (String(q).length < dd - ds && rng() < 0.5) continue;
      return buildDiv(D, d);
    }
    throw new Error('vdiv');
  },
  vdec(rng, { op, places, aMax, bMax, intMinuend }) {
    const r = R(rng);
    const o = op === 'addsub' ? (rng() < 0.5 ? 'add' : 'sub') : op;
    for (let g = 0; g < 600; g++) {
      const pa = places; const pb = places === 2 && rng() < 0.4 ? 1 : places;
      // aMax/bMax are replacing upper bounds on the scaled integers (redraw
      // when exceeded); the defaults keep the original hard-coded ranges.
      const aLim = aMax || 10 ** (pa + 1) * 3 - 1; const bLim = bMax || 10 ** (pb + 1) * 2 - 1;
      // intMinuend: about a quarter of the subtractions take a whole-number
      // minuend, shown padded as X.0 (寄书 / 练习六 of the textbook).
      const aInt = o === 'sub' && intMinuend && rng() < 0.25;
      const a = aInt ? r(2, 50) * 10 ** pa : r(10 ** pa + 1, aLim); const b = r(10 ** pb * 0 + 1, bLim);
      if (b % 10 === 0 || (a % 10 === 0 && !aInt)) continue;
      const P = Math.max(pa, pb);
      const A = a * 10 ** (P - pa); const B = b * 10 ** (P - pb);
      if (o === 'add') { if ((A + B) % 10 === 0) continue; return buildAdd(a, b, pa, pb); }
      if (A <= B || (A - B) % 10 === 0 || pb > pa) continue;
      return buildSub(a, b, pa, pb);
    }
    throw new Error('vdec');
  },
  // 小数除以整数 (grade 5). Three shapes of 精打细算 / 打扫卫生, drawn about
  // evenly: ① divisor 2-9, one-decimal quotient whose whole part reaches two
  // digits (57.5÷5＝11.5, 77.4÷6＝12.9); ② two-digit divisor, one-decimal
  // quotient (28.8÷24＝1.2, 96.6÷42＝2.3); ③ a zero is brought down after the
  // remainder, so the quotient has 2-3 decimals and the dividend may be a
  // whole number (18.9÷6＝3.15, 0.63÷9＝0.07, 4÷25＝0.16, 19÷20＝0.95).
  // Every shape divides exactly and never ends in 0.
  decDivInt(rng) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const form = r(0, 2);
      let D; let d; let q; // the dividend, divisor and quotient as strings
      if (form < 2) {
        // ①② scaled by 10: the quotient always has exactly one decimal and the
        // dividend stays under 100 (D1 ≤ 999), so q1 is drawn from d's range.
        d = form === 0 ? r(2, 9) : r(11, 90);
        const qMax = Math.floor(999 / d);
        if (qMax < 11) continue;
        const q1 = r(11, qMax); if (q1 % 10 === 0 || (q1 * d) % 10 === 0) continue;
        D = decMin(q1 * d, 1); q = decMin(q1, 1);
      } else if (rng() < 0.35) {
        // ③ with a whole dividend: 4÷25＝0.16, 19÷20＝0.95, 18÷24＝0.75. The
        // quotient is built back from it, so the division stays exact.
        const Dd = r(2, 99);
        d = rng() < 0.5 ? r(2, 9) : r(11, 99);
        if (100 * Dd % d !== 0) continue;
        const Q = 100 * Dd / d;
        if (Q % 10 === 0) continue;
        D = String(Dd); q = decMin(Q, 2);
      } else {
        // ③ scaled by 10^pc: 2 or 3 decimals in the quotient. The divisor is
        // drawn first so the quotient can be drawn inside the range that keeps
        // the dividend below 100, as in 打扫卫生.
        const pc = r(0, 1) ? 3 : 2;
        d = rng() < 0.5 ? r(2, 9) : r(11, 99);
        const qMax = Math.floor(9990 / d);
        if (qMax < 2) continue;
        const Q = r(2, qMax);
        if (pc === 3 ? Q % 100 === 0 : Q % 10 === 0) continue;
        D = decMin(d * Q * 10 ** (3 - pc), 3); q = decMin(Q, pc);
      }
      const grid = buildH([{ n: D }, { op: '÷' }, { n: d }, { op: '＝' }, { ans: q }], { title: '小数除法', text: `${D} ÷ ${d}`, answer: q, help: form === 2 ? `余数后面补 0 再除` : `想一想 ${D} ÷ ${d}` });
      if (grid.cols > 16) continue;
      return grid;
    }
    throw new Error('decDivInt');
  },
  // 小数除以小数 (grade 5). One shape, as wide as the textbook: the divisor is
  // a one- or two-decimal number or a two-digit integer, the dividend a whole
  // number or a decimal of up to 3 places, and the quotient a positive integer
  // (5.1÷0.3＝17, 5.28÷0.03＝176, 32÷0.08＝400) or a decimal of 1-2 places
  // (54÷7.2＝7.5, 0.12÷0.25＝0.48, 27.9÷45＝0.62). Only exact divisions:
  // repeating quotients are out of scope (循环小数).
  decDivDec(rng) {
    const r = R(rng);
    for (let g = 0; g < 600; g++) {
      // Divisor: 0 one-decimal, 1 two-decimal, 2 two-digit integer.
      const df = r(0, 2);
      const dp = df === 1 ? 2 : df === 0 ? 1 : 0;
      const dv = df === 1 ? r(3, 999) : df === 0 ? r(2, 99) : r(10, 99);
      if (dp && dv % 10 === 0) continue;
      // Quotient: 0 whole number, 1 one decimal, 2 two decimals.
      const qp = r(0, 2);
      const qv = qp === 0 ? r(2, 999) : r(2, 9999);
      if (qp && qv % 10 === 0) continue;
      // Dividend = divisor × quotient, exact to at most 3 decimal places.
      const scale = dp + qp; let v = dv * qv; let sc = scale;
      while (sc > 3 && v % 10 === 0) { v /= 10; sc -= 1; }
      // decMin already drops the trailing zeros, so a whole dividend like
      // 7÷0.35＝20 or 32÷0.08＝400 comes out right and never as 7.00.
      if (sc > 3) continue;
      // The dividend is a whole number or a 1-2 decimal one (5.28÷1.2 and
      // 0.12÷0.25 come out that way because v ends in 0 there), never 3.
      const D = decMin(v, sc);
      if (D.includes('.') && D.split('.')[1].length > 2) continue;
      if (Number(D) > 999) continue;
      const q = decMin(qv, qp); const d = decMin(dv, dp);
      // Both sides are scaled by one and the same power of 10, which is what
      // 谁打电话的时间长 does; an integer divisor needs no scaling.
      const f = Math.max(sc, dp); const A = v * 10 ** (f - sc); const B = dv * 10 ** (f - dp);
      const help = dp === 0 ? '和整数除法一样' : (A <= 9999 && B <= 9999 ? `和 ${A} ÷ ${B} 一样` : `两个数的小数点同时移动 ${f} 位`);
      const grid = buildH([{ n: D }, { op: '÷' }, { n: d }, { op: '＝' }, { ans: q }], { title: '小数除法', text: `${D} ÷ ${d}`, answer: q, help });
      if (grid.cols > 16) continue;
      return grid;
    }
    throw new Error('decDivDec');
  },
  gcdlcm(rng, { kind }) {
    const r = R(rng);
    for (let g = 0; g < 200; g++) {
      const k = r(2, 9); const a = k * r(1, 6); const b = k * r(1, 6);
      if (a === b || a < 4 || b < 4) continue;
      const ans = kind === 'gcd' ? gcd(a, b) : lcm(a, b);
      if (ans === 1 || ans > 99) continue;
      const w = kind === 'gcd' ? '最大公约数' : '最小公倍数';
      return buildH([{ n: a }, { w: '和' }, { n: b }, { w: '的' }, { br: true }, { w }, { op: '＝' }, { ans }], { title: w, text: `${a}和${b}的${w}`, answer: String(ans), help: kind === 'gcd' ? `都能整除的数` : `${Math.max(a, b)}的倍数` });
    }
    throw new Error('gcdlcm');
  },
  order(rng) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const a = r(2, 9); const b = r(2, 9); const c = r(2, 9);
      // Forms 0-3 are the original set; 4-5 add a multiplication plus/minus a
      // division (22×3＋24÷4), 6 the bracket of 买文具: x−[b×(c−d)] and
      // x÷[b×(c−d)] (9÷[3×(5−2)]＝1, 288−[8×(26−14)]).
      const form = r(0, 6);
      let toks; let ans; let help;
      if (form === 0) { ans = a + b * c; toks = [{ n: a }, { op: '＋' }, { n: b }, { op: '×' }, { n: c }]; help = `先算 ${b} × ${c}`; }
      else if (form === 1) { ans = a * (b + c); toks = [{ n: a }, { op: '×' }, { op: '(' }, { n: b }, { op: '＋' }, { n: c }, { op: ')' }]; help = `先算 ${b} ＋ ${c}`; }
      else if (form === 2) { if (a <= b) continue; ans = (a - b) * c; toks = [{ op: '(' }, { n: a }, { op: '−' }, { n: b }, { op: ')' }, { op: '×' }, { n: c }]; help = `先算 ${a} − ${b}`; }
      else if (form === 3) { const bc = b * c; const x = r(bc + 1, bc + 30); ans = x - bc; toks = [{ n: x }, { op: '−' }, { n: b }, { op: '×' }, { n: c }]; help = `先算 ${b} × ${c}`; }
      else if (form <= 5) {
        const d = r(2, 9); const q = r(2, 9); const cd = q * d;
        if (form === 4) { ans = a * b + q; toks = [{ n: a }, { op: '×' }, { n: b }, { op: '＋' }, { n: cd }, { op: '÷' }, { n: d }]; }
        else { if (a * b <= q) continue; ans = a * b - q; toks = [{ n: a }, { op: '×' }, { n: b }, { op: '−' }, { n: cd }, { op: '÷' }, { n: d }]; }
        help = `先算 ${a} × ${b} ＝ ${a * b}，${cd} ÷ ${d} ＝ ${q}`;
      } else {
        if (c < 3) continue;
        const d = r(2, c - 1); const inner = b * (c - d);
        const help = `先算 ${c} − ${d} ＝ ${c - d}，再算 ${b} × ${c - d} ＝ ${inner}`;
        if (rng() < 0.5) { const x = r(inner + 1, inner + 30); ans = x - inner; toks = [{ n: x }, { op: '−' }, { op: '[' }, { n: b }, { op: '×' }, { op: '(' }, { n: c }, { op: '−' }, { n: d }, { op: ')' }, { op: ']' }]; }
        else { const k = r(1, 9); ans = k; toks = [{ n: inner * k }, { op: '÷' }, { op: '[' }, { n: b }, { op: '×' }, { op: '(' }, { n: c }, { op: '−' }, { n: d }, { op: ')' }, { op: ']' }]; }
      }
      if (ans <= 0 || ans > 999) continue;
      const grid = buildH([...toks, { op: '＝' }, { ans }], { title: '运算顺序', text: toks.map((t) => t.n ?? t.op).join(''), answer: String(ans), help });
      if (grid.cols > 16) continue;
      return grid;
    }
    throw new Error('order');
  },
  // Rounding (近似数): the target place runs from tens up to the hundred
  // millions (18000≈2万, 233482≈20万, 95793065≈1亿). nm names the target
  // place, help names the place below it (万位题显示「千位四舍五入」) — two
  // different arrays on purpose. The 亿 form draws from 1.05亿–1.99亿 so the
  // rounded result keeps 9 digits (结果位数不增加).
  // dec: keep two decimals of a 3-5 decimal number (五上·一 除得尽吗 /
  // 人民币兑换). The thousandths digit is not 0, so the rounding really moves
  // the number, and the rounded result never ends in 0.
  round(rng, { dec } = {}) {
    const r = R(rng);
    const nm = { 1: '十', 2: '百', 3: '千', 4: '万', 5: '十万', 8: '亿' };
    const below = { 1: '个', 2: '十', 3: '百', 4: '千', 5: '万', 8: '千万' };
    for (let g = 0; g < 400; g++) {
      if (dec) {
        const p = r(3, 5);
        const n = r(10 ** p, 10 ** (p + 3) - 1);
        if (n % 10 === 0 || Math.floor(n / 10 ** (p - 3)) % 10 === 0) continue; // last and thousandths
        const A = Math.round(n / 10 ** (p - 2)) * 10 ** (p - 2);
        if ((A / 10 ** (p - 2)) % 10 === 0) continue; // the answer ends in 0
        const ans = decMin(A, p);
        return buildH([{ n: decMin(n, p) }, { w: '的' }, { br: true }, { w: '保留两位小数' }, { op: '→' }, { ans }], { title: '近似数', text: `${decMin(n, p)}保留两位小数`, answer: ans, help: '看千分位四舍五入' });
      }
      const pl = pickOf(rng, [1, 2, 3, 4, 5, 8]);
      const lo = pl === 8 ? 105000000 : pl === 5 ? 100001 : pl === 4 ? 10001 : pl === 3 ? 10001 : 1001;
      const hi = pl === 8 ? 199000000 : pl === 5 ? 999999 : pl === 4 ? 999999 : 99999;
      const n = r(lo, hi); const len = String(n).length;
      const unit = 10 ** pl; const ans = Math.round(n / unit) * unit;
      if (String(ans).length > len) continue;
      return buildH([{ n }, { w: '的' }, { br: true }, { w: `精确到${nm[pl]}位` }, { op: '→' }, { ans }], { title: '近似数', text: `${n}精确到${nm[pl]}位的近似数`, answer: String(ans), help: `${below[pl]}位四舍五入` });
    }
    throw new Error('round');
  },
  // 加法凑整: one pair of addends makes a whole hundred, shown apart
  // (57＋288＋43＝388, 加法结合律 of the textbook).
  convAdd(rng) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const S = r(1, 9) * 100;
      const p = r(11, S - 11);
      const t = r(11, 999 - S);
      if (p % 10 === 0 || t % 10 === 0) continue;
      const first = rng() < 0.5 ? p : S - p;
      const grid = buildH([{ n: first }, { op: '＋' }, { n: t }, { op: '＋' }, { n: S - first }, { op: '＝' }, { ans: S + t }], { title: '凑整', text: `${first}＋${t}＋${S - first}`, answer: String(S + t), help: `${first} ＋ ${S - first} ＝ ${S}` });
      if (grid.cols > 16) continue;
      return grid;
    }
    throw new Error('convAdd');
  },
  // 乘法凑整: pairing products (125×9×8), the distributive law in its add
  // (34×72＋34×28) and subtract (206×14−6×14) forms, and the ×99 trick
  // (13×99 ＝ 13×100−13). All results are positive.
  convMul(rng) {
    const r = R(rng);
    const pairs = [[25, 4], [4, 25], [125, 8], [8, 125], [50, 2], [2, 50], [50, 4], [4, 50], [50, 6], [6, 50], [25, 8], [8, 25], [125, 4], [4, 125]];
    for (let g = 0; g < 400; g++) {
      const form = r(0, 3);
      let toks; let ans; let help;
      if (form === 0) {
        const [p1, p2] = pickOf(rng, pairs); const a = r(3, 99);
        toks = rng() < 0.5 ? [{ n: p1 }, { op: '×' }, { n: a }, { op: '×' }, { n: p2 }] : [{ n: a }, { op: '×' }, { n: p1 }, { op: '×' }, { n: p2 }];
        ans = a * p1 * p2; help = `${p1} × ${p2} ＝ ${p1 * p2}`;
      } else if (form === 1) {
        const S = r(1, 9) * 100; const a = S === 100 ? r(2, 99) : r(2, 9); const b = r(11, S - 11);
        if (b % 10 === 0) continue;
        toks = [{ n: a }, { op: '×' }, { n: b }, { op: '＋' }, { n: a }, { op: '×' }, { n: S - b }];
        ans = a * S; help = `${b} ＋ ${S - b} ＝ ${S}`;
      } else if (form === 2) {
        const diff = pickOf(rng, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
        const y = r(2, 9); const b = r(11, 99);
        toks = [{ n: y + diff }, { op: '×' }, { n: b }, { op: '−' }, { n: y }, { op: '×' }, { n: b }];
        ans = diff * b; help = `${y + diff} − ${y} ＝ ${diff}`;
      } else {
        const a = r(11, 99);
        toks = [{ n: a }, { op: '×' }, { n: 99 }];
        ans = a * 99; help = `99 ＝ 100 − 1`;
      }
      const grid = buildH([...toks, { op: '＝' }, { ans }], { title: '凑整', text: toks.map((t) => t.n ?? t.op).join(''), answer: String(ans), help });
      if (grid.cols > 16) continue;
      return grid;
    }
    throw new Error('convMul');
  },
  // Solving equations (解方程 of the textbook): the equation with x＝… on a
  // second row, as in `letter`. One step: x±a＝b, a＋x＝b, x×a＝b, x÷a＝b,
  // plus a one-decimal sub-form (x−12.3＝3.8). Two steps: a×x±b＝c, a＋b×x＝c.
  // With `frac` (grade 6) the coefficient carries a fraction, a percent or a
  // one-decimal number; the coefficient is drawn first and x is built back, so
  // x stays a positive integer (x−1/7x=12、60%x=30、55%x−45%x=620、x−0.8x=22).
  // Answers are positive; equations with a decimal divisor are out of scope
  // (decimal division sits in grade 5).
  eq(rng, { twoStep, frac } = {}) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      let toks; let x; let help; let text;
      if (frac) {
        const form = r(0, 6);
        if (form === 0) { // x−(a/b)x＝C
          const d = r(2, 9); const a = r(1, d - 1); if (gcd(a, d) !== 1) continue;
          const k = r(2, 20); x = d * k;
          const C = k * (d - a);
          toks = [{ n: 'x' }, { op: '−' }, fracTok(a, d), { n: 'x' }, { op: '＝' }, { n: C }];
          text = `x−${a}/${d}x＝${C}`; help = `1 − ${a}/${d} ＝ ${d - a}/${d}`;
        } else if (form === 1) { // (a/b)x＋(c/d)x＝C
          const d1 = r(2, 9); const a = r(1, d1 - 1); if (gcd(a, d1) !== 1) continue;
          const d2 = r(2, 9); const c = r(1, d2 - 1); if (gcd(c, d2) !== 1) continue;
          const L = lcm(d1, d2); if (L > 36) continue;
          const kk = r(1, 12); x = L * kk;
          const S = a * (L / d1) + c * (L / d2);
          const C = S * kk; if (C > 999) continue;
          const [rn, rd] = reduce(S, L);
          toks = [fracTok(a, d1), { n: 'x' }, { op: '＋' }, fracTok(c, d2), { n: 'x' }, { op: '＝' }, { n: C }];
          text = `${a}/${d1}x＋${c}/${d2}x＝${C}`; help = `${a}/${d1} ＋ ${c}/${d2} ＝ ${rd === 1 ? rn : `${rn}/${rd}`}`;
        } else if (form === 2) { // a＋(b/c)x＝C
          const c = r(2, 9); const b = r(1, c - 1); if (gcd(b, c) !== 1) continue;
          const A = r(2, 50); const kk = r(2, 20); x = c * kk;
          const C = A + b * kk; if (C > 999) continue;
          toks = [{ n: A }, { op: '＋' }, fracTok(b, c), { n: 'x' }, { op: '＝' }, { n: C }];
          text = `${A}＋${b}/${c}x＝${C}`; help = `两边先同时减 ${A}，再乘 ${c}/${b}`;
        } else if (form === 3) { // p%x＝C (60%x=30)
          const p = pickOf(rng, [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90]);
          const g2 = gcd(p, 100); const s = 100 / g2;
          const kmax = Math.min(Math.floor(999 * g2 / p), Math.floor(9990 / s));
          if (kmax < 2) continue;
          const kk = r(2, kmax); x = s * kk;
          const C = (kk * p) / g2;
          toks = [{ n: p }, { op: '%' }, { n: 'x' }, { op: '＝' }, { n: C }];
          text = `${p}%x＝${C}`; help = `${p}% ＝ ${decMin(p, 2)}`;
        } else if (form === 4) { // x±p%x＝C，含 12.5% 一类 (x+12.5%x=18)
          const v = rng() < 0.5 ? pickOf(rng, [125, 375, 625, 875]) : pickOf(rng, [5, 10, 20, 25, 40, 50, 75]);
          const [num, den] = reduce(v, 1000);
          const plus = rng() < 0.5;
          const den2 = plus ? den + num : den - num;
          const hi = Math.min(Math.floor(9990 / den), Math.floor(999 / den2));
          if (hi < 1) continue;
          const kk = r(1, hi); x = den * kk;
          const C = kk * den2;
          const ps = decMin(v, 1);
          toks = [{ n: 'x' }, { op: plus ? '＋' : '−' }, { n: ps }, { op: '%' }, { n: 'x' }, { op: '＝' }, { n: C }];
          text = `x${plus ? '＋' : '−'}${ps}%x＝${C}`; help = `${ps}% ＝ ${num}/${den}`;
        } else if (form === 5) { // p%x−q%x＝C (55%x−45%x=620)
          const p = pickOf(rng, [10, 15, 20, 25, 30, 40, 45, 50, 55, 60, 70, 75, 80, 90]);
          const q = pickOf(rng, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 65, 70, 80]);
          if (p <= q) continue;
          const df = p - q; const g2 = gcd(df, 100); const s = 100 / g2;
          const kmax = Math.min(Math.floor(9990 / s), Math.floor(999 * g2 / df));
          if (kmax < 2) continue;
          const kk = r(2, kmax); x = s * kk;
          const C = (kk * df) / g2;
          toks = [{ n: p }, { op: '%' }, { n: 'x' }, { op: '−' }, { n: q }, { op: '%' }, { n: 'x' }, { op: '＝' }, { n: C }];
          text = `${p}%x−${q}%x＝${C}`; help = `${p}% − ${q}% ＝ ${df}%`;
        } else { // x−0.8x 型小数系数 (x−0.8x=22)
          const v = r(2, 9);
          const sub = 10 - v; const g2 = gcd(sub, 10); const s = 10 / g2;
          const kmax = Math.min(Math.floor(9990 / s), Math.floor(999 * g2 / sub));
          if (kmax < 2) continue;
          const kk = r(2, kmax); x = s * kk;
          const C = (kk * sub) / g2;
          toks = [{ n: 'x' }, { op: '−' }, { n: decStr(v, 1) }, { n: 'x' }, { op: '＝' }, { n: C }];
          text = `x−${decStr(v, 1)}x＝${C}`; help = `1 − ${decStr(v, 1)} ＝ ${decMin(sub, 1)}`;
        }
      } else if (!twoStep) {
        const form = r(0, 5);
        if (form === 0) {
          const a = r(2, 50); const u = r(2, 50);
          x = u; toks = [{ n: 'x' }, { op: '＋' }, { n: a }, { op: '＝' }, { n: u + a }]; help = `两边同时减 ${a}`;
        } else if (form === 1) {
          const a = r(2, 50); const b = r(2, 50);
          x = a + b; toks = [{ n: 'x' }, { op: '−' }, { n: a }, { op: '＝' }, { n: b }]; help = `两边同时加 ${a}`;
        } else if (form === 2) {
          const a = r(2, 50); const u = r(2, 50);
          x = u; toks = [{ n: a }, { op: '＋' }, { n: 'x' }, { op: '＝' }, { n: a + u }]; help = `两边同时减 ${a}`;
        } else if (form === 3) {
          const a = r(2, 9); x = r(2, 99);
          toks = [{ n: 'x' }, { op: '×' }, { n: a }, { op: '＝' }, { n: x * a }]; help = `两边同时除以 ${a}`;
        } else if (form === 4) {
          const a = r(2, 52); const q = r(2, 9);
          x = a * q; toks = [{ n: 'x' }, { op: '÷' }, { n: a }, { op: '＝' }, { n: q }]; help = `两边同时乘 ${a}`;
        } else {
          const sub = rng() < 0.5;
          const a = r(21, 199); const xv = r(sub ? a + 11 : 11, 999);
          if (a % 10 === 0 || xv % 10 === 0 || (sub ? xv - a : xv + a) % 10 === 0) continue;
          toks = [{ n: 'x' }, { op: sub ? '−' : '＋' }, { n: decStr(a, 1) }, { op: '＝' }, { n: decStr(sub ? xv - a : xv + a, 1) }];
          x = decStr(xv, 1);
          help = `两边同时${sub ? '加' : '减'} ${decStr(a, 1)}`;
        }
      } else {
        const form = r(0, 2);
        const a = r(2, 9); x = r(2, 99); const p = a * x;
        if (form === 0) {
          const b = r(2, Math.min(200, 999 - p));
          toks = [{ n: a }, { op: '×' }, { n: 'x' }, { op: '＋' }, { n: b }, { op: '＝' }, { n: p + b }]; help = `两边先同时减 ${b}，再同时除以 ${a}`;
        } else if (form === 1) {
          const b = r(2, p - 2);
          toks = [{ n: a }, { op: '×' }, { n: 'x' }, { op: '−' }, { n: b }, { op: '＝' }, { n: p - b }]; help = `两边先同时加 ${b}，再同时除以 ${a}`;
        } else {
          const b = r(2, Math.min(300, 999 - p));
          toks = [{ n: b }, { op: '＋' }, { n: a }, { op: '×' }, { n: 'x' }, { op: '＝' }, { n: p + b }]; help = `两边先同时减 ${b}，再同时除以 ${a}`;
        }
      }
      const grid = buildH([...toks, { br: true }, { n: 'x' }, { op: '＝' }, { ans: x }], { title: '解方程', text: text || toks.map((t) => t.n ?? t.op).join(''), answer: String(x), help });
      if (grid.cols > 16) continue;
      return grid;
    }
    throw new Error('eq');
  },
  // 小数加减混合 (歌手大赛): five shapes over 1-2 place decimals and whole
  // numbers, positive results without trailing zeros (9.43−(8.65＋0.40),
  // 5−(4.19−2.83)). With `four` (grade 5) the seven ×/÷ shapes of 调查
  // 「生活垃圾」 replace them; see dec3Four.
  dec3(rng, { four } = {}) {
    if (four) return dec3Four(rng);
    const r = R(rng);
    const hdec = (v) => { let s = decStr(v, 2); while (s.endsWith('0') && s.includes('.')) s = s.slice(0, -1); return s.endsWith('.') ? s.slice(0, -1) : s; };
    const term = () => {
      const k = rng();
      if (k < 0.2) { const n = r(2, 15); return { s: String(n), v: n * 100 }; }
      if (k < 0.55) { const n = r(11, 99); return { s: decStr(n, 1), v: n * 10, z: n % 10 === 0 }; }
      const n = r(11, 999); return { s: decStr(n, 2), v: n, z: n % 10 === 0 };
    };
    for (let g = 0; g < 600; g++) {
      const A = term(); const B = term(); const C = term();
      if (A.z || B.z || C.z) continue;
      const form = r(0, 4);
      let toks; let res; let help;
      if (form === 0) { res = A.v + B.v - C.v; toks = [{ n: A.s }, { op: '＋' }, { n: B.s }, { op: '−' }, { n: C.s }]; help = `先算 ${A.s} ＋ ${B.s} ＝ ${hdec(A.v + B.v)}`; }
      else if (form === 1) { if (A.v <= B.v) continue; res = A.v - B.v + C.v; toks = [{ n: A.s }, { op: '−' }, { n: B.s }, { op: '＋' }, { n: C.s }]; help = `先算 ${A.s} − ${B.s} ＝ ${hdec(A.v - B.v)}`; }
      else if (form === 2) { res = A.v - B.v - C.v; toks = [{ n: A.s }, { op: '−' }, { op: '(' }, { n: B.s }, { op: '＋' }, { n: C.s }, { op: ')' }]; help = `先算括号里的 ${B.s} ＋ ${C.s} ＝ ${hdec(B.v + C.v)}`; }
      else if (form === 3) { if (B.v <= C.v) continue; res = A.v - B.v + C.v; toks = [{ n: A.s }, { op: '−' }, { op: '(' }, { n: B.s }, { op: '−' }, { n: C.s }, { op: ')' }]; help = `先算括号里的 ${B.s} − ${C.s} ＝ ${hdec(B.v - C.v)}`; }
      else { res = A.v + B.v + C.v; toks = [{ n: A.s }, { op: '＋' }, { n: B.s }, { op: '＋' }, { n: C.s }]; help = `先算 ${A.s} ＋ ${B.s} ＝ ${hdec(A.v + B.v)}`; }
      if (res <= 0 || res % 10 === 0) continue;
      const grid = buildH([...toks, { op: '＝' }, { ans: decStr(res, 2) }], { title: '小数混合', text: toks.map((t) => t.n ?? t.op).join(''), answer: decStr(res, 2), help });
      if (grid.cols > 16) continue;
      return grid;
    }
    throw new Error('dec3');
  },
  // 小数点搬家: ×/÷ 10, 100, 1000 (0.09×1000＝90, 43.21÷1000＝0.04321).
  // x has 1-2 decimals and no trailing zero, so every result is exact and
  // free of 4.60-style ambiguity.
  decShift(rng) {
    const r = R(rng);
    for (let g = 0; g < 400; g++) {
      const d = r(1, 2); const n = r(1, 999);
      if (n % 10 === 0) continue;
      const right = rng() < 0.5; const k = pickOf(rng, [1, 2, 3]);
      let ans;
      if (right) ans = k >= d ? String(n * 10 ** (k - d)) : decStr(n, d - k);
      else { const p = d + k; ans = n < 10 ** p ? `0.${String(n).padStart(p, '0')}` : decStr(n, p); }
      const x = decStr(n, d);
      const grid = buildH([{ n: x }, { op: right ? '×' : '÷' }, { n: 10 ** k }, { op: '＝' }, { ans }], { title: '小数点移动', text: `${x}${right ? '×' : '÷'}${10 ** k}`, answer: ans, help: `小数点向${right ? '右' : '左'}移动 ${k} 位` });
      if (grid.cols > 16) continue;
      return grid;
    }
    throw new Error('decShift');
  },
  // 大数改写 (国土面积): whole 万 / 亿 numbers rewritten with the unit
  // (1660000＝166万). The unit is shown; only the number is typed.
  rewrite(rng) {
    const r = R(rng);
    const yi = rng() < 0.5;
    const k = yi ? r(2, 999) : r(10, 9999);
    const n = k * (yi ? 10 ** 8 : 10 ** 4);
    const grid = buildH([{ n }, { op: '＝' }, { ans: k }, { w: yi ? '亿' : '万' }], { title: '大数改写', text: `${n}＝${k}${yi ? '亿' : '万'}`, answer: String(k), help: `末尾去掉 ${yi ? 8 : 4} 个 0` });
    if (grid.cols > 16) return GEN.rewrite(rng);
    return grid;
  },
  percent(rng, { mode } = {}) {
    const r = R(rng);
    // 百分数互化 (六上·四 合格率 / 营养含量、六下·总复习 书69): four directions,
    // about a quarter each. Conversions that divide evenly stay exact; 1/6-type
    // fractions keep one decimal as the textbook prints it (1/6≈16.7%).
    if (mode === 'conv') {
      for (let g = 0; g < 600; g++) {
        const form = r(0, 3);
        if (form === 0) { // 小数 → 百分数 (0.24 → 24%)
          const k = r(1, 999);
          return buildH([{ n: decMin(k, 2) }, { op: '＝' }, { ans: k }, { op: '%' }], { title: '百分数', text: decMin(k, 2), answer: String(k), help: '小数点向右移两位' });
        }
        if (form === 1) { // 分数 → 百分数 (3/4 → 75%、1/6 → ≈16.7%)
          const d = r(2, 20); const n = r(1, d - 1); if (gcd(n, d) !== 1) continue;
          const t = (n * 1000) / d;
          let eq; let ans;
          if (Number.isInteger(t)) { eq = '＝'; ans = decMin(t, 1); } else {
            const v = Math.round(t); if (v % 10 === 0) continue;
            eq = '≈'; ans = decStr(v, 1);
          }
          return buildH([fracTok(n, d), { op: eq }, { ans }, { op: '%' }], { title: '百分数', text: `${n}/${d}`, answer: ans, help: eq === '＝' ? `分母是 ${d}` : '除不尽，保留一位小数' });
        }
        if (form === 2) { // 百分数 → 小数 (37% → 0.37)
          const k = r(1, 999);
          return buildH([{ n: k }, { op: '%' }, { op: '＝' }, { ans: decMin(k, 2) }], { title: '百分数', text: `${k}%`, answer: decMin(k, 2), help: '小数点向左移两位' });
        }
        // 百分数 → 分数 (62.5% → 5/8)：先抽最简真分数再反算百分数，约分后 ≤20
        const d = pickOf(rng, [2, 4, 5, 8, 10, 20]);
        const ns = []; for (let n = 1; n < d; n++) if (gcd(n, d) === 1) ns.push(n);
        const n = pickOf(rng, ns);
        const v = (1000 * n) / d;
        return buildH([{ n: decMin(v, 1) }, { op: '%' }, { op: '＝' }, { fa: [n, d] }], { title: '百分数', text: `${decMin(v, 1)}%`, answer: `${n}/${d}`, help: `分母是 100` });
      }
      throw new Error('percent conv');
    }
    // 求百分率 (六上·四 合格率、六上·七 百分数的应用(一)、这月我当家的除法
    // 方向，三处同构): ① a÷b＝( )%；② (a−b)÷b＝( )%；③ a÷p%＝( ) 求总量。
    // The percent is exact when it fits the digits, else rounded to one decimal
    // (书41), never above 200%.
    if (mode === 'rate') {
      for (let g = 0; g < 600; g++) {
        const form = r(0, 2);
        if (form === 2) { // a÷p%＝( )，已知部分和百分率求总量 (500÷40%=1250)
          const p = pickOf(rng, [5, 10, 20, 25, 40, 50, 60, 75, 80]);
          const g2 = gcd(p, 100); const s = 100 / g2;
          const kmax = Math.min(Math.floor(2000 / s), Math.floor(999 * g2 / p));
          if (kmax < 1) continue;
          const kk = r(1, kmax);
          const R = s * kk; const a = (kk * p) / g2;
          return buildH([{ n: a }, { op: '÷' }, { n: p }, { op: '%' }, { op: '＝' }, { ans: R }], { title: '百分率', text: `${a} ÷ ${p}%`, answer: String(R), help: `${a} ÷ ${decMin(p, 2)}` });
        }
        // ①② share the percent computation: exact, else one rounded decimal.
        let num0; let den; let toks; let text;
        if (form === 0) { // a÷b＝( )% (43÷50=86%、52÷60≈86.7%)
          den = r(2, 200); num0 = r(1, 2 * den); if (num0 > 999 || num0 === den) continue;
          toks = [{ n: num0 }, { op: '÷' }, { n: den }]; text = `${num0}÷${den}`;
        } else if (rng() < 0.15) {
          // 「少」方向的三位数总量窄形态：三位数被减数只有整数百分率排得进
          // 16 列（(400−40)÷400＝90% 一类；(400−10)÷400＝97.5% 为 18 列，版式不出）
          if (rng() < 0.5) { den = 100; num0 = r(92, 99); } else { den = 50 * r(2, 9); num0 = (den / 50) * 49; }
          const part = den - num0;
          toks = [{ op: '(' }, { n: den }, { op: '−' }, { n: part }, { op: ')' }, { op: '÷' }, { n: den }];
          text = `(${den}−${part})÷${den}`;
        } else if (rng() < 0.5) { // 「少」方向：(a−b)÷a，总量作分母（练一练 (24−18)÷24）
          den = r(2, 99); const part = r(1, den - 1);
          num0 = den - part;
          toks = [{ op: '(' }, { n: den }, { op: '−' }, { n: part }, { op: ')' }, { op: '÷' }, { n: den }];
          text = `(${den}−${part})÷${den}`;
        } else { // 「多」方向：(a−b)÷b，较小数作分母、被减数大于除数（书87 (50−45)÷45≈11.1%）
          den = r(2, 99); const big = r(den + 1, 3 * den - 1);
          num0 = big - den;
          toks = [{ op: '(' }, { n: big }, { op: '−' }, { n: den }, { op: ')' }, { op: '÷' }, { n: den }];
          text = `(${big}−${den})÷${den}`;
        }
        const u = (num0 * 1000) / den;
        let eq; let ans;
        if (Number.isInteger(u)) { eq = '＝'; ans = decMin(u, 1); } else {
          const v = Math.round(u); if (v % 10 === 0) continue;
          eq = '≈'; ans = decStr(v, 1);
        }
        const grid = buildH([...toks, { op: eq }, { ans }, { op: '%' }], { title: '百分率', text, answer: ans, help: `${num0} × 100 ÷ ${den}` });
        if (grid.cols > 16) continue;
        return grid;
      }
      throw new Error('percent rate');
    }
    // 多（少）百分之几的数 (六上·七 百分数的应用(二)): a×(1±p%), a 10–1000 and
    // the answer a positive integer ≤ 2000 (180×(1+50%)=270、1000×(1−10%)=900).
    if (mode === 'more') {
      for (let g = 0; g < 400; g++) {
        const p = pickOf(rng, [5, 10, 15, 20, 25, 30, 40, 50, 60, 75]);
        const plus = rng() < 0.5;
        const s = 100 / gcd(p, 100);
        const hi = Math.min(Math.floor(1000 / s), Math.floor((2000 * 100) / (s * (100 + p))));
        const lo = Math.max(1, Math.ceil(10 / s));
        if (lo > hi) continue;
        const k = r(lo, hi);
        const a = s * k;
        const ans = (a * (100 + (plus ? p : -p))) / 100;
        const grid = buildH([{ n: a }, { op: '×' }, { op: '(' }, { n: 1 }, { op: plus ? '＋' : '−' }, { n: p }, { op: '%' }, { op: ')' }, { op: '＝' }, { ans }], { title: '百分数', text: `${a} × (1${plus ? '＋' : '−'}${p}%)`, answer: String(ans), help: `${a} × ${decMin(100 + (plus ? p : -p), 2)}` });
        if (grid.cols > 16) continue;
        return grid;
      }
      throw new Error('percent more');
    }
    for (let g = 0; g < 200; g++) {
      const base = pickOf(rng, [20, 40, 50, 60, 80, 100, 200, 300, 400, 500]); const p = pickOf(rng, [5, 10, 20, 25, 30, 40, 50, 60, 75]);
      const ans = (base * p) / 100; if (!Number.isInteger(ans) || ans === 0) continue;
      return buildH([{ n: base }, { w: '的' }, { n: p }, { op: '%' }, { op: '＝' }, { ans }], { title: '百分数', text: `${base}的${p}%`, answer: String(ans), help: `${base} × ${p / 100}` });
    }
    throw new Error('percent');
  },
  ratio(rng, { ext, mode } = {}) {
    const r = R(rng);
    // 求比值 (六上·六 生活中的比): a:b＝( ), a、b 1–99 且不同. Integer quotient
    // when it divides, a one-decimal quotient drawn back into the antecedent,
    // otherwise the lowest-terms fraction — repeating quotients are answered as
    // fractions, with no redraw (same 口径 as 分数与除法).
    if (mode === 'quo') {
      const w = rng();
      if (w < 0.4) { // 整除 → 整数 (40:2=20)
        const q = r(2, 49); const b = r(1, Math.floor(99 / q)); const a = b * q;
        return buildH([{ n: a }, { op: '：' }, { n: b }, { op: '＝' }, { ans: q }], { title: '求比值', text: `${a}:${b}`, answer: String(q), help: `${a} ÷ ${b}` });
      }
      if (w < 0.7) { // 先抽一位小数商，反算前项 (6:4=1.5)
        for (let g = 0; g < 400; g++) {
          const b = r(2, 99); const qt = r(11, 99); if (qt % 10 === 0) continue;
          if ((b * qt) % 10) continue;
          const a = (b * qt) / 10; if (a > 99) continue;
          return buildH([{ n: a }, { op: '：' }, { n: b }, { op: '＝' }, { ans: decMin(qt, 1) }], { title: '求比值', text: `${a}:${b}`, answer: decMin(qt, 1), help: `${a} ÷ ${b}` });
        }
      }
      for (;;) { // 其余含循环商 → 最简分数 (2:3=2/3)，fa 输入，不重抽
        const a = r(1, 99); const b = r(1, 99);
        if (a === b || a % b === 0) continue;
        const [rn, rd] = reduce(a, b);
        const t = fracAns(rn, rd);
        return buildH([{ n: a }, { op: '：' }, { n: b }, { op: '＝' }, t], { title: '求比值', text: `${a}:${b}`, answer: t.text, help: `${a} ÷ ${b}` });
      }
    }
    // 解比例 (六下·二 比例的应用、练习二、六下·总复习 书84): a:b＝c:x / a:b＝x:c /
    // a:x＝b:c with one term hidden; x = 内项积÷外项. Both sides scale one
    // reduced base ratio (a0,b0) — by k1 and by t/10 — so every term is a
    // positive integer or a one-decimal number (4:10=14:x→35、4:9=x:3.6→1.6),
    // and about a quarter of the problems carry a one-decimal term.
    if (mode === 'solve') {
      for (let g = 0; g < 600; g++) {
        const a0 = r(1, 9); const b0 = r(1, 9); if (a0 === b0) continue;
        const k1 = r(1, Math.min(Math.floor(99 / a0), Math.floor(99 / b0)));
        const t = rng() < 0.25 ? r(1, 999) : r(1, 99) * 10;
        const A = a0 * k1; const B = b0 * k1;
        if (a0 * t < 10 || b0 * t < 10 || a0 * t > 9990 || b0 * t > 9990) continue;
        const form = r(0, 2);
        const cs = decMin(a0 * t, 1); const xs = decMin(b0 * t, 1); // cs＝a0 侧、xs＝b0 侧
        let toks; let text; let help; let hid;
        if (form === 0) { // a:b＝c:x，内项积＝外项积 → x = B×C÷A
          toks = [{ n: A }, { op: '：' }, { n: B }, { op: '＝' }, { n: cs }, { op: '：' }, { ans: xs }];
          text = `${A}:${B}＝${cs}:x`; help = `${B} × ${cs} ÷ ${A}`; hid = b0 * t;
        } else if (form === 1) { // a:b＝x:c → x = A×C÷B
          toks = [{ n: A }, { op: '：' }, { n: B }, { op: '＝' }, { ans: cs }, { op: '：' }, { n: xs }];
          text = `${A}:${B}＝x:${xs}`; help = `${A} × ${xs} ÷ ${B}`; hid = a0 * t;
        } else { // a:x＝b:c → x = A×C÷B
          toks = [{ n: A }, { op: '：' }, { ans: cs }, { op: '＝' }, { n: B }, { op: '：' }, { n: xs }];
          text = `${A}:x＝${B}:${xs}`; help = `${A} × ${xs} ÷ ${B}`; hid = a0 * t;
        }
        return buildH(toks, { title: '解比例', text, answer: decMin(hid, 1), help });
      }
      throw new Error('ratio solve');
    }
    // 相等的比 (六上·六 比的化简) with `ext`: integer, decimal and fraction
    // terms, about a third each (六下·总复习 书84 revisits them). The left side
    // carries the unsimplified pair, the right side the lowest-terms ratio
    // with one number hidden — a single digit (0.7:0.8＝7:( )、2/5:1/4＝8:( )).
    for (let block = 0; block < 15; block += 1) {
      const kind = ext ? r(0, 2) : 0; // 每块随机定形态，三形态各约三分之一
      for (let g = 0; g < 300; g += 1) {
        const a = r(1, 9); const b = r(1, 9); if (a === b) continue;
        const [x, y] = reduce(a, b); const k = r(2, 9);
        const hideLeft = rng() < 0.5;
        if (kind === 0) { // 整数比（原形态，9:7＝54:( )）
          const toks = hideLeft ? [{ n: x }, { op: '：' }, { n: y }, { op: '＝' }, { ans: x * k }, { op: '：' }, { n: y * k }] : [{ n: x }, { op: '：' }, { n: y }, { op: '＝' }, { n: x * k }, { op: '：' }, { ans: y * k }];
          return buildH(toks, { title: '比', text: `${x}:${y}`, answer: String(hideLeft ? x * k : y * k), help: `${k}倍` });
        }
        if (kind === 1) { // 小数比：两项同乘 t/100，末尾 0 收掉（0.7:0.8＝7:( )、0.15:3＝1:( )）
          const t = r(1, 99);
          const s1 = x * k * t; const s2 = y * k * t;
          if (s1 > 9990 || s2 > 9990) continue;
          if (s1 % 100 === 0 && s2 % 100 === 0) continue; // 两项都成了整数
          const toks = hideLeft ? [{ n: decMin(s1, 2) }, { op: '：' }, { n: decMin(s2, 2) }, { op: '＝' }, { ans: x }, { op: '：' }, { n: y }] : [{ n: decMin(s1, 2) }, { op: '：' }, { n: decMin(s2, 2) }, { op: '＝' }, { n: x }, { op: '：' }, { ans: y }];
          return buildH(toks, { title: '比', text: `${x}:${y}`, answer: String(hideLeft ? x : y), help: '先化成整数比' });
        }
        if (rng() < 0.4) { // 整数与分数各一项（1:3/4＝( ):3）
          const A = r(1, 9);
          const d = r(2, 9); const n = r(1, d - 1); if (gcd(n, d) !== 1) continue;
          const intFirst = rng() < 0.5;
          const [xn, yn] = intFirst ? reduce(A * d, n) : reduce(n, A * d);
          if (xn > 9 || yn > 9 || xn === yn) continue;
          const left = intFirst ? [{ n: A }, fracTok(n, d)] : [fracTok(n, d), { n: A }];
          const lt = intFirst ? `${A}:${n}/${d}` : `${n}/${d}:${A}`;
          const toks = hideLeft ? [...left, { op: '＝' }, { ans: xn }, { op: '：' }, { n: yn }] : [...left, { op: '＝' }, { n: xn }, { op: '：' }, { ans: yn }];
          return buildH(toks, { title: '比', text: lt, answer: String(hideLeft ? xn : yn), help: '前项 ÷ 后项' });
        }
        // 两个分数：先定最简比 (x, y)，反构造两个最简真分数（2/5:1/4＝8:( )、1/2:2/3＝3:( )）
        const d2 = r(2, 12); const n2 = r(1, d2 - 1); if (gcd(n2, d2) !== 1) continue;
        const g2 = gcd(x * n2, y * d2);
        const n1 = (x * n2) / g2; const d1 = (y * d2) / g2;
        if (n1 >= d1 || d1 > 21) continue;
        const toks = hideLeft ? [fracTok(n1, d1), { op: '：' }, fracTok(n2, d2), { op: '＝' }, { ans: x }, { op: '：' }, { n: y }] : [fracTok(n1, d1), { op: '：' }, fracTok(n2, d2), { op: '＝' }, { n: x }, { op: '：' }, { ans: y }];
        return buildH(toks, { title: '比', text: `${n1}/${d1}:${n2}/${d2}`, answer: String(hideLeft ? x : y), help: '前项 ÷ 后项' });
      }
    }
    throw new Error('ratio');
  },
  letter(rng) {
    const r = R(rng);
    const x = r(2, 12); const a = r(2, 9);
    const form = r(0, 2);
    let toks; let help;
    if (form === 0) { toks = [{ n: 'x' }, { op: '×' }, { n: a }, { op: '＝' }, { n: x * a }]; help = `${x * a} ÷ ${a}`; }
    else if (form === 1) { toks = [{ n: 'x' }, { op: '＋' }, { n: a * 3 }, { op: '＝' }, { n: x + a * 3 }]; help = `${x + a * 3} − ${a * 3}`; }
    else { toks = [{ n: 'x' }, { op: '−' }, { n: a }, { op: '＝' }, { n: x }]; help = `${x} ＋ ${a}`; return buildH([...toks, { br: true }, { n: 'x' }, { op: '＝' }, { ans: x + a }], { title: '求x', text: toks.map((t) => t.n ?? t.op ?? t.w).join(''), answer: String(x + a), help }); }
    return buildH([...toks, { br: true }, { n: 'x' }, { op: '＝' }, { ans: x }], { title: '求x', text: toks.map((t) => t.n ?? t.op ?? t.w).join(''), answer: String(x), help });
  },
  frac(rng, { op, same, maxOne, mixed, dMax, fromOne }) {
    const r = R(rng);
    for (let g = 0; g < 600; g++) {
      if (op === 'reduce') {
        const d = r(2, dMax || 9); const n = r(1, d - 1); const k = r(2, 6); if (gcd(n, d) !== 1) continue;
        return buildH([fracTok(n * k, d * k), { op: '＝' }, { fa: [n, d] }], { title: '约分', text: `${n * k}/${d * k}`, answer: `${n}/${d}`, help: `除以 ${k}` });
      }
      if (op === 'addsub' && same) {
        const d = r(3, dMax || 12); const add = rng() < 0.55;
        if (mixed) {
          const w1 = r(1, 4); const w2 = r(0, 3); const n1 = r(1, d - 1); const n2 = r(1, d - 1);
          const A = w1 * d + n1; const B = w2 * d + n2;
          const res = add ? A + B : A - B; if (res <= 0 || res % d === 0) continue;
          if (gcd(res % d, d) !== 1 && res % d) continue;
          const t1 = fracTok(n1, d, w1); const t2 = fracTok(n2, d, w2 || undefined);
          const fa = { fa: [res % d, d, Math.floor(res / d) || undefined] };
          return buildH([t1, { op: add ? '＋' : '−' }, t2, { op: '＝' }, fa], { title: '分数加减', text: `${w1}又${n1}/${d} ${add ? '+' : '−'} ${w2}又${n2}/${d}`, answer: res >= d ? `${Math.floor(res / d)}又${res % d}/${d}` : `${res}/${d}`, help: `分母仍是 ${d}` });
        }
        // fromOne: about 30% come out as 1 − n/d (吃西瓜 of the textbook).
        if (fromOne && rng() < 0.3) {
          const n = r(1, d - 1);
          return buildH([{ n: 1 }, { op: '−' }, fracTok(n, d), { op: '＝' }, { fa: [d - n, d] }], { title: '分数加减', text: `1 − ${n}/${d}`, answer: `${d - n}/${d}`, help: `${d}/${d} − ${n}/${d}` });
        }
        const n1 = r(1, d - 1); const n2 = r(1, d - 1);
        const res = add ? n1 + n2 : n1 - n2;
        if (res <= 0 || (maxOne && res >= d)) continue;
        return buildH([fracTok(n1, d), { op: add ? '＋' : '−' }, fracTok(n2, d), { op: '＝' }, { fa: [res, d] }], { title: '分数加减', text: `${n1}/${d} ${add ? '+' : '−'} ${n2}/${d}`, answer: `${res}/${d}`, help: `分母仍是 ${d}` });
      }
      if (op === 'addsub') {
        const d1 = r(2, dMax || 9); const d2 = r(2, dMax || 9); if (d1 === d2) continue;
        const n1 = r(1, d1 - 1); const n2 = r(1, d2 - 1); if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1) continue;
        const add = rng() < 0.55; const L = lcm(d1, d2); if (L > 36) continue;
        const res = add ? n1 * (L / d1) + n2 * (L / d2) : n1 * (L / d1) - n2 * (L / d2);
        if (res <= 0 || res >= L) continue;
        const [rn, rd] = reduce(res, L);
        return buildH([fracTok(n1, d1), { op: add ? '＋' : '−' }, fracTok(n2, d2), { op: '＝' }, { fa: [rn, rd] }], { title: '分数加减', text: `${n1}/${d1} ${add ? '+' : '−'} ${n2}/${d2}`, answer: `${rn}/${rd}`, help: `通分后分母是 ${L}` });
      }
      if (op === 'muldivInt') {
        const d = r(2, dMax || 9); const n = r(1, d - 1); const k = r(2, 9); if (gcd(n, d) !== 1) continue;
        const mul = rng() < 0.5;
        const [rn, rd] = mul ? reduce(n * k, d) : reduce(n, d * k);
        if (rd === 1) continue;
        const a = fracAns(rn, rd, true);
        return buildH([fracTok(n, d), { op: mul ? '×' : '÷' }, { n: k }, { op: '＝' }, a], { title: '分数和整数', text: `${n}/${d} ${mul ? '×' : '÷'} ${k}`, answer: a.text, help: mul ? `分子乘 ${k}` : `分母乘 ${k}` });
      }
      // 分数与除法 (五上·五): the quotient of a ÷ b written as a fraction. Exact
      // divisions stay in 除法 (g3-div-basic), so b never divides a.
      if (op === 'quo') {
        const b = r(2, 9); const a = r(1, 99); if (a % b === 0) continue;
        const [rn, rd] = reduce(a, b);
        const t = fracAns(rn, rd, true);
        return buildH([{ n: a }, { op: '÷' }, { n: b }, { op: '＝' }, t], { title: '分数与除法', text: `${a} ÷ ${b}`, answer: t.text, help: `平均分成 ${b} 份` });
      }
      // 整数乘分数 (五下·三): always a whole number on the left, so the
      // fraction-on-the-left shapes stay in 分数乘除整数.
      if (op === 'wholeMul') {
        const d = r(2, 12); const n = r(1, d - 1); if (gcd(n, d) !== 1) continue;
        // Half of the time the product is a whole number (6×2/3＝4, 20×1/4＝5).
        const A = rng() < 0.5 ? d * r(1, Math.max(1, Math.floor(999 / d))) : r(2, 99);
        const [rn, rd] = reduce(A * n, d);
        const a = rd === 1 ? { ans: rn } : fracAns(rn, rd, true);
        const grid = buildH([{ n: A }, { op: '×' }, fracTok(n, d), { op: '＝' }, a], { title: '分数和整数', text: `${A} × ${n}/${d}`, answer: rd === 1 ? String(rn) : a.text, help: `分子乘 ${A}` });
        if (grid.cols > 16) continue;
        return grid;
      }
      // 整数除以分数 (五下·五): whole number ÷ proper fraction. The quotient is
      // scaled by 10 first, so a repeating one is redrawn (v % n).
      if (op === 'wholeDiv') {
        const A = r(2, 99); const d = r(2, 13); const n = r(1, d - 1); if (gcd(n, d) !== 1) continue;
        const v = A * d * 10; if (v % n !== 0) continue;
        const q = v / n; if (q > 9990) continue;
        const ans = q % 10 === 0 ? String(q / 10) : decStr(q, 1);
        return buildH([{ n: A }, { op: '÷' }, fracTok(n, d), { op: '＝' }, { ans }], { title: '分数和整数', text: `${A} ÷ ${n}/${d}`, answer: ans, help: `把 ${n}/${d} 颠倒过来再乘` });
      }
      // 分数与小数 (五下·一 分数王国 / 小数王国): the fraction is turned into
      // the decimal that ends it, or the other way round. No comparison forms.
      if (op === 'conv') {
        if (rng() < 0.5) {
          const d = pickOf(rng, [2, 4, 5, 8, 10, 20, 25, 40, 50, 100]);
          const n = r(1, d - 1); if (gcd(n, d) !== 1) continue;
          let p = 1; while (10 ** p % d !== 0) p += 1;
          const ans = decStr(n * 10 ** p / d, p);
          return buildH([fracTok(n, d), { op: '＝' }, { ans }], { title: '分数与小数', text: `${n}/${d}`, answer: ans, help: `分母是 ${d}` });
        }
        const p = r(2, 3); const v = r(1, 10 ** p - 1); if (v % 10 === 0) continue;
        const [rn, rd] = reduce(v, 10 ** p);
        return buildH([{ n: decStr(v, p) }, { op: '＝' }, { fa: [rn, rd] }], { title: '分数与小数', text: decStr(v, p), answer: `${rn}/${rd}`, help: `分母是 ${10 ** p}` });
      }
      if (op === 'mix') return fracMix(rng);
      if (op === 'chain') return fracChain(rng);
      if (op === 'mul' || op === 'div') {
        const d1 = r(2, 9); const n1 = r(1, 9); const d2 = r(2, 9); const n2 = r(1, 9);
        if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1 || n1 === d1 || n2 === d2) continue;
        const [rn, rd] = op === 'mul' ? reduce(n1 * n2, d1 * d2) : reduce(n1 * d2, d1 * n2);
        if (rd === 1 || rn > 99 || rd > 99) continue;
        const a = fracAns(rn, rd, true);
        return buildH([fracTok(n1, d1), { op: op === 'mul' ? '×' : '÷' }, fracTok(n2, d2), { op: '＝' }, a], { title: op === 'mul' ? '分数乘法' : '分数除法', text: `${n1}/${d1} ${op === 'mul' ? '×' : '÷'} ${n2}/${d2}`, answer: a.text, help: op === 'mul' ? '分母相乘，分子相乘' : `把 ${n2}/${d2} 颠倒过来再乘` });
      }
      if (op === 'decimal') {
        const t = pickOf(rng, [2, 4, 5, 6, 8]); const d = r(2, 9); const n = r(1, d - 1); if (gcd(n, d) !== 1) continue;
        const [rn, rd] = reduce(t * n, 10 * d);
        if (rd === 1 || rn > 99 || rd > 99) continue;
        return buildH([{ n: decStr(t, 1) }, { op: '×' }, fracTok(n, d), { op: '＝' }, { fa: [rn, rd] }], { title: '小数与分数', text: `${decStr(t, 1)} × ${n}/${d}`, answer: `${rn}/${rd}`, help: `${decStr(t, 1)} ＝ ${t}/10` });
      }
    }
    throw new Error(`frac ${op}`);
  },
};

// Signature used to avoid repeats.
export const signature = (p) => `${p.title}|${p.text}`;

// Make one problem for a skill, avoiding signatures in `recent` when possible.
export function makeProblem(skillId, rng, recent = null) {
  const sk = SKILL[skillId];
  if (!sk) throw new Error(`unknown skill ${skillId}`);
  const [name, params] = sk.gen;
  let p;
  for (let tries = 0; tries < 40; tries++) {
    p = GEN[name](rng, params);
    if (!recent || !recent.has(signature(p))) break;
  }
  p.skill = skillId;
  return finalize(p);
}

function finalize(p) {
  p.answerText = p.kind === 'h' ? `${p.text} ＝ ${p.answer}` : `${p.text} ＝ ${p.answer}`;
  return p;
}

// ================================================================ legacy templates (fixed basic set)
export const BASIC_SETS = {
  6: ['add2', 'add2', 'sub2', 'div2', 'add3', 'div3'],
  10: ['add2', 'add2', 'sub2', 'sub3', 'div2', 'div3', 'add3', 'sub3z', 'div3', 'div3'],
  14: ['add2', 'add2', 'sub2', 'add2', 'sub3', 'div2', 'div2', 'add3', 'sub3', 'div3', 'sub3z', 'add3', 'div3', 'div3'],
};
export const EXTRA_TIERS = [['add3', 'sub3'], ['div3', 'sub3z'], ['add4', 'div3'], ['sub4', 'add4'], ['sub4', 'div3']];

export function generate(template, rng, fixed) {
  const r = (a, b) => a + Math.floor(rng() * (b - a + 1));
  if (fixed) return finalize(fixed.kind === 'add' ? buildAdd(fixed.a, fixed.b) : fixed.kind === 'sub' ? buildSub(fixed.a, fixed.b) : buildDiv(fixed.a, fixed.b));
  for (let guard = 0; guard < 500; guard++) {
    let a; let b;
    switch (template) {
      case 'add2': a = r(12, 68); b = r(12, 89 - a); if (a + b < 100 && carries(a, b) === 1 && a % 10 && b % 10) return finalize(buildAdd(a, b)); break;
      case 'add3': a = r(120, 780); b = r(120, 999 - a); if (a + b < 1000 && carries(a, b) >= 2) return finalize(buildAdd(a, b)); break;
      case 'add4': a = r(1200, 7800); b = r(1200, 9999 - a); if (a + b < 10000 && carries(a, b) >= 2) return finalize(buildAdd(a, b)); break;
      case 'sub2': a = r(31, 98); b = r(12, a - 10); if (borrows(a, b) === 1 && a - b >= 10) return finalize(buildSub(a, b)); break;
      case 'sub3': a = r(120, 980); b = r(25, a - 20); if (borrows(a, b) >= 1 && a - b >= 10) return finalize(buildSub(a, b)); break;
      case 'sub3z': a = r(1, 9) * 100 + r(1, 9); b = r(102, a - 50); if (a > 150 && borrows(a, b) >= 2 && Math.floor(b / 10) % 10 > 0) return finalize(buildSub(a, b)); break;
      case 'sub4': a = r(2000, 9800); b = r(300, a - 100); if (borrows(a, b) >= 2 && a - b >= 100) return finalize(buildSub(a, b)); break;
      case 'div2': { const d = r(2, 4); const q = r(12, 49); a = q * d; if (a < 100 && Math.floor(a / 10) >= d && q % 10) return finalize(buildDiv(a, d)); break; }
      case 'div3': { const d = r(3, 9); const q = r(12, 99); a = q * d; if (a >= 100 && a < 1000 && Math.floor(a / 100) < d && q % 10) return finalize(buildDiv(a, d)); break; }
      default: throw new Error(`unknown template ${template}`);
    }
  }
  throw new Error(`failed to generate ${template}`);
}

export const _internal = { buildAdd, buildSub, buildMul, buildDiv, buildH, GEN, decStr };
