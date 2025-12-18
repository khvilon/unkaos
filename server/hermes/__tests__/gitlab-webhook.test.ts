import assert from 'assert';
import { __test__ } from '../GitlabWebhook';

const { extractIssueKeysFromTexts, normalizeBranchFromRef, computeEventKey } = __test__;

// Key extraction
{
  const keys = extractIssueKeysFromTexts([
    'fix: BS-1',
    'merge bs-2 into main (refs/heads/feature/BS-3-something)',
    'no-key-here'
  ]).sort();

  assert.deepStrictEqual(keys, ['BS-1', 'BS-2', 'BS-3']);
}

// Branch normalization
{
  assert.strictEqual(
    normalizeBranchFromRef('refs/heads/feature/BS-1-test'),
    'feature/BS-1-test'
  );
  assert.strictEqual(normalizeBranchFromRef('feature/BS-1-test'), 'feature/BS-1-test');
}

// Idempotency key
{
  assert.strictEqual(computeEventKey('Push Hook', 'abc', {}), 'gitlab:abc');

  const fallback = computeEventKey('Push Hook', undefined, {
    project: { id: 1 },
    ref: 'refs/heads/feature/BS-1-test',
    after: 'deadbeef'
  });
  assert.strictEqual(fallback, 'gitlab:push:1:refs/heads/feature/BS-1-test:deadbeef');
}

// eslint-disable-next-line no-console
console.log('gitlab-webhook.test.ts OK');


