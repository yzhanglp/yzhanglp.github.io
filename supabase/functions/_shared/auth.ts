import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireAuth(req: Request) {
  const header = req.headers.get("Authorization") ?? "";
  const token  = header.replace("Bearer ", "").trim();
  if (!token) throw new Error("Missing auth token");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) throw new Error("Invalid token");
  return { user, sb };
}
