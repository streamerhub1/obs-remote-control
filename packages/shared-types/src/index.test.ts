import { describe, it, expect } from 'vitest';
import { AppError, ErrorCodes } from './index.js';

describe('AppError', () => {
  it('should serialize correctly', () => {
    const err = new AppError(ErrorCodes.NOT_FOUND, 'User not found', {
      userId: 1,
    });
    expect(err.toJSON()).toEqual({
      error: 'NOT_FOUND',
      message: 'User not found',
      details: { userId: 1 },
    });
  });
});
