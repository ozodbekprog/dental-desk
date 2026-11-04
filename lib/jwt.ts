import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "dd_session";

export type SessionUser = {
  uid: string;
  cid: string | null;
  role: string;
  name: string;
  email: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload || typeof payload.uid !== "string") return null;
    return {
      uid: payload.uid,
      cid: typeof payload.cid === "string" ? payload.cid : null,
      role: typeof payload.role === "string" ? payload.role : "viewer",
      name: typeof payload.name === "string" ? payload.name : "",
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}
