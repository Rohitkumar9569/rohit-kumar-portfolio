// File: server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { isValidSlug } from '../utils/validation';

// Extend the Express Request type to include our user payload
export interface AuthRequest extends Request {
  user?: { id: string; role: 'admin' | 'user' };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: 'Authentication is not configured.' });
  }

  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    try {
      // Get token from header (e.g., "Bearer eyJhbGciOi...")
      const token = authorization.split(' ')[1];

      // Verify the token using the secret key
      const decoded = jwt.verify(token, jwtSecret) as { id: string; role?: 'admin' | 'user' };

      const user = await User.findById(decoded.id).select('role').lean();
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      const role = user.role === 'admin' ? 'admin' : 'user';
      req.user = { id: decoded.id, role };

      // Move to the next step
      return next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  return next();
};

export const requireFullAdminAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin' || !req.user?.id) {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  const user = await User.findById(req.user.id).select('role adminScope').lean();
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  if ((user as any).adminScope?.enabled) {
    return res.status(403).json({ message: 'Full admin access is required for this action.' });
  }

  return next();
};

export const ensureAdminExamAccess = async (req: AuthRequest, res: Response, examSlug: string) => {
  const normalizedSlug = typeof examSlug === 'string' ? examSlug.trim().toLowerCase() : '';
  if (!normalizedSlug || !isValidSlug(normalizedSlug)) {
    res.status(400).json({ message: 'Invalid exam slug.' });
    return false;
  }

  if (req.user?.role !== 'admin' || !req.user?.id) {
    res.status(403).json({ message: 'Admin access required.' });
    return false;
  }

  const user = await User.findById(req.user.id).select('role adminScope').lean();
  if (!user || user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required.' });
    return false;
  }

  if (!(user as any).adminScope?.enabled) {
    return true;
  }

  const allowedExamSlugs = new Set(
    Array.isArray((user as any).adminScope?.examSlugs)
      ? (user as any).adminScope.examSlugs.map((slug: unknown) => String(slug).trim().toLowerCase())
      : []
  );

  if (!allowedExamSlugs.has(normalizedSlug)) {
    res.status(403).json({ message: 'This admin does not have permission for this exam.' });
    return false;
  }

  return true;
};
