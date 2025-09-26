// File: server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Express Request type to include our user payload
interface AuthRequest extends Request {
  user?: { id: string };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (e.g., "Bearer eyJhbGciOi...")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using the secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

      // Attach user ID to the request for future use
      req.user = { id: decoded.id };

      // Move to the next step
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};