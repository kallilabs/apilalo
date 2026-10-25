import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChallengeUrl, buildShareMessage, challengeIntroText, describeResult, linkName, parseChallenge
} from '../src/challenge.js';

test('parses challenge links with and without a name', () => {
  assert.deepEqual(parseChallenge('#reto-23-Sofia'), { target: 23, from: 'Sofia' });
  assert.deepEqual(parseChallenge('#reto-7'), { target: 7, from: '' });
});

test('rejects anything that is not a well-formed challenge', () => {
  for (const hash of ['', '#', '#reto-', '#reto-abc', '#reto-12-<script>', '#reto-12345', '#otro-12', '#reto-1-' + 'a'.repeat(17)]) {
    assert.equal(parseChallenge(hash), null, hash);
  }
});

test('names travel in the link as plain ASCII', () => {
  assert.equal(linkName('  Sofía  '), 'Sofia');
  assert.equal(linkName('José Ñoño!'), 'JoseNono');
  assert.equal(linkName(''), '');
});

test('builds links that the parser understands', () => {
  const url = buildChallengeUrl('https://example.github.io/apilalo/', 23, 'Sofía');
  assert.equal(url, 'https://example.github.io/apilalo/#reto-23-Sofia');
  assert.deepEqual(parseChallenge(new URL(url).hash), { target: 23, from: 'Sofia' });
});

test('replaces an existing challenge instead of stacking hashes', () => {
  assert.equal(buildChallengeUrl('https://x.dev/#reto-5-Ana', 9), 'https://x.dev/#reto-9');
});

test('message includes score and link', () => {
  const msg = buildShareMessage(1, 'https://x.dev/#reto-1');
  assert.match(msg, /1 piso /);
  assert.match(msg, /https:\/\/x\.dev\/#reto-1$/);
});

test('describes win, tie and loss against a challenge', () => {
  const c = { target: 10, from: 'Ana' };
  assert.deepEqual(describeResult(11, c), { won: true, text: '¡Le ganaste a Ana!' });
  assert.equal(describeResult(10, c).won, false);
  assert.match(describeResult(10, c).text, /Empate/);
  assert.equal(describeResult(9, c).text, 'Te faltaron 2 pisos para ganarle a Ana');
  assert.equal(describeResult(10, { target: 10, from: '' }).text, 'Empate con el reto. Uno más y ganas.');
  assert.equal(challengeIntroText({ target: 1, from: '' }), 'Te retaron: supera 1 piso');
});
