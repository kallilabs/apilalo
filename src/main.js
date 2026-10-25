// Screen flow and wiring: input -> game rules -> feedback (sound, haptics, texts) -> drawing.

import './styles.css';
import { TowerGame, RULES } from './game/engine.js';
import { Camera, drawScene } from './game/renderer.js';
import { Sfx } from './game/audio.js';
import {
  buildChallengeUrl, buildShareMessage, challengeIntroText, cleanName,
  describeResult, floorsWord, parseChallenge
} from './challenge.js';
import { canvasToBlob, renderShareCard } from './share-card.js';
import { canShareImage, haptic, isNative, onBackButton, shareImage, storage } from './platform.js';
import { ALLOW_PLAYER_NAME, PLAY_URL, PUBLIC_URL } from './config.js';

const MILESTONES = { 10: '¡10 pisos!', 25: '¡Imparable!', 50: '¡Medio centenar!', 75: '¡Leyenda!', 100: '¡100! ¿En serio?' };
const KEYS = { best: 'apilalo.best', muted: 'apilalo.muted', name: 'apilalo.name' };

const $ = id => document.getElementById(id);
const el = {
  stage: $('stage'), canvas: $('cv'), intro: $('intro'), over: $('over'), scoreBox: $('scoreBox'),
  scoreNum: $('scoreNum'), streak: $('streak'), bestHud: $('bestHud'), pop: $('pop'), hint: $('hint'),
  finalNum: $('finalNum'), finalUnit: $('finalUnit'), newRecord: $('newRecord'), stats: $('stats'),
  introBest: $('introBest'), introChallenge: $('introChallenge'), playStoreLink: $('playStoreLink'),
  challengeResult: $('challengeResult'), mute: $('muteBtn'), icoOn: $('icoOn'), icoOff: $('icoOff'),
  play: $('playBtn'), again: $('againBtn'), challengeBtn: $('challengeBtn'),
  share: $('share'), cardPreview: $('cardPreview'), nameField: $('nameField'), nameInput: $('nameInput'),
  shareBtn: $('shareBtn'), waLink: $('waLink'), downloadLink: $('downloadLink'), copyBtn: $('copyBtn'),
  fallbackMsg: $('fallbackMsg'), shareStatus: $('shareStatus'), statusHelp: $('statusHelp'), closeShare: $('closeShare')
};
const ctx = el.canvas.getContext('2d');

const css = getComputedStyle(document.documentElement);
const COLORS = {
  ink: css.getPropertyValue('--ink').trim() || '#24163a',
  paper: css.getPropertyValue('--paper').trim() || '#fffafc',
  pop: css.getPropertyValue('--pop').trim() || '#ff3d7a'
};

const game = new TowerGame();
const camera = new Camera();
const sfx = new Sfx();
const challenge = parseChallenge(location.hash);

/** @type {'intro'|'playing'|'over'} */
let screen = 'intro';
let best = 0;
let overAt = 0;
let skyHue = game.hue0;
const viewport = { width: 0, height: 0, baseScale: 1 };

// ---------- Layout ----------

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  viewport.width = el.stage.clientWidth;
  viewport.height = el.stage.clientHeight;
  el.canvas.width = Math.round(viewport.width * dpr);
  el.canvas.height = Math.round(viewport.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  viewport.baseScale = Math.min(viewport.width * 0.46, viewport.height * 0.3) / (2 * RULES.baseSize * Math.cos(Math.PI / 6));
}

// ---------- Screens ----------

function showScreen(next) {
  screen = next;
  el.intro.hidden = next !== 'intro';
  el.over.hidden = true;
  el.scoreBox.hidden = next !== 'playing';
  el.bestHud.hidden = next !== 'playing';
  el.hint.hidden = next !== 'playing';
}

function startRun() {
  sfx.unlock();
  game.idle = false;
  game.reset();
  camera.reset();
  showScreen('playing');
  updateHud();
}

function goToIntro() {
  closeShare();
  game.idle = true;
  game.reset();
  camera.reset();
  showScreen('intro');
  renderIntro();
}

function drop() {
  const result = game.drop();
  if (!result) return;
  el.hint.hidden = true;
  if (result.kind === 'miss') {
    endRun();
    return;
  }
  camera.follow(game.topY);
  if (result.kind === 'perfect') { sfx.perfect(result.combo); haptic('perfect'); }
  else { sfx.cut(); haptic('cut'); }
  announce(result);
  updateHud();
}

function announce({ kind, score, combo }) {
  if (MILESTONES[score]) { popup(MILESTONES[score]); sfx.fanfare(); }
  else if (challenge && score === challenge.target + 1) { popup('¡Reto superado!'); sfx.fanfare(); }
  else if (best > 0 && score === best + 1) { popup('¡Nuevo récord!'); sfx.fanfare(); }
  else if (kind === 'perfect') {
    popup(combo >= RULES.growStreak ? `x${combo} · ¡crece!` : combo === 2 ? '¡Perfecto x2!' : '¡Perfecto!');
  }
}

function endRun() {
  screen = 'over';
  sfx.fail();
  haptic('fail');
  el.hint.hidden = true;
  el.streak.textContent = '';
  camera.showWhole(game.topY, viewport.baseScale, viewport.height, RULES.baseSize);

  const isRecord = game.score > best;
  if (isRecord) {
    best = game.score;
    storage.set(KEYS.best, best);
  }
  overAt = performance.now() + 800;

  setTimeout(() => {
    if (screen !== 'over') return;
    el.finalNum.textContent = game.score;
    el.finalUnit.textContent = floorsWord(game.score);
    el.newRecord.hidden = !isRecord;
    if (challenge) {
      const { won, text } = describeResult(game.score, challenge);
      el.challengeResult.textContent = text;
      el.challengeResult.classList.toggle('win', won);
      el.challengeResult.hidden = false;
    }
    el.stats.textContent = `Perfectos ${game.perfects} · Mejor racha ${game.bestCombo} · Récord ${best}`;
    el.scoreBox.hidden = true;
    el.bestHud.hidden = true;
    el.over.hidden = false;
  }, 700);
}

function act() {
  sfx.unlock();
  if (screen === 'playing') drop();
  else if (screen === 'intro') startRun();
  else if (screen === 'over' && performance.now() > overAt) startRun();
}

// ---------- HUD & texts ----------

function popup(text) {
  el.pop.textContent = text;
  el.pop.classList.remove('show');
  void el.pop.offsetWidth; // restart the CSS animation
  el.pop.classList.add('show');
}

function updateHud() {
  el.scoreNum.textContent = game.score;
  el.streak.textContent = game.combo >= 2 ? `racha x${game.combo}` : '';
  const b = el.bestHud;
  if (challenge) {
    const won = game.score > challenge.target;
    b.textContent = won ? '¡Superado!' : `Meta ${challenge.target}`;
    b.classList.toggle('beat', won);
  } else if (best > 0 && game.score > best) {
    b.textContent = '¡Récord!';
    b.classList.add('beat');
  } else {
    b.textContent = best > 0 ? `Récord ${best}` : '';
    b.classList.remove('beat');
  }
}

function renderIntro() {
  el.introBest.textContent = best > 0 ? `Tu récord: ${best} ${floorsWord(best)}` : '';
  if (challenge) {
    el.introChallenge.textContent = challengeIntroText(challenge);
    el.introChallenge.hidden = false;
  }
  if (!isNative && PLAY_URL) {
    el.playStoreLink.href = PLAY_URL;
    el.playStoreLink.hidden = false;
  }
}

function renderMute() {
  el.mute.setAttribute('aria-pressed', String(sfx.muted));
  el.mute.setAttribute('aria-label', sfx.muted ? 'Activar sonido' : 'Silenciar');
  el.icoOn.hidden = sfx.muted;
  el.icoOff.hidden = !sfx.muted;
}

// ---------- Challenge sharing ----------

let cardBlob = null;
let cardObjectUrl = '';
let cardPromise = Promise.resolve();
let cardJob = 0;
let nameTimer = 0;

const playerName = () => (ALLOW_PLAYER_NAME ? cleanName(el.nameInput.value) : '');
const challengeUrl = () => buildChallengeUrl(PUBLIC_URL, game.score, playerName());
const shareText = () => buildShareMessage(game.score, challengeUrl());
const imageName = () => `apilalo-${game.score}-pisos.png`;

function refreshCard() {
  const job = ++cardJob;
  cardPromise = (async () => {
    const canvas = await renderShareCard({
      stack: game.stack,
      score: game.score,
      name: playerName(),
      hue: game.hue0 + game.score * RULES.hueStep,
      colors: COLORS
    });
    const blob = await canvasToBlob(canvas);
    if (job !== cardJob) return;
    cardBlob = blob;
    if (cardObjectUrl) URL.revokeObjectURL(cardObjectUrl);
    cardObjectUrl = URL.createObjectURL(blob);
    el.cardPreview.src = cardObjectUrl;
    el.downloadLink.href = cardObjectUrl;
    el.downloadLink.download = imageName();
  })().catch(() => { el.shareStatus.textContent = 'No se pudo crear la imagen. Puedes copiar el mensaje.'; });
  return cardPromise;
}

function refreshLinks() {
  el.waLink.href = 'https://wa.me/?text=' + encodeURIComponent(shareText());
  if (!el.fallbackMsg.hidden) el.fallbackMsg.value = shareText();
}

function showManualOptions() {
  el.shareBtn.hidden = true;
  el.waLink.hidden = false;
  el.downloadLink.hidden = isNative;
  el.statusHelp.textContent = isNative
    ? 'Copia el mensaje y pégalo en WhatsApp.'
    : 'Para tu estado: guarda la imagen, súbela a tu estado de WhatsApp y pega el mensaje, que trae el enlace del juego.';
}

function openShare() {
  el.shareStatus.textContent = '';
  el.fallbackMsg.hidden = true;
  el.nameField.hidden = !ALLOW_PLAYER_NAME;
  if (canShareImage()) {
    el.shareBtn.hidden = false;
    el.waLink.hidden = true;
    el.downloadLink.hidden = true;
    el.statusHelp.textContent = 'En WhatsApp, elige "Mi estado" para publicarlo o un chat para retar a alguien.';
  } else {
    showManualOptions();
  }
  el.share.hidden = false;
  refreshLinks();
  refreshCard();
}

function closeShare() {
  el.share.hidden = true;
}

el.shareBtn.addEventListener('click', async () => {
  el.shareStatus.textContent = '';
  await cardPromise;
  if (!cardBlob) return;
  try {
    const outcome = await shareImage({ blob: cardBlob, fileName: imageName(), text: shareText(), dialogTitle: 'Reta a alguien' });
    if (outcome === 'shared') el.shareStatus.textContent = 'Listo.';
    else if (outcome === 'unsupported') showManualOptions();
  } catch {
    showManualOptions();
    el.shareStatus.textContent = 'No se abrió el menú para compartir. Usa estas opciones.';
  }
});

el.copyBtn.addEventListener('click', () => {
  const text = shareText();
  const fallback = () => {
    el.fallbackMsg.value = text;
    el.fallbackMsg.hidden = false;
    el.fallbackMsg.focus();
    el.fallbackMsg.select();
    el.shareStatus.textContent = 'Copia el mensaje de aquí arriba.';
  };
  try {
    navigator.clipboard.writeText(text)
      .then(() => { el.shareStatus.textContent = 'Mensaje copiado. Pégalo en WhatsApp.'; })
      .catch(fallback);
  } catch {
    fallback();
  }
});

el.nameInput.addEventListener('input', () => {
  refreshLinks();
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => {
    storage.set(KEYS.name, playerName());
    refreshCard();
  }, 300);
});

el.waLink.addEventListener('click', refreshLinks);
el.closeShare.addEventListener('click', closeShare);
el.share.addEventListener('click', e => { if (e.target === el.share) closeShare(); });

// ---------- Input ----------

el.stage.addEventListener('pointerdown', e => {
  if (e.target.closest('button, a, input')) return;
  if (screen === 'over' && e.target.closest('.sheet')) return;
  e.preventDefault();
  act();
});

window.addEventListener('keydown', e => {
  if (!el.share.hidden) {
    if (e.key === 'Escape') closeShare();
    return;
  }
  if (e.code !== 'Space' && e.code !== 'Enter') return;
  if (e.target.closest && e.target.closest('button, a, input, textarea')) return;
  e.preventDefault();
  act();
});

el.play.addEventListener('click', startRun);
el.again.addEventListener('click', startRun);
el.challengeBtn.addEventListener('click', openShare);
el.mute.addEventListener('click', () => {
  sfx.muted = !sfx.muted;
  storage.set(KEYS.muted, sfx.muted ? '1' : '0');
  renderMute();
  sfx.unlock();
});
el.stage.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('resize', resize);

onBackButton(() => {
  if (!el.share.hidden) { closeShare(); return true; }
  if (screen !== 'intro') { goToIntro(); return true; }
  return false;
});

// ---------- Loop ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.tick(dt);
  camera.update(dt);
  skyHue += (game.hue0 + game.score * RULES.hueStep - skyHue) * Math.min(1, dt * 2);
  const view = {
    cx: viewport.width / 2,
    cy: viewport.height * camera.anchor,
    k: viewport.baseScale * camera.zoom,
    camY: camera.y
  };
  drawScene(ctx, view, game, { width: viewport.width, height: viewport.height, skyHue, flashColor: COLORS.paper });
  requestAnimationFrame(frame);
}

// ---------- Boot ----------

async function boot() {
  resize();
  renderIntro();
  renderMute();
  requestAnimationFrame(frame);

  const [savedBest, savedMuted, savedName] = await Promise.all([
    storage.get(KEYS.best, '0'),
    storage.get(KEYS.muted, '0'),
    storage.get(KEYS.name, '')
  ]);
  best = parseInt(savedBest, 10) || 0;
  sfx.muted = savedMuted === '1';
  el.nameInput.value = savedName || '';
  renderIntro();
  renderMute();
}

boot();

if (import.meta.env.DEV) {
  // Handle for local testing and store screenshots only; not included in builds.
  window.__apilalo = { game, act };
}
