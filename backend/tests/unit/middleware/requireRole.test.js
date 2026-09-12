import { jest } from '@jest/globals';
import { requireRole } from '../../../middleware/requireRole.js';

describe('requireRole Middleware Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('calls next() when user has the allowed role', () => {
    req.user = { _id: 'user-1', role: 'authority' };

    const middleware = requireRole('authority');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when user matches one of multiple allowed roles', () => {
    req.user = { _id: 'user-1', role: 'admin' };

    const middleware = requireRole('authority', 'admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('responds 403 when user has a disallowed role', () => {
    req.user = { _id: 'user-1', role: 'citizen' };

    const middleware = requireRole('authority');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Forbidden: Access restricted to [authority] roles'),
      })
    );
  });

  it('responds 401 when req.user or req.user.role is missing', () => {
    req.user = null;

    const middleware = requireRole('authority');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
