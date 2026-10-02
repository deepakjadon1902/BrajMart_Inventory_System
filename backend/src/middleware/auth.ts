import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Support custom header or default internal staff session
  const roleHeader = (req.headers['x-user-role'] as UserRole) || 'ADMIN';
  const nameHeader = (req.headers['x-user-name'] as string) || 'Admin';

  (req as any).user = {
    id: 'user-default-1',
    name: nameHeader,
    role: roleHeader,
  } as AuthUser;

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      });
    }
    next();
  };
}
