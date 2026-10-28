// The input cursor: which cell is being judged, how many are done, and
// whether the problem is finished. Pure state so both modes are unit-tested;
// main.js owns the DOM.
//
// Ordered problems (the default) walk p.steps in order. Free problems
// (p.free — the digit-puzzle form) accept any remaining cell, so the player
// can tap them in whatever order the deduction suggests; the cursor then
// auto-advances to the first unfilled cell. Nothing else about judging
// changes: a step is still one character expected in one cell.

export function newCursor(p) {
  return p && p.free
    ? { focus: p.steps[0] ? p.steps[0].cell : null, done: [] }
    : { i: 0 };
}

// The step to judge against right now, or null when nothing is left.
export function stepAt(p, cur) {
  if (!p || !p.steps.length) return null;
  if (!p.free) return p.steps[cur ? cur.i : 0] || null;
  if (!cur) return p.steps[0];
  const focused = p.steps.find((s) => s.cell === cur.focus);
  if (focused && !cur.done.includes(focused.cell)) return focused;
  return p.steps.find((s) => !cur.done.includes(s.cell)) || null;
}

// Accept one correct cell and move on.
export function accept(p, cur, step) {
  if (!p.free) return { i: cur.i + 1 };
  const done = [...cur.done, step.cell];
  const next = p.steps.find((s) => !done.includes(s.cell));
  return { focus: next ? next.cell : cur.focus, done };
}

// Free mode only: point the cursor at an unfilled cell. A filled cell or an
// unknown id keeps the cursor as it is.
export function focusCell(p, cur, id) {
  if (!p || !p.free || !cur || cur.done.includes(id)) return cur;
  return p.steps.some((s) => s.cell === id) ? { ...cur, focus: id } : cur;
}

// Accepted cells so far. Dopa, digitsDone and the reach countdown all read
// this instead of a step index, so free-order filling scores the same as
// in-order filling of the same problem.
export const filled = (p, cur) => (p.free ? (cur ? cur.done.length : 0) : cur ? cur.i : 0);

export const complete = (p, cur) => !!p && filled(p, cur) >= p.steps.length;