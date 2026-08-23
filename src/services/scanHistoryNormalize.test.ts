import { normalizeHistoryEntries } from './scanHistoryNormalize';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const mixed = normalizeHistoryEntries([
  { kind: 'product', barcode: '123', timestamp: 1, status: 'found' },
  { kind: 'document', timestamp: 2 },
  { kind: 'document', timestamp: 3, imageUris: [null, 'file:///old/Blippo-a-p1.jpg'], pageTexts: ['hello'] },
  null,
  'nope',
  { barcode: 'legacy', timestamp: 4, status: 'not-found' },
]);

assert(normalizeHistoryEntries({ not: 'an array' }).length === 0, 'non-array must be empty');
assert(mixed.length === 4, `expected 4 kept entries, got ${mixed.length}`);
assert(mixed[1].kind === 'document' && mixed[1].imageUris.length === 0, 'missing document arrays must default');
assert(mixed[1].kind === 'document' && mixed[1].pageTexts.length === 0, 'missing pageTexts must default');
assert(
  mixed[2].kind === 'document' && mixed[2].imageUris.length === 1 && mixed[2].imageUris[0].endsWith('Blippo-a-p1.jpg'),
  'null page URIs must be dropped, valid ones kept'
);
assert(mixed[3].kind === 'product' && mixed[3].barcode === 'legacy', 'kind-less entries stay products');

console.log('scanHistoryNormalize: ok');
