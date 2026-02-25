import jwt from "jsonwebtoken";
import { Response } from "express";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

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
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(payload: UserPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
}

export function verifyRefreshToken(token: string): DecodedToken {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as DecodedToken;
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

  // Access token cookie — short-lived
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 50 * 60 * 1000, 
  });

  // Refresh token cookie — long-lived
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return { accessToken, refreshToken };
}
