// Shared by proxy.ts and server code. Web Crypto only, so it runs anywhere.
export const SESSION_COOKIE = "kf_session";

/** Session token derived from ADMIN_PASSWORD; changing the password logs everyone out. */
export async function sessionToken(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  const data = new TextEncoder().encode(`kami-football:${pw}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidSession(value: string | undefined): Promise<boolean> {
  const token = await sessionToken();
  return !!token && !!value && timingSafeEqual(value, token);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
