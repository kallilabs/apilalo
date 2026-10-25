// Draws the 1080×1920 challenge image (WhatsApp status size) from the finished tower.

import { drawBlock, paintSky } from './game/renderer.js';
import { RULES } from './game/engine.js';
import { floorsWord } from './challenge.js';

const WIDTH = 1080;
const HEIGHT = 1920;
const DISPLAY_FONT = '"Lilita One","Arial Rounded MT Bold","Trebuchet MS",sans-serif';
const BODY_FONT = 'Nunito,system-ui,-apple-system,"Segoe UI",sans-serif';

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load(`150px ${DISPLAY_FONT}`),
      document.fonts.load(`800 56px ${BODY_FONT}`)
    ]);
  } catch { /* fall back to system fonts */ }
}

/**
 * @param {{stack: import('./game/engine.js').Block[], score:number, name:string, hue:number,
 *          colors:{ink:string, paper:string, pop:string}}} input
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderShareCard({ stack, score, name, hue, colors }) {
  await fontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const g = canvas.getContext('2d');

  paintSky(g, WIDTH, HEIGHT, hue);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';

  g.fillStyle = colors.ink;
  g.font = `150px ${DISPLAY_FONT}`;
  g.fillText('Apílalo', WIDTH / 2, 240);

  // Tower, scaled to fit its band
  const bandTop = 300, bandHeight = 900;
  const top = stack[stack.length - 1];
  const topY = Math.max(0, top.y + top.h);
  const k = Math.min(3, (bandHeight - 100) / (topY + RULES.baseSize + 20));
  const view = { cx: WIDTH / 2, cy: bandTop + bandHeight / 2 + (topY === 0 ? -120 : 0), k, camY: topY / 2 };
  g.save();
  g.beginPath();
  g.rect(0, bandTop, WIDTH, bandHeight);
  g.clip();
  for (const b of stack) drawBlock(g, view, b);
  g.restore();

  g.fillStyle = colors.ink;
  g.font = `300px ${DISPLAY_FONT}`;
  g.fillText(String(score), WIDTH / 2, 1460);
  g.font = `800 64px ${BODY_FONT}`;
  g.globalAlpha = 0.72;
  g.fillText(floorsWord(score), WIDTH / 2, 1545);
  g.globalAlpha = 1;

  g.font = `124px ${DISPLAY_FONT}`;
  g.lineJoin = 'round';
  g.lineWidth = 18;
  g.strokeStyle = colors.paper;
  g.strokeText('¿Me superas?', WIDTH / 2, 1720);
  g.fillStyle = colors.pop;
  g.fillText('¿Me superas?', WIDTH / 2, 1720);

  g.fillStyle = colors.ink;
  g.font = `800 56px ${BODY_FONT}`;
  g.fillText(name ? `Reto de ${name}` : 'Abre el enlace y supérame', WIDTH / 2, 1825);

  return canvas;
}

export const canvasToBlob = canvas => new Promise((resolve, reject) => {
  canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen'))), 'image/png');
});
