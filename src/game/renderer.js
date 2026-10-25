// Isometric canvas drawing. Pure drawing functions: they read game state and a
// view, and never change either.

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

/** @typedef {{cx:number, cy:number, k:number, camY:number}} View  screen center, scale, camera height */

function project(view, x, y, z) {
  return [
    view.cx + (x - z) * COS30 * view.k,
    view.cy + (x + z) * SIN30 * view.k - (y - view.camY) * view.k
  ];
}

function fillPolygon(ctx, points, color) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

export function drawBlock(ctx, view, b, alpha = 1) {
  const P = (x, y, z) => project(view, x, y, z);
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
  const yb = b.y, yt = b.y + b.h;
  const sat = b.pedestal ? 24 : 72;
  const [lTop, lLeft, lRight] = b.pedestal ? [64, 54, 44] : [70, 58, 47];
  ctx.globalAlpha = alpha;
  fillPolygon(ctx, [P(x0, yt, z0), P(x1, yt, z0), P(x1, yt, z1), P(x0, yt, z1)], `hsl(${b.hue},${sat}%,${lTop}%)`);
  fillPolygon(ctx, [P(x0, yt, z1), P(x1, yt, z1), P(x1, yb, z1), P(x0, yb, z1)], `hsl(${b.hue},${sat}%,${lLeft}%)`);
  fillPolygon(ctx, [P(x1, yt, z0), P(x1, yt, z1), P(x1, yb, z1), P(x1, yb, z0)], `hsl(${b.hue},${sat}%,${lRight}%)`);
  ctx.globalAlpha = 1;
}

export function paintSky(ctx, width, height, hue) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, `hsl(${hue + 40},60%,90%)`);
  g.addColorStop(1, `hsl(${hue + 10},50%,77%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function drawFlash(ctx, view, flash, color) {
  const b = flash.block, grow = 1 + flash.t * 1.4, yt = b.y + b.h;
  const hw = b.w * grow / 2, hd = b.d * grow / 2;
  const pts = [
    project(view, b.x - hw, yt, b.z - hd), project(view, b.x + hw, yt, b.z - hd),
    project(view, b.x + hw, yt, b.z + hd), project(view, b.x - hw, yt, b.z + hd)
  ];
  ctx.globalAlpha = Math.max(0, 1 - flash.t / 0.45);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * Draws the whole scene. Debris behind the tower is drawn first so pieces
 * falling off the near side stay in front.
 */
export function drawScene(ctx, view, game, { width, height, skyHue, flashColor }) {
  paintSky(ctx, width, height, skyHue);
  const depth = game.top.x + game.top.z;
  const fade = d => Math.min(1, d.life * 1.5);
  for (const d of game.debris) if (d.x + d.z < depth) drawBlock(ctx, view, d, fade(d));
  for (const b of game.stack) {
    const belowScreen = (view.camY - (b.y + b.h)) * view.k > height * 1.2;
    if (!b.pedestal && belowScreen) continue;
    drawBlock(ctx, view, b);
  }
  if (game.current) drawBlock(ctx, view, game.current);
  for (const d of game.debris) if (d.x + d.z >= depth) drawBlock(ctx, view, d, fade(d));
  for (const f of game.flashes) drawFlash(ctx, view, f, flashColor);
}

/** Smoothly follows the top of the tower and zooms out to show it all at the end. */
export class Camera {
  constructor() {
    this.y = 0; this.targetY = 0;
    this.zoom = 1; this.targetZoom = 1;
    this.anchor = 0.56; this.targetAnchor = 0.56; // vertical screen position of the tower top, 0..1
  }

  reset() {
    this.y = this.targetY = 0;
    this.zoom = this.targetZoom = 1;
    this.anchor = this.targetAnchor = 0.56;
  }

  follow(topY) { this.targetY = topY; }

  /** Frames the full tower in the upper part of the screen. */
  showWhole(topY, baseScale, screenHeight, baseSize) {
    if (topY > 0) {
      const fitScale = (screenHeight * 0.38) / (topY + baseSize * 1.4);
      this.targetZoom = Math.max(0.1, Math.min(1, fitScale / baseScale));
      this.targetY = topY / 2;
    }
    this.targetAnchor = 0.33;
  }

  update(dt) {
    const ease = rate => Math.min(1, dt * rate);
    this.y += (this.targetY - this.y) * ease(6);
    this.zoom += (this.targetZoom - this.zoom) * ease(3.5);
    this.anchor += (this.targetAnchor - this.anchor) * ease(3.5);
  }
}
