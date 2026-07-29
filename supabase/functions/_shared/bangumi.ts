const BASE = "https://api.bgm.tv";
const UA   = () => Deno.env.get("BANGUMI_USER_AGENT") ?? "yzhanglp-anime-tracker/1.0";

export async function bgmRequest<T>(path: string, opts: {
  method?: string; token?: string; body?: unknown; form?: Record<string,string>;
} = {}): Promise<T> {
  const headers = new Headers({ "Accept": "application/json", "User-Agent": UA() });
  let body: BodyInit | undefined;

  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);

  if (opts.form) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    body = new URLSearchParams(opts.form).toString();
  } else if (opts.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${BASE}${path}`, { method: opts.method ?? "GET", headers, body });
  if (!res.ok) throw new Error(`Bangumi ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Token exchange / refresh (hits bgm.tv not api.bgm.tv)
export async function exchangeToken(code: string): Promise<BgmToken> {
  const res = await fetch("https://bgm.tv/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA() },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      client_id:     Deno.env.get("BANGUMI_CLIENT_ID")!,
      client_secret: Deno.env.get("BANGUMI_CLIENT_SECRET")!,
      redirect_uri:  Deno.env.get("BANGUMI_REDIRECT_URI")!,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshToken(rt: string): Promise<BgmToken> {
  const res = await fetch("https://bgm.tv/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA() },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: rt,
      client_id:     Deno.env.get("BANGUMI_CLIENT_ID")!,
      client_secret: Deno.env.get("BANGUMI_CLIENT_SECRET")!,
      redirect_uri:  Deno.env.get("BANGUMI_REDIRECT_URI")!,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

export interface BgmToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
}

// Local status → Bangumi collection type
export const STATUS_TO_BGM: Record<string, number> = {
  watching: 3, planned: 1, completed: 2, paused: 4, dropped: 5,
};
