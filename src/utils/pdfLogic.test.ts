import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePageRanges,
  formatFileSize,
  reorderArray,
  validatePasswordPair,
  buildOutputFilename,
  calculateCompressionSavings,
  TOOLS_CATALOG,
} from './pdfLogic';

test('TOOLS_CATALOG has 8 featured tools on Home and 12 total tools', () => {
  assert.equal(TOOLS_CATALOG.length, 12);
  assert.equal(TOOLS_CATALOG.filter((t) => t.featuredOnHome).length, 8);
});

test('parsePageRanges parses single pages, ranges, and duplicates cleanly', () => {
  assert.deepEqual(parsePageRanges('1-3, 5', 6), [1, 2, 3, 5]);
  assert.deepEqual(parsePageRanges('4, 2-3, 2', 5), [2, 3, 4]);
  assert.deepEqual(parsePageRanges(' 1 ', 1), [1]);
});

test('parsePageRanges rejects invalid syntax and out-of-range pages', () => {
  assert.throws(() => parsePageRanges('', 5), /at least one page/i);
  assert.throws(() => parsePageRanges('0-2', 5), /Invalid range/i);
  assert.throws(() => parsePageRanges('3-1', 5), /Invalid range/i);
  assert.throws(() => parsePageRanges('6', 5), /out of range/i);
  assert.throws(() => parsePageRanges('abc', 5), /Could not understand/i);
});

test('formatFileSize formats bytes, KB, and MB cleanly', () => {
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(1024 * 1024 * 2.5), '2.50 MB');
});

test('reorderArray moves elements immutably and handles out-of-bounds safely', () => {
  const original = ['a', 'b', 'c', 'd'];
  assert.deepEqual(reorderArray(original, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(reorderArray(original, 3, 1), ['a', 'd', 'b', 'c']);
  assert.deepEqual(original, ['a', 'b', 'c', 'd']);
  assert.deepEqual(reorderArray(original, -1, 2), ['a', 'b', 'c', 'd']);
});

test('validatePasswordPair enforces minimum length and matching confirmation', () => {
  assert.ok(validatePasswordPair('123', '123'));
  assert.ok(validatePasswordPair('1234', '1235'));
  assert.equal(validatePasswordPair('secret123', 'secret123'), null);
});

test('buildOutputFilename strips prior extension and sanitizes characters', () => {
  assert.equal(buildOutputFilename('Report 2026.pdf', 'merged'), 'Report 2026_merged.pdf');
  assert.equal(buildOutputFilename('photo.png', 'converted', 'pdf'), 'photo_converted.pdf');
  assert.equal(buildOutputFilename('a:b/c.pdf', 'split'), 'a_b_c_split.pdf');
});

test('calculateCompressionSavings computes percentage without negative values', () => {
  assert.equal(calculateCompressionSavings(1000, 400), 60);
  assert.equal(calculateCompressionSavings(1000, 1200), 0);
  assert.equal(calculateCompressionSavings(0, 0), 0);
});
