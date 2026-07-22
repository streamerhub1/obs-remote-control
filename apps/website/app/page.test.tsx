import { describe, it, expect } from 'vitest';
// Simple smoke test, rendering React in Vitest without happy-dom is tricky,
// so we just test the file can be imported and is a function.
import Home from './page.tsx';

describe('Home', () => {
  it('is exported as a component', () => {
    expect(typeof Home).toBe('function');
  });
});
