import { session } from "electron";

interface RawCookie {
  name: string;
  value: string;
  expires?: number | null;
}
interface CookieSource {
  getCookies?: () => Promise<RawCookie[]>;
}

const AUTH_COOKIES = new Set(["auth", "twoFactorAuth"]);

export async function syncSessionCookies(vrc: unknown): Promise<void> {
  const src = vrc as CookieSource | null;
  if (!src?.getCookies) return;

  let cookies: RawCookie[];
  try {
    cookies = await src.getCookies();
  } catch {
    return;
  }

  const jar = session.defaultSession.cookies;
  for (const c of cookies) {
    if (!AUTH_COOKIES.has(c.name)) continue;
    try {
      await jar.set({
        url: "https://api.vrchat.cloud",
        domain: ".vrchat.cloud",
        path: "/",
        name: c.name,
        value: c.value,
        secure: true,
        httpOnly: true,
        expirationDate: c.expires ? c.expires / 1000 : undefined,
      });
    } catch {}
  }
}

export async function clearSessionCookies(): Promise<void> {
  const jar = session.defaultSession.cookies;
  for (const name of AUTH_COOKIES) {
    try {
      await jar.remove("https://api.vrchat.cloud", name);
    } catch {}
  }
}
