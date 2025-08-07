import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.JWT_SECRET;
const ISSUER = process.env.JWT_ISSUER;
const AUDIENCE = process.env.JWT_AUDIENCE;

const DEBUG = true

function base64UrlDecode(input: string): Uint8Array {
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function verifyJwt(token: string) {
  const [h64, p64, s64] = token.split(".");
  if (!h64 || !p64 || !s64) throw new Error("Formato de token inválido");

  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(h64)));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(p64)));
  const signature = base64UrlDecode(s64);

  if (header.alg !== "HS256") throw new Error("Algoritmo inválido");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(`${h64}.${p64}`)
  );
  if (!valid) throw new Error("Assinatura inválida");

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) throw new Error("Token expirado");
  if (payload.nbf && now < payload.nbf)
    throw new Error("Token não válido ainda");
  if (payload.iss !== ISSUER) throw new Error("Issuer inválido");
  if (
    !payload.aud ||
    (Array.isArray(payload.aud)
      ? !payload.aud.includes(AUDIENCE)
      : payload.aud !== AUDIENCE)
  )
    throw new Error("Audience inválido");

  return payload;
}

function payloadIsAdmin(pl: any): boolean {
  const roleUri =
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
  const role = pl[roleUri] ?? pl.role ?? pl.isAdmin;
  return role === "Admin" || role === true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (DEBUG) console.log(`[Middleware] Incoming request: ${pathname}`);

  // Bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.(.*)$/.test(pathname)
  ) {
    if (DEBUG) console.log(`[Middleware] Bypass path: ${pathname}`);
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (DEBUG) console.log(`[Middleware] Admin route: ${pathname}`);
    const token = req.cookies.get("refreshToken")?.value;

    console.log(req.cookies)
    
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/";

    if (!token) {
      if (DEBUG) console.log("[Middleware] No token, redirect to /");
      return NextResponse.redirect(loginUrl);
    }

    try {
      if (DEBUG) console.log("[Middleware] Verifying token...");
      const payload = await verifyJwt(token);
      if (DEBUG) console.log("[Middleware] JWT payload:", payload);

      if (!payloadIsAdmin(payload)) {
        if (DEBUG) console.log("[Middleware] Not admin, redirect to /");
        const homeUrl = req.nextUrl.clone();
        homeUrl.pathname = "/";
        return NextResponse.redirect(homeUrl);
      }

      if (DEBUG) console.log("[Middleware] Admin confirmed, allow");
      return NextResponse.next();
    } catch (err) {
      if (DEBUG) console.log("[Middleware] JWT verify error:", err);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (DEBUG) console.log(`[Middleware] Public route: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};