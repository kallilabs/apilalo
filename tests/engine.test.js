import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, TowerGame } from '../src/game/engine.js';

// Deterministic game: fixed hue and always the same swing direction.
const newGame = () => {
  const game = new TowerGame({ random: () => 0.1 });
  game.idle = false;
  game.reset();
  return game;
};

/** Places the moving block at a given offset from the block below and drops it. */
function dropAt(game, offset) {
  const cur = game.current;
  cur[cur.axis] = game.top[cur.axis] + offset;
  return game.drop();
}

test('a drop within tolerance is perfect and keeps the full size', () => {
  const game = newGame();
  const result = dropAt(game, RULES.perfectTolerance);
  assert.equal(result.kind, 'perfect');
  assert.equal(result.score, 1);
  assert.equal(game.top.w, RULES.baseSize);
  assert.equal(game.top.d, RULES.baseSize);
  assert.equal(game.top.x, 0, 'a perfect drop snaps onto the block below');
});

test('an offset drop trims the overhang and drops it as debris', () => {
  const game = newGame();
  const axis = game.current.axis;
  const size = axis === 'x' ? 'w' : 'd';
  const result = dropAt(game, 30);
  assert.equal(result.kind, 'cut');
  assert.equal(game.top[size], RULES.baseSize - 30);
  assert.equal(game.top[axis], 15, 'the kept part is centered on the overlap');
  assert.equal(game.debris.length, 1);
  assert.equal(game.debris[0][size], 30);
});

test('missing the tower completely ends the run without scoring', () => {
  const game = newGame();
  dropAt(game, 10);
  const result = dropAt(game, RULES.baseSize + 1);
  assert.equal(result.kind, 'miss');
  assert.equal(result.score, 1);
  assert.equal(game.over, true);
  assert.equal(game.drop(), null, 'nothing more can be dropped after game over');
});

test('three perfects in a row make the block grow back, capped at full size', () => {
  const game = newGame();
  dropAt(game, 40);
  const shrunk = Math.min(game.top.w, game.top.d);
  dropAt(game, 0);
  dropAt(game, 0);
  const third = dropAt(game, 0);
  assert.equal(third.combo, 3);
  assert.equal(third.grew, true);
  assert.equal(Math.min(game.top.w, game.top.d), shrunk + RULES.growAmount);

  for (let i = 0; i < 20; i++) dropAt(game, 0);
  assert.equal(game.top.w, RULES.baseSize);
  assert.equal(game.top.d, RULES.baseSize);
});

test('a cut resets the streak', () => {
  const game = newGame();
  dropAt(game, 0);
  dropAt(game, 0);
  const result = dropAt(game, 20);
  assert.equal(result.combo, 0);
  assert.equal(game.bestCombo, 2);
  assert.equal(game.perfects, 2);
});

test('speed rises with height and is capped', () => {
  const game = newGame();
  assert.equal(game.speed, RULES.baseSpeed);
  for (let i = 0; i < 200; i++) dropAt(game, 0);
  assert.equal(game.speed, RULES.maxSpeed);
  game.idle = true;
  assert.equal(game.speed, RULES.idleSpeed);
});

test('the moving block bounces inside its travel range', () => {
  const game = newGame();
  const axis = game.current.axis;
  for (let i = 0; i < 500; i++) {
    game.tick(0.05);
    assert.ok(Math.abs(game.current[axis] - game.top[axis]) <= RULES.travel);
  }
});

test('reset starts a fresh tower', () => {
  const game = newGame();
  dropAt(game, 0);
  dropAt(game, RULES.baseSize + 5);
  game.reset();
  assert.equal(game.score, 0);
  assert.equal(game.over, false);
  assert.equal(game.stack.length, 1);
  assert.ok(game.current);
});
