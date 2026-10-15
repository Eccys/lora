import test from 'node:test';
import assert from 'node:assert/strict';
import { formatJsonl, validateJsonl } from '../src/lib/jsonl.js';

test('formatJsonl serializes dataset pairs and handles empty/invalid inputs', () => {
  assert.equal(formatJsonl([]), '');
  assert.equal(formatJsonl(null), '');
  const text = formatJsonl([
    { instruction: 'Translate to Arabic', output: 'ترجم إلى العربية', id: 1 },
    { instruction: 'Parse Mubtada', output: 'مبتدأ مرفوع', id: 2 }
  ]);
  assert.equal(
    text,
    '{"instruction":"Translate to Arabic","output":"ترجم إلى العربية"}\n{"instruction":"Parse Mubtada","output":"مبتدأ مرفوع"}'
  );
});

test('validateJsonl accepts valid JSONL and blank lines (LF and CRLF)', () => {
  const empty = validateJsonl('   \r\n  \n ');
  assert.equal(empty.valid, true);
  assert.deepEqual(empty.pairs, []);

  const input = '{"instruction":"Q1","output":"A1"}\r\n\r\n{"instruction":"Q2","output":"A2"}';
  const res = validateJsonl(input);
  assert.equal(res.valid, true);
  assert.equal(res.pairs.length, 2);
  assert.equal(res.pairs[0].instruction, 'Q1');
  assert.equal(res.pairs[0].output, 'A1');
  assert.equal(res.pairs[1].instruction, 'Q2');
  assert.equal(res.pairs[1].output, 'A2');
});

test('validateJsonl rejects non-string fields, primitives, arrays, and malformed JSON with line numbers', () => {
  assert.equal(validateJsonl(null).valid, false);
  const badSyntax = validateJsonl('{"instruction":"ok","output":"ok"}\nnot json');
  assert.equal(badSyntax.valid, false);
  assert.match(badSyntax.error, /line 2/i);
  assert.equal(validateJsonl('null').valid, false);
  assert.equal(validateJsonl('[]').valid, false);
  assert.equal(validateJsonl('{"instruction":"only"}').valid, false);
  assert.equal(validateJsonl('{"instruction":null,"output":"str"}').valid, false);
  assert.equal(validateJsonl('{"instruction":"str","output":123}').valid, false);
  assert.equal(validateJsonl('{"instruction":"str","input":123,"output":"str"}').valid, false);
});

test('validateJsonl and formatJsonl preserve optional string input field', () => {
  const raw = '{"instruction":"Parse","input":"زيد قائم","output":"مبتدأ وخبر"}';
  const res = validateJsonl(raw);
  assert.equal(res.valid, true);
  assert.equal(res.pairs[0].input, 'زيد قائم');
  assert.equal(formatJsonl(res.pairs), raw);
});

