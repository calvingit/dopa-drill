// The input cursor (app/js/input.js): pure state for both question modes.
// Ordered problems must behave exactly as before the module existed; free
// problems accept any remaining cell and auto-advance. Filling the same free
// problem in any order must land on the same end state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCursor, stepAt, accept, focusCell, filled, complete } from '../app/js/input.js';

const ordered = {
  kind: 'add', steps: [
    { cell: 's2', digit: '6' },
    { cell: 's1', digit: '2' },
  ],
};
const free = {
  kind: 'add', free: true, steps: [
    { cell: 'a1', digit: '7' },
    { cell: 'b2', digit: '3' },
    { cell: 's2', digit: '0' },
  ],
};

test('ordered mode walks the steps in order and ignores focus requests', () => {
  let cur = newCursor(ordered);
  assert.equal(filled(ordered, cur), 0);
  assert.ok(!complete(ordered, cur));
  assert.equal(stepAt(ordered, cur).cell, 's2');

  cur = accept(ordered, cur, stepAt(ordered, cur));
  assert.equal(filled(ordered, cur), 1);
  assert.equal(stepAt(ordered, cur).cell, 's1');
  assert.equal(focusCell(ordered, cur, 's2'), cur, 'ordered mode has no free focus');

  cur = accept(ordered, cur, stepAt(ordered, cur));
  assert.equal(stepAt(ordered, cur), null);
  assert.ok(complete(ordered, cur));
});

test('free mode follows the focus, then auto-advances to the first unfilled', () => {
  let cur = newCursor(free);
  assert.equal(stepAt(free, cur).cell, 'a1');

  cur = focusCell(free, cur, 's2');
  assert.equal(stepAt(free, cur).cell, 's2', 'the tapped cell is judged next');

  cur = accept(free, cur, stepAt(free, cur));
  assert.equal(filled(free, cur), 1);
  assert.equal(stepAt(free, cur).cell, 'a1', 'auto-advance takes the first unfilled');

  cur = accept(free, cur, stepAt(free, cur));
  cur = accept(free, cur, stepAt(free, cur));
  assert.ok(complete(free, cur));
  assert.equal(stepAt(free, cur), null);
  // The last focus stays put so the hero has somewhere to look.
  assert.ok(cur.focus);
});

test('free mode refuses to focus filled or unknown cells', () => {
  let cur = newCursor(free);
  cur = accept(free, cur, stepAt(free, cur)); // a1 done
  assert.equal(focusCell(free, cur, 'a1'), cur, 'already filled');
  assert.equal(focusCell(free, cur, 'nope'), cur, 'unknown cell');
  assert.notEqual(focusCell(free, cur, 's2'), cur);
});

test('any fill order lands on the same end state', () => {
  const orders = [['a1', 'b2', 's2'], ['s2', 'b2', 'a1'], ['b2', 's2', 'a1']];
  for (const order of orders) {
    let cur = newCursor(free);
    for (const cell of order) {
      cur = focusCell(free, cur, cell);
      const st = stepAt(free, cur);
      assert.equal(st.cell, cell, `focus moved to ${cell}`);
      cur = accept(free, cur, st);
    }
    assert.ok(complete(free, cur));
    assert.equal(filled(free, cur), 3);
    assert.equal(stepAt(free, cur), null);
  }
});

test('the cursor survives a missing problem or an empty step list', () => {
  assert.equal(stepAt(null, null), null);
  assert.equal(stepAt({ steps: [] }, newCursor({ steps: [] })), null);
  assert.equal(filled(ordered, null), 0);
  assert.ok(!complete(ordered, null));
  assert.equal(focusCell(ordered, null, 's2'), null);
  const empty = { steps: [] };
  assert.ok(complete(empty, newCursor(empty)), 'nothing to fill counts as done');
});