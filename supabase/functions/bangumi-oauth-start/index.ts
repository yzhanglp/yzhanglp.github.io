import { cors, err, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const c = cors(req); if (c) return c;
  try {
    const { user, sb } = await requireAuth(req);

    // Generate one-time state
    const state = crypto.randomUUID();
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
    const stateHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,"0")).join("");

    // Store hash with 10-minute expiry
    const { error } = await sb.from("oauth_states").insert({
      state_hash: stateHash,
      user_id:    user.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw error;

    const url = new URL("https://bgm.tv/oauth/authorize");
    url.searchParams.set("client_id",     Deno.env.get("BANGUMI_CLIENT_ID")!);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri",  Deno.env.get("BANGUMI_REDIRECT_URI")!);
    url.searchParams.set("state",         state);

    return json({ url: url.toString() });
  } catch (e) {
    return err((e as Error).message, 401);
  }
});
