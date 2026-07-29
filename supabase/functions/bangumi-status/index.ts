import { cors, err, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const c = cors(req); if (c) return c;
  try {
    const { user, sb } = await requireAuth(req);
    const { data } = await sb
      .from("bangumi_connections")
      .select("bangumi_user_id, bangumi_username, connected_at, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return json({ connected: false });
    return json({
      connected:        true,
      bangumiUserId:    data.bangumi_user_id,
      bangumiUsername:  data.bangumi_username,
      connectedAt:      data.connected_at,
      tokenExpired:     new Date(data.expires_at) < new Date(),
    });
  } catch (e) {
    return err((e as Error).message, 401);
  }
});
