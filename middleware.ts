// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@/contexts/auth/types"; // ou replique a interface aqui

const DEBUG = true;
const API_BASE = "https://api.mujapira.com";
const COOKIE_DOMAIN = ".mujapira.com";
const AUTH_ME_URL = `${API_BASE}/users/me`;
const AUTH_REFRESH_URL = `${API_BASE}/auth/refresh`;

// --- helpers --------------------------------------------------------------

function isAdminFrom(me?: User): boolean {
  return !!me?.isAdmin;
}

function cookieHeader(req: NextRequest) {
  return req.headers.get("cookie") ?? "";
}

function mergeCookieHeader(orig: string, patch: Record<string, string | undefined>) {
  const parts: string[] = [];
  if (orig) parts.push(orig);
  for (const [k, v] of Object.entries(patch)) if (v) parts.push(`${k}=${v}`);
  return parts.join("; ");
}

async function fetchMeWithCookie(cookie: string) {
  const res = await fetch(AUTH_ME_URL, { method: "GET", headers: { cookie } });
  const txt = await res.text().catch(() => "");
  let json: User | undefined;
  try { json = JSON.parse(txt) as User; } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, json, txt };
}

async function tryRefresh(req: NextRequest): Promise<{ accessToken?: string; refreshToken?: string } | null> {
  try {
    const res = await fetch(AUTH_REFRESH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(req), // repassa refreshToken httpOnly
      },
      body: "{}", // backend lê o refresh do cookie
    });

    const body = await res.text().catch(() => "");
    if (DEBUG) console.log("[MW] refresh status:", res.status, body.slice(0, 200));
    if (!res.ok) return null;

    // O backend deve devolver JSON { accessToken, refreshToken? }
    const data = JSON.parse(body) as { accessToken?: string; refreshToken?: string };
    if (!data?.accessToken) return null;
    return data;
  } catch (e) {
    if (DEBUG) console.log("[MW] refresh error:", e);
    return null;
  }
}

// --- middleware -----------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (DEBUG) console.log("[MW] Req:", pathname, "cookies:", req.cookies);

  const redirectHome = () => {
    const u = req.nextUrl.clone();
    u.pathname = "/";
    u.search = "";
    return NextResponse.redirect(u);
  };

  // 1) Valida sessão perguntando ao backend
  const me1 = await fetchMeWithCookie(cookieHeader(req));
  if (DEBUG) console.log("[MW] /me status:", me1.status);

  if (me1.ok && isAdminFrom(me1.json)) {
    if (DEBUG) console.log("[MW] Admin OK (sem refresh).");
    return NextResponse.next();
  }

  // 2) Se 401/403, tenta refresh e valida novamente
  if (me1.status === 401 || me1.status === 403) {
    const refreshed = await tryRefresh(req);
    if (refreshed?.accessToken) {
      const res = NextResponse.next();

      // grava novo access e, se houver rotação, o refresh também
      res.cookies.set("accessToken", refreshed.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        domain: COOKIE_DOMAIN,
      });
      if (refreshed.refreshToken) {
        res.cookies.set("refreshToken", refreshed.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          domain: COOKIE_DOMAIN,
        });
      }

      // revalida /me com o access novo já no header Cookie dessa chamada interna
      const merged = mergeCookieHeader(cookieHeader(req), { accessToken: refreshed.accessToken });
      const me2 = await fetchMeWithCookie(merged);

      if (me2.ok && isAdminFrom(me2.json)) {
        if (DEBUG) console.log("[MW] Admin OK após refresh.");
        return res; // segue com cookies atualizados
      }
    }
  }

  if (DEBUG) console.log("[MW] Bloqueado. Redirecionando /");
  return redirectHome();
}

export const config = {
  matcher: ["/admin/:path*"], // só protege rotas /admin/*
};
