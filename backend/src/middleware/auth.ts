import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, DecodedToken } from "../utils/tokens";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

/**
 * Middleware: Authenticate JWT from HTTP-only cookie
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies.accessToken as string | undefined;

  if (!token) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Token expired or invalid" });
  }
}

/**
 * Middleware: Role-based access control
 * Usage: authorize("Admin") or authorize("Admin", "Jailer")
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: "Access denied: insufficient role" });
      return;
    }
    next();
  };
}
