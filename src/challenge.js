// Challenge links and texts. Pure functions so they can be tested without a browser.
//
// Link format: <public url>#reto-<floors>[-<name>]
// e.g. https://example.github.io/apilalo/#reto-23-Sofia
// The data lives in the URL fragment, which browsers never send to the server.

const HASH_PATTERN = /^#reto-(\d{1,4})(?:-([A-Za-z0-9]{1,16}))?$/;
const NAME_MAX = 14;

export const floorsWord = n => (n === 1 ? 'piso' : 'pisos');

/** @returns {{target:number, from:string} | null} */
export function parseChallenge(hash) {
  const m = HASH_PATTERN.exec(hash || '');
  return m ? { target: parseInt(m[1], 10), from: m[2] || '' } : null;
}

/** Name as shown in the image and texts: trimmed and length-limited. */
export function cleanName(name) {
  return String(name || '').trim().slice(0, NAME_MAX);
}

/** Name as it travels in the link: ASCII letters and digits only ("Sofía" -> "Sofia"). */
export function linkName(name) {
  return cleanName(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, NAME_MAX);
}

export function buildChallengeUrl(baseUrl, score, name = '') {
  const base = String(baseUrl).replace(/#.*$/, '');
  const safeScore = Math.max(0, Math.min(9999, Math.floor(score)));
  const n = linkName(name);
  return `${base}#reto-${safeScore}${n ? '-' + n : ''}`;
}

export function buildShareMessage(score, url) {
  return `Llegué a ${score} ${floorsWord(score)} en Apílalo 🧱 ¿Me superas? Juega aquí: ${url}`;
}

export function challengeIntroText({ target, from }) {
  return from
    ? `${from} te reta: supera ${target} ${floorsWord(target)}`
    : `Te retaron: supera ${target} ${floorsWord(target)}`;
}

/** @returns {{won:boolean, text:string}} */
export function describeResult(score, { target, from }) {
  if (score > target) {
    return { won: true, text: from ? `¡Le ganaste a ${from}!` : `¡Superaste el reto de ${target} ${floorsWord(target)}!` };
  }
  if (score === target) {
    return { won: false, text: from ? `Empate con ${from}. Uno más y le ganas.` : 'Empate con el reto. Uno más y ganas.' };
  }
  const left = target + 1 - score;
  return {
    won: false,
    text: from
      ? `Te faltaron ${left} ${floorsWord(left)} para ganarle a ${from}`
      : `Te faltaron ${left} ${floorsWord(left)} para superar el reto`
  };
}
