import { jest } from '@jest/globals';
import { z } from 'zod';
import { validate } from '../../../middleware/validate.js';

describe('validate Middleware Unit Tests', () => {
  const testSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    count: z.number()
  });

  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('calls next() and updates req.body when payload is valid', () => {
    const req = { body: { title: 'Valid Title', count: 5 } };
    const res = mockResponse();
    const next = jest.fn();

    const middleware = validate(testSchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body.title).toBe('Valid Title');
  });

  it('returns 400 with formatted error list when payload is invalid', () => {
    const req = { body: { title: 'ab', count: 'not-a-number' } };
    const res = mockResponse();
    const next = jest.fn();

    const middleware = validate(testSchema);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'title', message: expect.any(String) })
        ])
      })
    );
  });

  it('safely extracts errors whether exposed via .issues (Zod 4) or .errors without throwing TypeError', () => {
    const mockSchema = {
      safeParse: jest.fn().mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['location', 'coordinates'], message: 'Invalid coordinates' }]
        }
      })
    };

    const req = { body: {} };
    const res = mockResponse();
    const next = jest.fn();

    const middleware = validate(mockSchema);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid coordinates',
      errors: [{ field: 'location.coordinates', message: 'Invalid coordinates' }]
    });
  });

  it('supports validating req.query via source parameter', () => {
    const querySchema = z.object({
      page: z.coerce.number().min(1)
    });

    const req = { query: { page: '2' } };
    const res = mockResponse();
    const next = jest.fn();

    const middleware = validate(querySchema, 'query');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query.page).toBe(2);
  });
});
