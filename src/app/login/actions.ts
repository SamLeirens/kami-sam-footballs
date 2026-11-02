"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionToken } from "@/lib/session";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const token = await sessionToken();
  if (!token) return "ADMIN_PASSWORD isn't set on the server.";
  if (formData.get("password") !== process.env.ADMIN_PASSWORD) return "Wrong password.";
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
