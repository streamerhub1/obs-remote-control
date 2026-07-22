import { test, expect } from 'vitest';
import { testFn } from './index';

test('basic', () => { expect(testFn()).toBe('obs-adapter'); });
