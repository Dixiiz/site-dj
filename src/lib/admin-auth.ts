import { createHmac } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "dj_admin";

function expectedToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("session").digest("hex");
}

export async function isAdmin() {
  const token = expectedToken();
  if (!token) return false;
  const store = await cookies();
  return store.get(COOKIE)?.value === token;
}

export async function setAdminSession() {
  const token = expectedToken();
  if (!token) {
    throw new Error("ADMIN_PASSWORD manquant dans .env.local");
  }
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE);
}
