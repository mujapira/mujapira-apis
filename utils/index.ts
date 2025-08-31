export function setCookie(name: string, value: string, maxAgeSec: number) {
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`;
}
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}
export function toISOOrEmpty(d?: string) {
  if (!d) return "";
  const dd = new Date(d);
  return isNaN(dd.getTime()) ? "" : dd.toISOString();
}
export function formatDatePtBR(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}
export function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export function parseBool(s: string | null | undefined): boolean | undefined {
  if (s == null) return undefined;
  const v = s.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return undefined;
}
export function clampedInterval(n?: number) {
  if (!Number.isFinite(n as number)) return 60;
  const x = Math.max(1, Math.round(n as number));
  return x;
}
