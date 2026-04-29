import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getVersionFromBranch,
  getLatestReleaseBranch,
  getLatestBeta
} from './git.js';

describe('git', () => {
  describe('getVersionFromBranch', () => {
    it('should extract version from branch name', () => {
      assert.strictEqual(getVersionFromBranch('release/1.0.0'), '1.0.0');
      assert.strictEqual(getVersionFromBranch('release/2.5.3'), '2.5.3');
    });

    it('should handle branch names without release prefix', () => {
      assert.strictEqual(getVersionFromBranch('feature/test'), 'feature/test');
    });
  });
});
