import { SignJWT, jwtVerify } from "jose";
import { getSupabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "the-orange-fox-cms-secret-key-2026"
);

export interface AdminPayload {
  sub: string;
  email: string;
  display_name: string;
  role: string;
  position: string;
  badge: string;
}

export async function signToken(payload: AdminPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: { cookies: { get: (name: string) => { value: string } | undefined } }): Promise<AdminPayload | null> {
  const token = (req.cookies as any).get?.("fox_admin_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  
  // If badge is missing (old JWT token), look it up from DB
  if (!payload.badge) {
    const { data } = await getSupabaseAdmin()
      .from("admin_users")
      .select("badge")
      .eq("id", payload.sub)
      .single();
    payload.badge = data?.badge || "staff";
  }
  
  return payload;
}

export function hashPassword(password: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(password).digest("hex");
}
