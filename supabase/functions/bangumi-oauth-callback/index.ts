import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { exchangeToken, bgmRequest } from "../_shared/bangumi.ts";
import { encrypt } from "../_shared/crypto.ts";

const ADMIN_REDIRECT = "https://yzhanglp.com/anime/admin/";

Deno.serve(async (req) => {
  const url    = new URL(req.url);
  const code   = url.searchParams.get("code");
  const state  = url.searchParams.get("state");

  if (!code || !state) return redirect(ADMIN_REDIRECT + "?bangumi=error&reason=missing_params");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Hash and verify state
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
    const stateHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,"0")).join("");

    const { data: stateRow, error: se } = await sb
      .from("oauth_states").select("*").eq("state_hash", stateHash).single();
    if (se || !stateRow) return redirect(ADMIN_REDIRECT + "?bangumi=error&reason=invalid_state");
    if (new Date(stateRow.expires_at) < new Date()) {
      await sb.from("oauth_states").delete().eq("state_hash", stateHash);
      return redirect(ADMIN_REDIRECT + "?bangumi=error&reason=state_expired");
    }

    // Exchange code for tokens
    const token = await exchangeToken(code);

    // Get Bangumi user info
    const me = await bgmRequest<{ id: number; nickname: string }>(
      "/v0/me", { token: token.access_token }
    );

    // Encrypt and store
    const [encAccess, encRefresh] = await Promise.all([
      encrypt(token.access_token),
      encrypt(token.refresh_token),
    ]);

    await sb.from("bangumi_connections").upsert({
      user_id:           stateRow.user_id,
      bangumi_user_id:   me.id,
      bangumi_username:  me.nickname,
      access_token_enc:  encAccess,
      refresh_token_enc: encRefresh,
      expires_at:        new Date(Date.now() + token.expires_in * 1000).toISOString(),
      updated_at:        new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Clean up state
    await sb.from("oauth_states").delete().eq("state_hash", stateHash);

    return redirect(ADMIN_REDIRECT + "?bangumi=connected");
  } catch (e) {
    console.error(e);
    return redirect(ADMIN_REDIRECT + "?bangumi=error&reason=" + encodeURIComponent((e as Error).message));
  }
});

function redirect(to: string) {
  return new Response(null, { status: 302, headers: { Location: to } });
}
