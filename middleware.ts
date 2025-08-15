import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.JWT_SECRET!;
const ISSUER = process.env.JWT_ISSUER!;
const AUDIENCE = process.env.JWT_AUDIENCE!;
const DEBUG = false;

async function tryRefresh(req: NextRequest): Promise<{ accessToken?: string } | null> {
  try {

    const res = await fetch(new URL("/api/auth/refresh", req.url), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: "{}",
    
    });

    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { accessToken?: string };
    if (!data?.accessToken) return null;
    return { accessToken: data.accessToken };
  } catch (err) {
    if (DEBUG) console.log("[MW] Erro no refresh:", err);
    return null;
  }
}

// --- middleware ----------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (DEBUG) console.log("[MW] Req:", pathname);

  const accessCookie = req.cookies.get("accessToken")?.value;

  const redirectHome = () => {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  };

  // (1) Sem accessToken => tenta refresh; se falhar, manda pra /
  if (!accessCookie) {
    if (DEBUG) console.log("[MW] Sem accessToken. Tentando refresh…");
    const refreshed = await tryRefresh(req);
    if (!refreshed?.accessToken) {
      if (DEBUG) console.log("[MW] Refresh falhou. Redirecionando /");
      return redirectHome();
    }

    const res = NextResponse.next();
    res.cookies.set("accessToken", refreshed.accessToken, {
      httpOnly: true,
      secure: true, // em dev http: troque para false
      sameSite: "lax",
      path: "/",
    });
    if (DEBUG) console.log("[MW] Refresh OK. Prosseguindo.");
    return res;
  }

  // (2) Access presente => valida; se expirar, tenta refresh; se falhar, /.
  let payload: Record<string, unknown>;
  try {
    payload = await verifyJwtHS256(accessCookie);
  } catch (e: any) {
    if (DEBUG) console.log("[MW] JWT inválido/expirado:", e?.message);
    if (e?.message === "exp") {
      const refreshed = await tryRefresh(req);
      if (refreshed?.accessToken) {
        const res = NextResponse.next();
        res.cookies.set("accessToken", refreshed.accessToken, {
          httpOnly: true,
          secure: true, // em dev http: troque para false
          sameSite: "lax",
          path: "/",
        });
        if (DEBUG) console.log("[MW] Refresh após exp OK. Prosseguindo.");
        return res;
      }
    }
    if (DEBUG) console.log("[MW] Sem refresh válido. Redirecionando /");
    return redirectHome();
  }

  if (!isAdmin(payload)) {
    if (DEBUG) console.log("[MW] Usuário não é admin. Redirecionando /");
    return redirectHome();
  }

  if (DEBUG) console.log("[MW] Admin OK. Next().");
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

// --- utils ---------------------------------------------------------------

function b64urlToArrayBuffer(input: string): ArrayBuffer {
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);

  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer; // ArrayBuffer cru evita incompatibilidades de "buffer"
}

async function verifyJwtHS256(token: string) {
  const [h64, p64, s64] = token.split(".");
  if (!h64 || !p64 || !s64) throw new Error("Formato JWT inválido");

  const header = JSON.parse(new TextDecoder().decode(b64urlToArrayBuffer(h64)));
  const payload = JSON.parse(
    new TextDecoder().decode(b64urlToArrayBuffer(p64))
  );
  const signature = b64urlToArrayBuffer(s64);

  if (header.alg !== "HS256") throw new Error("Algoritmo inválido");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(`${h64}.${p64}`)
  );
  if (!ok) throw new Error("Assinatura inválida");

  const now = Math.floor(Date.now() / 1000);
  // tolerância opcional de 30s, se quiser:
  // const skew = 30;
  // if (payload.exp && now >= payload.exp - skew) throw new Error("exp");

  if (payload.exp && now >= payload.exp) throw new Error("exp");
  if (payload.nbf && now < payload.nbf) throw new Error("nbf");
  if (ISSUER && payload.iss !== ISSUER) throw new Error("iss");

  const audOk = Array.isArray(payload.aud)
    ? payload.aud.includes(AUDIENCE)
    : payload.aud === AUDIENCE;
  if (AUDIENCE && !audOk) throw new Error("aud");

  return payload as Record<string, unknown>;
}

function isAdmin(payload: Record<string, unknown>): boolean {
  const roleUri =
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
  const role =
    (payload[roleUri] as string | undefined) ??
    (payload["role"] as string | undefined) ??
    (payload["isAdmin"] as boolean | undefined);

  return role === "Admin" || role === true;
}
