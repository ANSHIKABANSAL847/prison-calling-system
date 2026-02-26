import jwt from "jsonwebtoken";
import { Response } from "express";

// Configurable via .env — defaults to 8 hours / 7 days
// Set JWT_ACCESS_EXPIRY=8h  JWT_REFRESH_EXPIRY=7d  in your .env
const ACCESS_TOKEN_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || "8h";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

export interface UserPayload {
  email: string;
  role: string;
}

export interface DecodedToken extends UserPayload {
  iat: number;
  exp: number;
}

export function generateAccessToken(payload: UserPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY as any,
  });
}

export function generateRefreshToken(payload: UserPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_EXPIRY as any,
  });
}

export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
}

export function verifyRefreshToken(token: string): DecodedToken {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as DecodedToken;
}

/** Convert a JWT expiry string like "8h", "7d", "30m" to milliseconds */
function parseExpiryToMs(expiry: string, fallback: number): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return fallback;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * (multipliers[unit] ?? fallback);
}

/**
 * Set JWT tokens as HTTP-only cookies on the response
 */
export function setTokenCookies(
  res: Response,
  user: UserPayload
): { accessToken: string; refreshToken: string } {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const isProduction = process.env.NODE_ENV === "production";

  // Access token cookie — matches JWT_ACCESS_EXPIRY (default 8h)
  const accessMs = parseExpiryToMs(ACCESS_TOKEN_EXPIRY, 8 * 60 * 60 * 1000);
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: accessMs,
  });

  // Refresh token cookie — matches JWT_REFRESH_EXPIRY (default 7d)
  const refreshMs = parseExpiryToMs(REFRESH_TOKEN_EXPIRY, 7 * 24 * 60 * 60 * 1000);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/api/auth/refresh",
    maxAge: refreshMs,
  });

  return { accessToken, refreshToken };
}
