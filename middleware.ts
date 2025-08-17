// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { User } from "./lib/auth-manager";

// --- Config por ambiente ---------------------------------------------------
const IS_DEV = false;

const API_BASE = IS_DEV ? "http://localhost:5000" : "https://api.mujapira.com";

const AUTH_ME_URL = `${API_BASE}/users/me`;


// --- Helpers ---------------------------------------------------------------
function isAdmin(me?: User) {
  return !!me?.isAdmin;
}

function cookieHeader(req: NextRequest) {
  return req.headers.get("cookie") ?? "";
}

async function fetchMeWithCookie(cookie: string) {
  const res = await fetch(AUTH_ME_URL, {
    method: "GET",
    headers: { cookie },
    cache: "no-store",
  });

  let json: User | undefined;
  try {
    json = (await res.json()) as User;
  } catch {
    // body vazio ou não-JSON
  }

  return { ok: res.ok, status: res.status, json };
}

// --- Middleware ------------------------------------------------------------
export async function middleware(req: NextRequest) {
  // 1) Valida sessão consultando o backend (usa os cookies atuais do browser)
  const me = await fetchMeWithCookie(cookieHeader(req));

  // 2) Se for admin, segue. Não tenta refresh aqui (evita loops).
  if (me.ok && isAdmin(me.json)) return NextResponse.next();

  // 3) Caso contrário, redireciona pra home (ou login)
  const to = req.nextUrl.clone();
  to.pathname = "/";
  to.search = "";
  return NextResponse.redirect(to);
}

// Protege somente /admin/*
export const config = {
  matcher: ["/admin/:path*"],
};
