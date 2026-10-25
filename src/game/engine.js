// Core rules of the stacking game. No DOM, canvas or platform code lives here,
// so the rules can be tested in isolation (see tests/engine.test.js).

export const RULES = Object.freeze({
  blockHeight: 20,
  baseSize: 100,        // full block width/depth in world units
  travel: 125,          // how far a moving block swings from the tower axis
  perfectTolerance: 7,  // offset (world units) still counted as a perfect drop
  growAmount: 8,        // size regained per perfect drop once the streak reaches growStreak
  growStreak: 3,
  idleSpeed: 110,       // speed while the intro screen is showing
  baseSpeed: 150,
  speedPerFloor: 4,
  maxSpeed: 340,
  pedestalHeight: 4000,
  hueStep: 7
});

/** @typedef {{x:number, z:number, w:number, d:number, y:number, h:number, hue:number, pedestal?:boolean}} Block */
/** @typedef {Block & {axis:'x'|'z', dir:1|-1}} MovingBlock */
/** @typedef {{kind:'perfect'|'cut'|'miss', score:number, combo:number, grew:boolean}} DropResult */

export class TowerGame {
  /** @param {{random?: () => number}} [options] */
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.hue0 = random() * 360;
    this.idle = true;
    this.reset();
  }

  reset() {
    const { baseSize, pedestalHeight } = RULES;
    /** @type {Block[]} */
    this.stack = [{ x: 0, z: 0, w: baseSize, d: baseSize, y: -pedestalHeight, h: pedestalHeight, hue: this.hue0, pedestal: true }];
    /** @type {Array<Block & {axis:'x'|'z', vy:number, vh:number, life:number}>} */
    this.debris = [];
    /** @type {Array<{block: Block, t: number}>} */
    this.flashes = [];
    this.score = 0;
    this.combo = 0;
    this.perfects = 0;
    this.bestCombo = 0;
    this.over = false;
    this.spawn();
  }

  get top() { return this.stack[this.stack.length - 1]; }
  get topY() { return this.top.y + this.top.h; }

  get speed() {
    if (this.idle) return RULES.idleSpeed;
    return Math.min(RULES.baseSpeed + this.score * RULES.speedPerFloor, RULES.maxSpeed);
  }

  spawn() {
    const prev = this.top;
    const axis = this.stack.length % 2 ? 'x' : 'z';
    const dir = this.random() < 0.5 ? 1 : -1;
    /** @type {MovingBlock} */
    const block = {
      x: prev.x, z: prev.z, w: prev.w, d: prev.d,
      y: prev.y + prev.h, h: RULES.blockHeight,
      hue: this.hue0 + (this.score + 1) * RULES.hueStep,
      axis, dir
    };
    block[axis] = prev[axis] - dir * RULES.travel;
    this.current = block;
  }

  /** Advances the moving block, falling debris and perfect-drop flashes. */
  tick(dt) {
    const cur = this.current;
    if (cur && !this.over) {
      const prev = this.top;
      const a = cur.axis, lo = prev[a] - RULES.travel, hi = prev[a] + RULES.travel;
      cur[a] += cur.dir * this.speed * dt;
      if (cur[a] > hi) { cur[a] = hi; cur.dir = -1; }
      else if (cur[a] < lo) { cur[a] = lo; cur.dir = 1; }
    }
    for (const d of this.debris) {
      d.vy -= 1200 * dt;
      d.y += d.vy * dt;
      d[d.axis] += d.vh * dt;
      d.life -= dt;
    }
    this.debris = this.debris.filter(d => d.life > 0);
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter(f => f.t < 0.45);
  }

  /**
   * Drops the moving block onto the tower.
   * @returns {DropResult | null} null when there is nothing to drop.
   */
  drop() {
    const cur = this.current;
    if (!cur || this.over) return null;

    const prev = this.top;
    const a = cur.axis, size = a === 'x' ? 'w' : 'd';
    const delta = cur[a] - prev[a];
    const offset = Math.abs(delta);
    let kind = 'cut', grew = false;

    if (offset <= RULES.perfectTolerance) {
      kind = 'perfect';
      cur[a] = prev[a];
      this.combo++;
      this.perfects++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (this.combo >= RULES.growStreak) {
        cur.w = Math.min(RULES.baseSize, cur.w + RULES.growAmount);
        cur.d = Math.min(RULES.baseSize, cur.d + RULES.growAmount);
        grew = true;
      }
    } else {
      const overlap = prev[size] - offset;
      if (overlap <= 0) {
        this.debris.push({ ...cur, vy: 0, vh: Math.sign(delta) * 80, life: 2.2 });
        this.current = null;
        this.combo = 0;
        this.over = true;
        return { kind: 'miss', score: this.score, combo: 0, grew: false };
      }
      const center = prev[a] + delta / 2;
      const piece = { ...cur, vy: 0, vh: Math.sign(delta) * 50, life: 1.6 };
      piece[size] = offset;
      piece[a] = center + Math.sign(delta) * (overlap + offset) / 2;
      cur[size] = overlap;
      cur[a] = center;
      this.debris.push(piece);
      this.combo = 0;
    }

    const { axis, dir, ...placed } = cur;
    this.stack.push(placed);
    if (kind === 'perfect') this.flashes.push({ block: placed, t: 0 });
    this.score++;
    this.spawn();
    return { kind, score: this.score, combo: this.combo, grew };
  }
}
