import { describe, expect, it } from '@jest/globals';
import { ANGIE_SDK_VERSION } from './version';
import packageJson from '../package.json';

describe('version', () => {
  describe('ANGIE_SDK_VERSION', () => {
    it('should export the correct version from package.json', () => {
      expect(ANGIE_SDK_VERSION).toBe(packageJson.version);
    });
  });
});
