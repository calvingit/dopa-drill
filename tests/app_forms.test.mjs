// Question forms (docs/SPEC.md 6.1): the extra generators and the two
// transforms of column problems.
//
// Every case recomputes the arithmetic from the numbers the generator recorded
// in `calc`, so a wording bug cannot pass silently. The transforms are held to
// one invariant each, stated in the test name: one blank that is uniquely
// determined, and one corrupted digit with everything else exact.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRng, makeProblem, applyStyle, styleProblem, signature,
  ANSWER_RE, STYLE_KINDS, PUZZLE_KINDS, _internal,
} from '../app/js/problems.js';
import { SKILLS } from '../app/js/skills.js';

const { GEN } = _internal;

const calc = (op, a, b) => (op === '＋' ? a + b : op === '−' ? a - b : a * b);

// Rebuild the number in row r, replacing any cell listed in `overrides`.
function rowNumber(p, r, overrides = {}) {
  const digits = p.cells
    .filter((c) => c.r === r && /^[0-9]$/.test(c.text))
    .sort((x, y) => x.c - y.c)
    .map((c) => (c.id in overrides ? overrides[c.id] : c.text))
    .join('');
  return Number(digits);
}

// ---------------------------------------------------------------- generators

test('compare: the sign is decided by the two sides', () => {
  const rng = makeRng(31);
  const signs = new Set();
  for (let i = 0; i < 400; i++) {
    const p = GEN.compare(rng);
    const c = p.calc;
    assert.equal(calc(c.op, c.a, c.b), c.left, p.text);
    assert.equal(c.rel, c.left < c.right ? '<' : c.left > c.right ? '>' : '=', p.text);
    assert.equal(p.answer, c.rel, p.text);
    assert.equal(p.steps.map((s) => s.digit).join(''), c.rel, p.text);
    assert.match(c.rel, ANSWER_RE);
    signs.add(c.rel);
  }
  assert.deepEqual([...signs].sort(), ['<', '=', '>']);
});

test('judge: the claim is right exactly when the answer says √', () => {
  const rng = makeRng(32);
  const marks = new Set();
  for (let i = 0; i < 400; i++) {
    const p = GEN.judge(rng);
    const c = p.calc;
    const truth = calc(c.op, c.a, c.b);
    assert.equal(c.truth, truth, p.text);
    assert.equal(c.right, c.claim === truth, `${p.text}: claim ${c.claim}, truth ${truth}`);
    assert.ok(c.claim >= 0, p.text);
    assert.equal(p.answer, c.right ? '√' : '×', p.text);
    assert.equal(p.steps.map((s) => s.digit).join(''), p.answer, p.text);
    marks.add(p.answer);
  }
  assert.deepEqual([...marks].sort(), ['×', '√']);
});

test('blank: the hidden number restores the equation', () => {
  const rng = makeRng(33);
  const divForms = new Set();
  for (const ops of ['addsub', 'muldiv']) {
    for (let i = 0; i < 300; i++) {
      const p = GEN.blank(rng, { ops });
      const { a, b, op, x, result, blank } = p.calc;
      assert.equal(p.answer, String(blank), p.text);
      assert.equal(p.steps.map((s) => s.digit).join(''), String(blank), p.text);
      if (op === '＋') assert.equal((a !== undefined ? a : b) + blank, result, p.text);
      else if (op === '−') assert.equal(a !== undefined ? a - blank : blank - b, result, p.text);
      else if (op === '×') assert.equal(a * blank, result, p.text);
      else {
        assert.equal(b * x, result, p.text);
        divForms.add(blank === result ? 'dividend' : 'divisor');
      }
      assert.ok(blank >= 1, `${p.text}: blank is ${blank}`);
    }
  }
  // □ ÷ b ＝ x and a ÷ □ ＝ b both appear.
  assert.deepEqual([...divForms].sort(), ['dividend', 'divisor']);
});

test('balance: both sides weigh the same', () => {
  const rng = makeRng(34);
  for (let i = 0; i < 300; i++) {
    const p = GEN.balance(rng);
    const c = p.calc;
    assert.equal(c.lhsOp === '×' ? c.a * c.x : c.a + c.x, c.rhs, p.text);
    assert.equal(p.answer, String(c.x), p.text);
    assert.ok(c.x >= 1 && c.x <= 99, p.text);
  }
});

test('place: the answer is the value the words name', () => {
  const rng = makeRng(35);
  const forms = new Set();
  for (let i = 0; i < 400; i++) {
    const p = GEN.place(rng);
    const c = p.calc;
    forms.add(c.form);
    if (c.form === 'decompose') {
      assert.equal(c.tens * 10 + c.ones, c.n, p.text);
      assert.equal(p.answer, String(c.ones), p.text);
    } else {
      assert.equal(c.value, c.form === 'hundreds' ? c.k * 100 : c.k * 10, p.text);
      assert.equal(p.answer, String(c.value), p.text);
    }
    assert.equal(p.steps.map((s) => s.digit).join(''), p.answer, p.text);
  }
  assert.deepEqual([...forms].sort(), ['decompose', 'hundreds', 'tens']);
});

test('units: conversions use the exact factor', () => {
  const rng = makeRng(36);
  for (let i = 0; i < 400; i++) {
    const p = GEN.units(rng);
    const c = p.calc;
    assert.equal(c.ans, c.v * c.factor, p.text);
    assert.notEqual(c.big, c.small, p.text);
    assert.equal(p.answer, String(c.ans), p.text);
    assert.equal(p.steps.map((s) => s.digit).join(''), p.answer, p.text);
  }
});

test('time: minutes carry at sixty and hours stay one digit', () => {
  const rng = makeRng(37);
  let added = 0; let subbed = 0;
  for (let i = 0; i < 400; i++) {
    const p = GEN.time(rng);
    const c = p.calc;
    if (c.sub) subbed += 1; else added += 1;
    const t1 = c.h1 * 60 + c.m1;
    const t2 = c.sub ? t1 - c.delta : t1 + c.delta;
    assert.equal(t2, c.h2 * 60 + c.m2, p.text);
    assert.ok(c.h1 >= 1 && c.h1 <= 9, p.text);
    assert.ok(c.h2 >= 1 && c.h2 <= 9, p.text);
    assert.ok(c.m1 >= 0 && c.m1 < 60, p.text);
    assert.ok(c.m2 >= 10 && c.m2 < 60, `${p.text}: minutes are ${c.m2}`);
    assert.equal(p.answer, `${c.h2}${c.m2}`, p.text);
    assert.equal(p.steps.map((s) => s.digit).join(''), p.answer, p.text);
  }
  assert.ok(added > 100 && subbed > 100, `added ${added}, subbed ${subbed}`);
});

test('estimate: the factor is rounded to its leading place first', () => {
  const rng = makeRng(38);
  for (let i = 0; i < 400; i++) {
    const p = GEN.estimate(rng);
    const c = p.calc;
    const unit = c.a >= 100 ? 100 : 10;
    assert.equal(c.rounded, Math.round(c.a / unit) * unit, p.text);
    assert.notEqual(c.rounded, c.a, p.text);
    assert.ok(Math.abs(c.a - c.rounded) <= unit / 2, p.text);
    assert.equal(c.ans, c.rounded * c.b, p.text);
    assert.equal(p.answer, String(c.ans), p.text);
  }
});

test('sequence: every term follows the stated rule', () => {
  const rng = makeRng(39);
  const rules = new Set();
  for (let i = 0; i < 400; i++) {
    const p = GEN.sequence(rng);
    const { terms, rule } = p.calc;
    rules.add(rule.kind);
    assert.equal(terms.length, 5, p.text);
    terms.forEach((v, k) => {
      const want = rule.kind === 'mul' ? rule.start * rule.k ** k : rule.start + rule.d * k;
      assert.equal(v, want, `${p.text}: term ${k}`);
    });
    assert.equal(p.answer, String(terms[3]), p.text);
    assert.equal(p.steps.map((s) => s.digit).join(''), p.answer, p.text);
  }
  assert.deepEqual([...rules].sort(), ['add', 'mul']);
});

// ---------------------------------------------------------------- transforms

test('missing: one blank, uniquely determined, the rest untouched', () => {
  const rng = makeRng(41);
  let seen = 0;
  for (const sk of SKILLS) {
    for (let i = 0; i < 4; i++) {
      const p = makeProblem(sk.id, rng);
      const q = applyStyle(p, 'missing', rng);
      if (!q) {
        // Letter puzzles are their own question and take no transform.
        const hasPoint = p.cells.some((c) => c.text === '.');
        assert.ok(!(STYLE_KINDS.has(p.kind) && !hasPoint && !p.letters), `${sk.id} ${p.text}: should support missing`);
        continue;
      }
      seen += 1;
      const inputs = q.cells.filter((c) => c.kind === 'input');
      assert.equal(inputs.length, 1, `${sk.id} ${p.text}`);
      assert.equal(q.steps.length, 1, `${sk.id} ${p.text}`);
      assert.equal(q.steps[0].cell, inputs[0].id);

      // The expected digit is the one the original problem showed there.
      const target = p.cells.find((c) => c.id === q.steps[0].cell);
      assert.equal(target.kind, 'given', `${sk.id}: blank must come from a known digit`);
      assert.equal(q.steps[0].digit, target.text, `${sk.id} ${p.text}`);

      // Nothing else moved: same cells, same digits, same answer.
      assert.deepEqual(q.cells.map((c) => c.id), p.cells.map((c) => c.id), sk.id);
      for (const c of q.cells) assert.equal(c.text, p.cells.find((x) => x.id === c.id).text, `${sk.id} ${c.id}`);
      assert.equal(q.answer, p.answer, sk.id);
      assert.equal(q.showAll, true, sk.id);

      // Exactly one digit restores the arithmetic.
      const want = Number(p.answer);
      let solutions = 0;
      for (let d = 0; d <= 9; d += 1) {
        const a = rowNumber(q, 1, { [target.id]: String(d) });
        const b = rowNumber(q, 2, { [target.id]: String(d) });
        const got = p.kind === 'add' ? a + b : p.kind === 'sub' ? a - b : a * b;
        if (got === want) solutions += 1;
      }
      assert.equal(solutions, 1, `${sk.id} ${p.text}: ${solutions} digits fit the blank`);
    }
  }
  assert.ok(seen >= 60, `only ${seen} missing samples`);
});

test('find-error: exactly one corrupted digit, everything else exact', () => {
  const rng = makeRng(42);
  let seen = 0;
  for (const sk of SKILLS) {
    for (let i = 0; i < 4; i++) {
      const p = makeProblem(sk.id, rng);
      const q = applyStyle(p, 'find-error', rng);
      if (!q) {
        // Only a problem without any numeric input cell can refuse; letter
        // puzzles take no transform at all.
        assert.ok(p.letters || !p.cells.some((c) => c.kind === 'input' && /^[0-9]$/.test(c.text)), `${sk.id} ${p.text}`);
        continue;
      }
      seen += 1;
      const inputs = q.cells.filter((c) => c.kind === 'input');
      assert.equal(inputs.length, 1, `${sk.id} ${p.text}`);
      assert.equal(q.steps.length, 1, `${sk.id} ${p.text}`);
      const target = inputs[0];
      assert.equal(q.steps[0].cell, target.id, sk.id);
      assert.equal(q.steps[0].digit, target.text, `${sk.id} ${p.text}`);

      // The cell shows a wrong digit; the expected one is the original.
      assert.equal(q.findError.cell, target.id, sk.id);
      assert.equal(q.findError.right, q.steps[0].digit, sk.id);
      assert.equal(target.pre, q.findError.wrong, sk.id);
      assert.notEqual(target.pre, target.text, `${sk.id} ${p.text}`);
      assert.match(target.pre, /^[0-9]$/);

      // Every other cell is exactly the true working, with no prefilled value.
      assert.deepEqual(q.cells.map((c) => c.id), p.cells.map((c) => c.id), sk.id);
      for (const c of q.cells) {
        assert.equal(c.text, p.cells.find((x) => x.id === c.id).text, `${sk.id} ${c.id}`);
        if (c.id !== target.id) assert.equal(c.pre, undefined, `${sk.id} ${c.id} prefilled`);
      }
      assert.equal(q.answer, p.answer, sk.id);
    }
  }
  assert.ok(seen >= 400, `only ${seen} find-error samples`);
});

test('puzzle: several blanks, at most one per column, uniquely solvable', () => {
  const rng = makeRng(43);
  let seen = 0;
  for (const sk of SKILLS) {
    for (let i = 0; i < 4; i += 1) {
      const p = makeProblem(sk.id, rng);
      const q = applyStyle(p, 'puzzle', rng);
      if (!q) {
        const hasPoint = p.cells.some((c) => c.text === '.');
        assert.ok(!(PUZZLE_KINDS.has(p.kind) && !hasPoint && !p.letters), `${sk.id} ${p.text}: should support puzzle`);
        continue;
      }
      seen += 1;
      const inputs = q.cells.filter((c) => c.kind === 'input');
      assert.equal(inputs.length, q.steps.length, `${sk.id} ${p.text}`);
      assert.ok(inputs.length >= 2 && inputs.length <= 4, `${sk.id} ${p.text}: ${inputs.length} blanks`);
      assert.equal(q.free, true, sk.id);
      assert.equal(q.puzzle.blanks, inputs.length, sk.id);

      // One blank per column is the whole uniqueness argument — enforce it.
      const cols = inputs.map((c) => c.c);
      assert.equal(new Set(cols).size, cols.length, `${sk.id} ${p.text}: two blanks share a column`);

      // Nothing else moved.
      assert.deepEqual(q.cells.map((c) => c.id), p.cells.map((c) => c.id), sk.id);
      for (const c of q.cells) assert.equal(c.text, p.cells.find((x) => x.id === c.id).text, `${sk.id} ${c.id}`);
      assert.equal(q.answer, p.answer, sk.id);

      // Brute force: exactly one assignment reproduces the arithmetic.
      const rows = [1, 2, 3].map((r) => q.cells
        .filter((c) => c.r === r && /^[0-9]$/.test(c.text))
        .sort((a, b) => a.c - b.c));
      const value = (r, ov) => Number(rows[r - 1].map((c) => (c.id in ov ? ov[c.id] : c.text)).join(''));
      let solutions = 0;
      const total = 10 ** inputs.length;
      for (let v = 0; v < total; v += 1) {
        const ov = {};
        let rest = v;
        for (const b of inputs) { ov[b.id] = String(rest % 10); rest = Math.floor(rest / 10); }
        const a = value(1, ov); const b = value(2, ov); const r = value(3, ov);
        if ((p.kind === 'add' ? a + b : a - b) === r) solutions += 1;
      }
      assert.equal(solutions, 1, `${sk.id} ${p.text}: ${solutions} assignments fit`);
    }
  }
  assert.ok(seen >= 30, `only ${seen} puzzle samples`);
});

test('letterSum: same letter, same digit, and the map is unique', () => {
  const rng = makeRng(45);
  const shapes = new Set();
  let seen = 0;
  for (let i = 0; i < 400; i += 1) {
    const q = GEN.letterSum(rng);
    const c = q.calc;
    shapes.add(c.shape);
    seen += 1;
    // The recorded arithmetic reproduces the printed result.
    assert.equal(c.op === '−' ? c.a - c.b : c.a + c.b, c.R, q.text);
    // Each letter's value differs from every printed digit and from the others.
    const printed = [...String(c.R).split('').map(Number)];
    if (c.shape === 2) printed.push(Number(q.text.match(/＋ (\d)A/)[1]), Number(q.text.match(/A(\d) ＋/)[1]));
    for (const [name, digit] of Object.entries(c.letters)) {
      assert.ok(!printed.includes(digit), `${q.text}: ${name}＝${digit} is printed`);
      for (const [other, odigit] of Object.entries(c.letters)) {
        if (other !== name) assert.notEqual(digit, odigit, q.text);
      }
    }
    // One input cell per letter occurrence, all expecting the letter's digit.
    const letterCells = q.cells.filter((x) => x.letter);
    assert.equal(q.steps.length, letterCells.length, q.text);
    assert.equal(q.free, true, q.text);
    for (const st of q.steps) {
      const cell = q.cells.find((x) => x.id === st.cell);
      assert.equal(st.digit, q.letters[cell.letter], q.text);
      assert.equal(cell.kind, 'input', q.text);
      assert.equal(cell.ph, cell.letter, q.text);
    }
    // Everything without a letter is printed.
    for (const x of q.cells) {
      if (x.letter) continue;
      assert.ok(x.kind !== 'input', `${q.text}: ${x.id} should be printed`);
    }

    // Brute force: exactly one letter map reproduces the printed result.
    const names = Object.keys(q.letters);
    const rows = [1, 2, 3].map((r) => q.cells
      .filter((x) => x.r === r && /^[0-9]$/.test(x.text))
      .sort((p1, p2) => p1.c - p2.c));
    const value = (r, ov) => Number(rows[r - 1].map((x) => (x.id in ov ? ov[x.id] : x.text)).join(''));
    let solutions = 0;
    for (let v = 0; v < 10 ** names.length; v += 1) {
      const ov = {};
      let rest = v;
      for (const n of names) {
        const d = rest % 10;
        rest = (rest - d) / 10;
        for (const x of letterCells) if (x.letter === n) ov[x.id] = String(d);
      }
      const a = value(1, ov); const b = value(2, ov); const res = value(3, ov);
      if ((c.op === '−' ? a - b : a + b) === res) solutions += 1;
    }
    assert.equal(solutions, 1, `${q.text}: ${solutions} letter maps fit`);
  }
  assert.ok(seen === 400, seen);
  assert.deepEqual([...shapes].sort().map(Number), [0, 1, 2]);
});

test('makeProblem takes a style, and an unsupported one falls back to direct', () => {
  const a = makeProblem('g2-vadd2-c', makeRng(7), null, 'missing');
  const b = makeProblem('g2-vadd2-c', makeRng(7), null, 'missing');
  assert.equal(a.style, 'missing');
  assert.equal(signature(a), signature(b), 'a styled problem must replay from its seed');
  assert.notEqual(signature(a), signature(makeProblem('g2-vadd2-c', makeRng(7))));

  // compose is a horizontal one-cell question: nothing to blank.
  const c = makeProblem('g1-compose10', makeRng(7), null, 'missing');
  assert.equal(c.style, undefined);

  // Unknown styles are not silently applied either.
  assert.equal(applyStyle(a, 'nope', makeRng(1)), null);
});

test('styleProblem is deterministic and only ever yields a valid form', () => {
  const rng = makeRng(50);
  let styled = 0;
  for (let i = 0; i < 200; i += 1) {
    const p = makeProblem('g2-vadd2-c', rng);
    const q = styleProblem(p, rng);
    assert.ok(!q.style || ['missing', 'find-error', 'puzzle'].includes(q.style), q.style);
    // A restyled question always leaves exactly one cell to fill.
    if (q.style) {
      styled += 1;
      const n = q.cells.filter((c) => c.kind === 'input').length;
      assert.equal(n, q.steps.length, `${q.title} ${q.text}`);
      assert.ok(q.style === 'puzzle' ? n >= 2 : n === 1, `${q.style} with ${n} cells`);
    } else {
      assert.equal(q, p);
    }
  }
  assert.ok(styled > 20 && styled < 140, `styled ${styled} of 200`);
});