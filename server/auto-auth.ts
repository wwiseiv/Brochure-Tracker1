import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { autoUsers } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { AutoShopRole } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "pcb-auto-secret-key";
const TOKEN_EXPIRY = "7d";

export interface AutoAuthUser {
  id: number;
  shopId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      autoUser?: AutoAuthUser;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AutoAuthUser): string {
  return jwt.sign(
    { id: user.id, shopId: user.shopId, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function autoAuth(req: Request, res: Response, next: NextFunction) {
  // Try Bearer token first, then cookie
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.cookies?.auto_token) {
    token = req.cookies.auto_token;
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.autoUser = {
      id: decoded.id,
      shopId: decoded.shopId,
      email: decoded.email,
      firstName: decoded.firstName || "",
      lastName: decoded.lastName || "",
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function autoRequireRole(...roles: AutoShopRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.autoUser) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.autoUser.role as AutoShopRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
