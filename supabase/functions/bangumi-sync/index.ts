import { cors, err, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { decrypt } from "../_shared/crypto.ts";
import { bgmRequest, refreshToken, STATUS_TO_BGM } from "../_shared/bangumi.ts";

Deno.serve(async (req) => {
  const c = cors(req); if (c) return c;
  try {
    const { user, sb } = await requireAuth(req);
    const { itemId, action } = await req.json() as { itemId: string; action: string };

    // Load item
    const { data: item, error: ie } = await sb
      .from("anime_items").select("*").eq("id", itemId).single();
    if (ie || !item) return err("Item not found", 404);

    // Load connection
    const { data: conn, error: ce } = await sb
      .from("bangumi_connections").select("*").eq("user_id", user.id).single();
    if (ce || !conn) return err("Bangumi not connected", 403);

    // Decrypt + maybe refresh token
    let accessToken = await decrypt(conn.access_token_enc);
    if (new Date(conn.expires_at) < new Date()) {
      const rt  = await decrypt(conn.refresh_token_enc);
      const tok = await refreshToken(rt);
      const [encA, encR] = await Promise.all([
        (await import("../_shared/crypto.ts")).encrypt(tok.access_token),
        (await import("../_shared/crypto.ts")).encrypt(tok.refresh_token),
      ]);
      await sb.from("bangumi_connections").update({
        access_token_enc:  encA,
        refresh_token_enc: encR,
        expires_at:        new Date(Date.now() + tok.expires_in * 1000).toISOString(),
        updated_at:        new Date().toISOString(),
      }).eq("user_id", user.id);
      accessToken = tok.access_token;
    }

    const subjectId = item.subject_id;

    if (action === "status" || action === "rating") {
      const body: Record<string, unknown> = {};
      if (action === "status") body.type = STATUS_TO_BGM[item.local_status] ?? 3;
      if (action === "rating") body.rate = item.personal_rating ?? 0;
      if (item.personal_note) body.comment = item.personal_note;

      await bgmRequest(`/v0/users/-/collections/${subjectId}`, {
        method: "POST", token: accessToken, body,
      });
    } else if (action === "progress") {
      // Load cached episodes to get episode IDs
      const { data: cache } = await sb
        .from("anime_cache").select("episodes_json").eq("subject_id", subjectId).single();
      const episodes = (cache?.episodes_json ?? []) as Array<{ id: number; type: number; sort: number }>;
      const mainEps  = episodes.filter(e => e.type === 0).sort((a, b) => a.sort - b.sort);
      const ids      = mainEps.slice(0, item.progress).map(e => e.id);
      if (ids.length > 0) {
        await bgmRequest(`/v0/users/-/collections/${subjectId}/episodes`, {
          method: "PATCH", token: accessToken, body: { episode_id: ids, type: 2 },
        });
      }
    } else {
      return err("Unknown action");
    }

    // Mark synced
    await sb.from("anime_items").update({
      sync_pending:  false,
      last_sync_at:  new Date().toISOString(),
      last_sync_error: null,
    }).eq("id", itemId);

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return err((e as Error).message, 500);
  }
});
