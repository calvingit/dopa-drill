// Skill tree for grades 1-6 (calculation only). See docs/curriculum.md.
// Each skill: id, name (shown on screen), grade, lane (tree column),
// req (all must be mastered to unlock), gen (generator + params, problems.js).

export const LANES = ['加减法', '乘除法', '小数与分数', '其他'];

// Mastery / unlock rule (provisional): 5 first-try clears in the last 6 attempts.
export const MASTERY = { window: 6, need: 5 };

export const SKILLS = [
  // ---------------------------------------------------------------- grade 1
  { id: 'g1-compose10', name: '凑成10', grade: 1, lane: 0, req: [], gen: ['compose', { total: 10 }] },
  { id: 'g1-add-nc', name: '一位数加法', grade: 1, lane: 0, req: [], gen: ['hadd', { a: [0, 9], b: [0, 9], carry: 'none' }] },
  { id: 'g1-sub-nb', name: '10以内减法', grade: 1, lane: 0, req: ['g1-add-nc'], gen: ['hsub', { a: [1, 10], b: [0, 9], borrow: 'none', allowEqual: true }] },
  { id: 'g1-add-c', name: '进位加法', grade: 1, lane: 0, req: ['g1-compose10', 'g1-add-nc'], gen: ['hadd', { a: [2, 9], b: [2, 9], carry: 'yes' }] },
  { id: 'g1-sub-b', name: '退位减法', grade: 1, lane: 0, req: ['g1-add-c', 'g1-sub-nb'], gen: ['hsub', { a: [10, 18], b: [2, 9], borrow: 'yes' }] },
  { id: 'g1-add3', name: '三个数的计算', grade: 1, lane: 0, req: ['g1-sub-nb'], gen: ['add3', { max: 10 }] },
  { id: 'g1-add-2d1', name: '两位数加一位数', grade: 1, lane: 0, req: ['g1-add-c'], gen: ['hadd', { a: [11, 89], b: [1, 9], carry: 'none', tensToo: true }] },
  { id: 'g1-sub-2d1', name: '两位数减一位数', grade: 1, lane: 0, req: ['g1-sub-b', 'g1-add-2d1'], gen: ['hsub', { a: [11, 99], b: [1, 9], borrow: 'none', tensToo: true }] },
  { id: 'g1-add-2d2', name: '两位数加两位数', grade: 1, lane: 0, req: ['g1-add-2d1'], gen: ['hadd', { a: [11, 89], b: [11, 89], carry: 'none' }] },
  { id: 'g1-sub-2d2', name: '两位数减两位数', grade: 1, lane: 0, req: ['g1-sub-2d1', 'g1-add-2d2'], gen: ['hsub', { a: [21, 99], b: [11, 89], borrow: 'none' }] },
  { id: 'g1-add-2d-c', name: '两位数进位加法', grade: 1, lane: 0, req: ['g1-add-c', 'g1-add-2d2'], gen: ['hadd', { a: [11, 89], b: [1, 89], carry: 'yes', maxSum: 100 }] },
  { id: 'g1-sub-2d-b', name: '两位数退位减法', grade: 1, lane: 0, req: ['g1-sub-b', 'g1-sub-2d2'], gen: ['hsub', { a: [21, 100], b: [1, 89], borrow: 'yes' }] },
  // Question-form axis (docs/SPEC.md 6.1): one blank in a shown equation, and
  // reading a number by its places. Both are single-cell answers. 填方框 sits
  // in 其他 next to 解方程 — it is the same idea one step earlier.
  { id: 'g1-blank', name: '填方框', grade: 1, lane: 3, req: ['g1-add-2d-c'], gen: ['blank', { max: 100 }] },
  { id: 'g1-place', name: '数位与组成', grade: 1, lane: 3, req: ['g1-compose10'], gen: ['place', {}] },
  { id: 'g1-sequence', name: '找规律', grade: 1, lane: 3, req: ['g1-add-nc'], gen: ['sequence', {}] },

  // ---------------------------------------------------------------- grade 2
  { id: 'g2-vadd2-nc', name: '两位数加法竖式', grade: 2, lane: 0, req: ['g1-add-2d1'], gen: ['vadd', { da: 2, db: 2, carry: 'none', maxDigits: 2 }] },
  { id: 'g2-vadd2-c', name: '进位竖式', grade: 2, lane: 0, req: ['g2-vadd2-nc', 'g1-add-c'], gen: ['vadd', { da: 2, db: [1, 2], carry: 'some', maxDigits: 2 }] },
  { id: 'g2-vsub2-nb', name: '两位数减法竖式', grade: 2, lane: 0, req: ['g1-sub-2d1'], gen: ['vsub', { da: 2, db: 2, borrow: 'none' }] },
  { id: 'g2-vsub2-b', name: '退位竖式', grade: 2, lane: 0, req: ['g2-vsub2-nb', 'g1-sub-b'], gen: ['vsub', { da: 2, db: [1, 2], borrow: 'some' }] },
  { id: 'g2-add3', name: '100以内连加减', grade: 2, lane: 0, req: ['g2-vadd2-c', 'g2-vsub2-b'], gen: ['add3', { min: 10, max: 100 }] },
  { id: 'g2-vadd3s', name: '超过一百的加法', grade: 2, lane: 0, req: ['g2-vadd2-c'], gen: ['vadd', { da: 2, db: 2, carry: 'some', maxDigits: 3, minSum: 101 }] },
  { id: 'g2-vsub3s', name: '从一百起的减法', grade: 2, lane: 0, req: ['g2-vsub2-b', 'g2-vadd3s'], gen: ['vsub', { da: 3, db: 2, borrow: 'some', aMax: 199 }] },
  { id: 'g2-tens-addsub', name: '整百整十的加减', grade: 2, lane: 0, req: ['g2-add3'], gen: ['tensCalc', {}] },
  { id: 'g2-kuku25', name: '5和2的乘法口诀', grade: 2, lane: 1, req: ['g1-add-c'], gen: ['kuku', { dans: [5, 2] }] },
  { id: 'g2-kuku34', name: '3和4的乘法口诀', grade: 2, lane: 1, req: ['g2-kuku25'], gen: ['kuku', { dans: [3, 4] }] },
  { id: 'g2-kuku67', name: '6和7的乘法口诀', grade: 2, lane: 1, req: ['g2-kuku34'], gen: ['kuku', { dans: [6, 7] }] },
  { id: 'g2-kuku891', name: '8、9、1的乘法口诀', grade: 2, lane: 1, req: ['g2-kuku67'], gen: ['kuku', { dans: [8, 9, 1] }] },
  { id: 'g2-kuku-mix', name: '口诀混合', grade: 2, lane: 1, req: ['g2-kuku891'], gen: ['kuku', { dans: [1, 2, 3, 4, 5, 6, 7, 8, 9] }] },
  { id: 'g2-balance', name: '数字天平', grade: 2, lane: 1, req: ['g2-kuku25'], gen: ['balance', {}] },
  { id: 'g2-compare', name: '比较大小', grade: 2, lane: 3, req: ['g2-kuku25'], gen: ['compare', {}] },
  { id: 'g2-units', name: '单位换算', grade: 2, lane: 3, req: ['g1-add-nc'], gen: ['units', {}] },
  { id: 'g2-time', name: '时间计算', grade: 2, lane: 3, req: ['g1-add-c'], gen: ['time', {}] },

  // ---------------------------------------------------------------- grade 3
  { id: 'g3-vadd3', name: '三位数加法', grade: 3, lane: 0, req: ['g2-vadd3s'], gen: ['vadd', { da: 3, db: 3, carry: 'some', maxDigits: 3 }] },
  { id: 'g3-vsub3', name: '三位数减法', grade: 3, lane: 0, req: ['g2-vsub3s'], gen: ['vsub', { da: 3, db: [2, 3], borrow: 'some' }] },
  { id: 'g3-add3', name: '三位数连加减', grade: 3, lane: 0, req: ['g3-vadd3', 'g3-vsub3'], gen: ['add3', { min: 100, max: 999 }] },
  { id: 'g3-vadd4', name: '和超过一千的加法', grade: 3, lane: 0, req: ['g3-vadd3'], gen: ['vadd', { da: 3, db: 3, carry: 'some', maxDigits: 4, minSum: 1001 }] },
  { id: 'g3-vsub4', name: '四位数减法', grade: 3, lane: 0, req: ['g3-vsub3'], gen: ['vsub', { da: 4, db: 3, borrow: 'some', aMax: 1999 }] },
  { id: 'g3-div-basic', name: '除法', grade: 3, lane: 1, req: ['g2-kuku-mix'], gen: ['div', { exact: true }] },
  { id: 'g3-div-rem', name: '有余数的除法', grade: 3, lane: 1, req: ['g3-div-basic'], gen: ['divRem', {}] },
  { id: 'g3-div-tens', name: '整十整百的除法', grade: 3, lane: 1, req: ['g3-div-basic'], gen: ['divTens', { big: true }] },
  // Moved here from grade 2 by the 2026-09-30 alignment decision; the g2- id is
  // kept for saved-progress compatibility (docs/curriculum.md, grade 3 note).
  { id: 'g2-mul-tens', name: '整十整百乘一位数', grade: 3, lane: 1, req: ['g2-kuku-mix'], gen: ['mulTens', { hundreds: true }] },
  { id: 'g3-hmul-2x1', name: '两位数乘一位数口算', grade: 3, lane: 1, req: ['g2-mul-tens'], gen: ['hmul', { a: [11, 34], b: [2, 9], maxProd: 98 }] },
  { id: 'g3-vmul-2x1', name: '两位数乘一位数竖式', grade: 3, lane: 1, req: ['g3-hmul-2x1'], gen: ['vmul', { da: 2, db: 1 }] },
  { id: 'g3-mul-tens2', name: '两位数乘整十数', grade: 3, lane: 1, req: ['g3-hmul-2x1'], gen: ['mulTens', { twoDigit: true }] },
  { id: 'g3-vmul-2x2', name: '两位数乘两位数', grade: 3, lane: 1, req: ['g3-vmul-2x1', 'g3-mul-tens2'], gen: ['vmul', { da: 2, db: 2 }] },
  { id: 'g3-vmul-3x1', name: '三位数乘一位数', grade: 3, lane: 1, req: ['g3-vmul-2x1'], gen: ['vmul', { da: 3, db: 1, aMax: 699 }] },
  { id: 'g3-vmul-zero', name: '末尾有0的乘法', grade: 3, lane: 1, req: ['g3-vmul-3x1'], gen: ['vmul', { da: 3, db: 1, aEnd: 'zero', aMax: 699 }] },
  { id: 'g3-mul3', name: '连乘', grade: 3, lane: 1, req: ['g3-vmul-3x1'], gen: ['mul3', {}] },
  { id: 'g3-muldiv', name: '乘除两步', grade: 3, lane: 1, req: ['g3-div-tens', 'g3-hmul-2x1'], gen: ['muldiv', {}] },
  { id: 'g3-dec-add1', name: '小数加法', grade: 3, lane: 2, req: ['g2-vadd2-c'], gen: ['vdec', { op: 'add', places: 1, aMax: 499, bMax: 499 }] },
  { id: 'g3-dec-sub1', name: '小数减法', grade: 3, lane: 2, req: ['g3-dec-add1', 'g2-vsub2-b'], gen: ['vdec', { op: 'sub', places: 1, aMax: 499, bMax: 499, intMinuend: true }] },
  { id: 'g2-frac-of', name: '二分之一和四分之一', grade: 3, lane: 2, req: ['g2-kuku25'], gen: ['fracOf', { dens: [2, 4] }] },
  { id: 'g3-frac-same', name: '分数加减', grade: 3, lane: 2, req: ['g2-frac-of'], gen: ['frac', { op: 'addsub', same: true, maxOne: true, dMax: 10, fromOne: true }] },
  { id: 'g3-blank-muldiv', name: '乘除填方框', grade: 3, lane: 1, req: ['g3-div-basic'], gen: ['blank', { ops: 'muldiv' }] },
  { id: 'g3-estimate', name: '估算', grade: 3, lane: 3, req: ['g3-hmul-2x1'], gen: ['estimate', {}] },
  { id: 'g3-judge', name: '判断题', grade: 3, lane: 3, req: ['g2-kuku-mix'], gen: ['judge', {}] },

  // ---------------------------------------------------------------- grade 4
  { id: 'g4-vdiv-2d1', name: '两位数除以一位数竖式', grade: 4, lane: 1, req: ['g3-div-rem', 'g3-div-tens'], gen: ['vdiv', { dd: 2, ds: 1 }] },
  { id: 'g4-vdiv-3d1', name: '三位数除以一位数', grade: 4, lane: 1, req: ['g4-vdiv-2d1'], gen: ['vdiv', { dd: 3, ds: 1 }] },
  { id: 'g4-vdiv-2d2', name: '两位数除以两位数', grade: 4, lane: 1, req: ['g4-vdiv-2d1', 'g3-vmul-2x1'], gen: ['vdiv', { dd: 2, ds: 2 }] },
  { id: 'g4-vdiv-3d2', name: '三位数除以两位数', grade: 4, lane: 1, req: ['g4-vdiv-2d2', 'g4-vdiv-3d1'], gen: ['vdiv', { dd: 3, ds: 2, dsMax: 90 }] },
  { id: 'g4-conv-add', name: '加法凑整', grade: 4, lane: 0, req: ['g3-add3'], gen: ['convAdd', {}] },
  { id: 'g4-conv-mul', name: '乘法凑整', grade: 4, lane: 1, req: ['g3-vmul-2x2'], gen: ['convMul', {}] },
  { id: 'g4-order', name: '运算顺序', grade: 4, lane: 3, req: ['g2-kuku-mix', 'g2-vsub2-b'], gen: ['order', {}] },
  { id: 'g4-eq-1', name: '解方程（一步）', grade: 4, lane: 3, req: ['g4-order'], gen: ['eq', {}] },
  { id: 'g4-eq-2', name: '解方程（两步）', grade: 4, lane: 3, req: ['g4-eq-1'], gen: ['eq', { twoStep: true }] },
  { id: 'g4-round', name: '近似数（四舍五入）', grade: 4, lane: 3, req: ['g3-vadd4'], gen: ['round', {}] },
  { id: 'g4-rewrite', name: '大数改写', grade: 4, lane: 3, req: ['g3-vadd4'], gen: ['rewrite', {}] },
  { id: 'g4-dec-add2', name: '两位小数加减', grade: 4, lane: 2, req: ['g3-dec-sub1'], gen: ['vdec', { op: 'addsub', places: 2, intMinuend: true }] },
  { id: 'g4-dec-mix', name: '小数加减混合', grade: 4, lane: 2, req: ['g4-dec-add2'], gen: ['dec3', {}] },
  { id: 'g4-dec-mul', name: '小数乘整数', grade: 4, lane: 2, req: ['g4-dec-add2', 'g3-vmul-2x1'], gen: ['vmul', { da: [1, 2], db: 1, pa: 1, subOne: true }] },
  { id: 'g4-dec-shift', name: '小数点移动', grade: 4, lane: 2, req: ['g3-dec-add1'], gen: ['decShift', {}] },
  // Moved here from grade 3 by the 2026-09-30 alignment decision (no such
  // lesson in either grade-3 textbook); the g3- id is kept for saved-progress
  // compatibility (docs/curriculum.md, grade 4 note).
  { id: 'g3-vmul-3x2', name: '三位数乘两位数', grade: 4, lane: 1, req: ['g3-vmul-2x2', 'g3-vmul-3x1'], gen: ['vmul', { da: 3, db: 2 }] },
  { id: 'g4-vmul-3x2-zero', name: '末尾有0的三位数乘两位数', grade: 4, lane: 1, req: ['g3-vmul-3x2'], gen: ['vmul', { da: 3, db: 2, aEnd: 'zero', bEnd: true }] },
  // Moved here from grade 5 by the 2026-09-30 grade-5 alignment decision: the
  // textbook lesson is 四下·三 小数乘法, neither grade-5 book has one. The g5-
  // id is kept for saved-progress compatibility (docs/curriculum.md, grade 4
  // note); name, generator and prerequisites are unchanged.
  { id: 'g5-dec-mul', name: '小数乘小数', grade: 4, lane: 2, req: ['g4-dec-mul'], gen: ['vmul', { da: 2, db: 2, pa: 1, pb: 1 }] },

  // ---------------------------------------------------------------- grade 5
  // Moved here from grade 4 by the 2026-09-30 alignment decision: neither
  // grade-4 textbook teaches them. Ids, names, generators and prerequisites
  // are unchanged for saved-progress compatibility (docs/curriculum.md,
  // grade 5 note). g4-frac-mixed's textbook unit is still undecided.
  { id: 'g4-dec-div', name: '小数除以整数', grade: 5, lane: 2, req: ['g4-dec-mul', 'g4-vdiv-2d1'], gen: ['decDivInt', {}] },
  { id: 'g4-frac-mixed', name: '带分数加减', grade: 5, lane: 2, req: ['g3-frac-same'], gen: ['frac', { op: 'addsub', same: true, mixed: true }] },
  { id: 'g5-dec-div', name: '小数除以小数', grade: 5, lane: 2, req: ['g4-dec-div', 'g5-dec-mul'], gen: ['decDivDec', {}] },
  { id: 'g5-gcd', name: '最大公约数', grade: 5, lane: 3, req: ['g3-div-basic'], gen: ['gcdlcm', { kind: 'gcd' }] },
  { id: 'g5-lcm', name: '最小公倍数', grade: 5, lane: 3, req: ['g5-gcd'], gen: ['gcdlcm', { kind: 'lcm' }] },
  { id: 'g5-frac-reduce', name: '约分', grade: 5, lane: 2, req: ['g5-gcd', 'g4-frac-mixed'], gen: ['frac', { op: 'reduce', dMax: 16 }] },
  { id: 'g5-frac-diff', name: '异分母分数', grade: 5, lane: 2, req: ['g5-frac-reduce', 'g5-lcm'], gen: ['frac', { op: 'addsub', same: false, dMax: 12 }] },
  { id: 'g5-frac-quo', name: '分数与除法', grade: 5, lane: 2, req: ['g3-div-basic', 'g2-frac-of'], gen: ['frac', { op: 'quo' }] },
  // g5-frac-quo is a prerequisite: 「分数与除法」 comes before 分数乘除整数.
  { id: 'g5-frac-int', name: '分数乘除整数', grade: 5, lane: 2, req: ['g5-frac-reduce', 'g5-frac-quo'], gen: ['frac', { op: 'muldivInt', dMax: 16 }] },
  { id: 'g5-frac-intmul', name: '整数乘分数', grade: 5, lane: 2, req: ['g5-frac-int'], gen: ['frac', { op: 'wholeMul' }] },
  { id: 'g5-frac-intdiv', name: '整数除以分数', grade: 5, lane: 2, req: ['g6-frac-div', 'g3-div-basic'], gen: ['frac', { op: 'wholeDiv' }] },
  // Moved here from grade 6 by the 2026-09-30 grade-5 alignment decision: both
  // lessons are in the grade-5 books (五下·三 分数乘法（三）、五下·五 分数除法
  // （二）). Policy exception — "no moving forward" yields to filling the gap;
  // only the grade field changed, so reverting is a one-line change. The g6-
  // ids are kept for saved-progress compatibility (docs/curriculum.md,
  // grade 5 note).
  { id: 'g6-frac-mul', name: '分数乘分数', grade: 5, lane: 2, req: ['g5-frac-int'], gen: ['frac', { op: 'mul' }] },
  { id: 'g6-frac-div', name: '分数除以分数', grade: 5, lane: 2, req: ['g6-frac-mul'], gen: ['frac', { op: 'div' }] },
  { id: 'g5-frac-conv', name: '分数与小数', grade: 5, lane: 2, req: ['g5-frac-diff', 'g4-dec-add2'], gen: ['frac', { op: 'conv' }] },
  { id: 'g5-frac-mix', name: '分数加减混合', grade: 5, lane: 2, req: ['g5-frac-diff', 'g5-frac-reduce'], gen: ['frac', { op: 'mix' }] },
  { id: 'g5-dec-round', name: '保留两位小数', grade: 5, lane: 2, req: ['g4-round'], gen: ['round', { dec: true }] },
  { id: 'g5-dec-mix', name: '小数混合运算', grade: 5, lane: 2, req: ['g4-dec-mul', 'g5-dec-mul', 'g5-dec-div'], gen: ['dec3', { four: true }] },

  // ---------------------------------------------------------------- grade 6
  { id: 'g6-frac-dec', name: '小数乘分数', grade: 6, lane: 2, req: ['g6-frac-div', 'g5-dec-div'], gen: ['frac', { op: 'decimal' }] },
  // 六上·二 分数混合运算（一）（二），the two lessons merged into one skill.
  { id: 'g6-frac-chain', name: '分数混合运算', grade: 6, lane: 2, req: ['g6-frac-div', 'g5-frac-intmul'], gen: ['frac', { op: 'chain' }] },
  // Moved here from grade 5 by the 2026-09-30 grade-5 alignment decision: the
  // lesson is 六上·七 百分数的应用, neither grade-5 book has one. Only the
  // grade field changed, so the g5- id stays valid for saved progress.
  { id: 'g5-percent', name: '百分数', grade: 6, lane: 3, req: ['g4-dec-mul'], gen: ['percent', {}] },
  // 六上·四 合格率 / 营养含量（互化）、六上·七 百分数的应用（一）（二）：
  // 合格率、百分数的应用(一)、这月我当家的除法方向 merged into g6-pct-rate.
  { id: 'g6-pct-conv', name: '百分数互化', grade: 6, lane: 3, req: ['g5-percent', 'g5-frac-conv'], gen: ['percent', { mode: 'conv' }] },
  { id: 'g6-pct-rate', name: '求百分率', grade: 6, lane: 3, req: ['g5-percent', 'g6-pct-conv'], gen: ['percent', { mode: 'rate' }] },
  { id: 'g6-pct-more', name: '多（少）百分之几的数', grade: 6, lane: 3, req: ['g6-pct-conv'], gen: ['percent', { mode: 'more' }] },
  // g6-ratio 的 ext 扩展 = 六上·六 比的化简的小数比、分数比形态（六下·总复习 书84 再现）。
  { id: 'g6-ratio', name: '相等的比', grade: 6, lane: 3, req: ['g5-lcm'], gen: ['ratio', { ext: true }] },
  { id: 'g6-ratio-quo', name: '求比值', grade: 6, lane: 3, req: ['g5-frac-quo'], gen: ['ratio', { mode: 'quo' }] },
  { id: 'g6-ratio-solve', name: '解比例', grade: 6, lane: 3, req: ['g6-ratio', 'g6-ratio-quo'], gen: ['ratio', { mode: 'solve' }] },
  // 六上·二 分数混合运算(三)、六上·四 这月我当家、六上·七 百分数的应用(三)：
  // three lessons with fraction / percent coefficients merged into one skill.
  { id: 'g6-eq-frac', name: '分数与百分数方程', grade: 6, lane: 3, req: ['g4-eq-2', 'g6-frac-div'], gen: ['eq', { frac: true }] },
  { id: 'g6-letter', name: '求x', grade: 6, lane: 3, req: ['g4-order'], gen: ['letter', {}] },
];

export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

// Depth in the tree = longest prerequisite chain (roots are 0).
export const DEPTH = (() => {
  const memo = {};
  const d = (id) => memo[id] ?? (memo[id] = SKILL[id].req.length ? 1 + Math.max(...SKILL[id].req.map(d)) : 0);
  for (const s of SKILLS) d(s.id);
  return memo;
})();

export const skillsOfGrade = (g) => SKILLS.filter((s) => s.grade === g);
