import { describe, it } from 'node:test';
import assert from 'node:assert';
import { incrementMinorVersion, incrementBeta } from './version.js';

describe('version', () => {
  describe('incrementMinorVersion', () => {
    it('should increment minor version', () => {
      assert.strictEqual(incrementMinorVersion('1.1.0'), '1.2.0');
      assert.strictEqual(incrementMinorVersion('2.5.0'), '2.6.0');
      assert.strictEqual(incrementMinorVersion('0.9.0'), '0.10.0');
    });
  });

  describe('incrementBeta', () => {
    it('should increment beta number', () => {
      assert.strictEqual(incrementBeta('1.1.0-beta.1'), '1.1.0-beta.2');
      assert.strictEqual(incrementBeta('2.0.0-beta.5'), '2.0.0-beta.6');
    });

    it('should return null for invalid beta format', () => {
      assert.strictEqual(incrementBeta('1.1.0'), null);
      assert.strictEqual(incrementBeta('invalid'), null);
    });
  });
});
