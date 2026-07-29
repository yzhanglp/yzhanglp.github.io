// api.js — all data access (Supabase + Bangumi direct calls)
import { supabase } from "./supabase-client.js";

const BANGUMI_API = "https://api.bgm.tv";
const BANGUMI_UA  = "yzhanglp-anime-tracker/1.0 (https://yzhanglp.com)";

// ── Schedule helpers ───────────────────────────────────────────────────────

function mode(arr) {
  const cnt = {};
  arr.forEach(v => { cnt[v] = (cnt[v] ?? 0) + 1; });
  return +Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0];
}

function calculateSchedule(episodes) {
  if (!episodes?.length) return { weekday: null, nextEpisode: null };
  const today = new Date().toISOString().slice(0, 10);
  const main = episodes
    .filter(e => e.type === 0 && e.airdate)
    .sort((a, b) => a.airdate.localeCompare(b.airdate));
  const released = main.filter(e => e.airdate <= today);
  const future   = main.filter(e => e.airdate > today);
  const next = future[0] ?? null;
  let weekday = null;
  if (released.length >= 1) {
    weekday = mode(released.slice(-3).map(e => new Date(e.airdate + "T12:00:00").getDay()));
  } else if (next) {
    weekday = new Date(next.airdate + "T12:00:00").getDay();
  }
  return {
    weekday,
    nextEpisode: next ? { episode: next.ep ?? next.sort ?? "?", airdate: next.airdate } : null,
  };
}

function normalizeItem(row) {
  const cache = Array.isArray(row.anime_cache) ? row.anime_cache[0] : row.anime_cache;
  const subj  = cache?.subject_json ?? {};
  const eps   = cache?.episodes_json ?? [];
  const sched = calculateSchedule(eps);
  return {
    id:            row.id,
    subjectId:     row.subject_id,
    status:        row.local_status,
    progress:      row.progress,
    isPublic:      row.is_public,
    sortOrder:     row.sort_order,
    personalRating: row.personal_rating,
    personalNote:  row.personal_note,
    manualWeekday: row.manual_weekday,
    name:          subj.name    ?? `Subject #${row.subject_id}`,
    nameCn:        subj.name_cn ?? subj.name ?? `Subject #${row.subject_id}`,
    image:         subj.images?.medium ?? subj.images?.small ?? "",
    score:         subj.rating?.score  ?? null,
    rank:          subj.rating?.rank   ?? null,
    ratingCount:   subj.rating?.total  ?? null,
    totalEpisodes: subj.eps ?? null,
    airDate:       subj.date ?? null,
    ...sched,
  };
}

// ── Supabase ───────────────────────────────────────────────────────────────

export async function getPublicWatchlist() {
  const { data, error } = await supabase
    .from("anime_items")
    .select("*, anime_cache(*)")
    .eq("is_public", true)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data.map(normalizeItem);
}

export async function getAdminWatchlist() {
  const { data, error } = await supabase
    .from("anime_items")
    .select("*, anime_cache(*)")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data.map(normalizeItem);
}

export async function addAnime(subjectId, subjectJson, episodesJson) {
  const { error: ce } = await supabase.from("anime_cache").upsert({
    subject_id:    subjectId,
    subject_json:  subjectJson,
    episodes_json: episodesJson ?? [],
    fetched_at:    new Date().toISOString(),
    expires_at:    new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }, { onConflict: "subject_id" });
  if (ce) throw ce;

  const { data, error } = await supabase
    .from("anime_items")
    .insert({ subject_id: subjectId, local_status: "watching", progress: 0, is_public: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAnime(id, patch) {
  const { error } = await supabase
    .from("anime_items")
    .update({ ...patch, last_local_update_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function removeAnime(id) {
  const { error } = await supabase.from("anime_items").delete().eq("id", id);
  if (error) throw error;
}

// ── Bangumi (direct browser calls) ─────────────────────────────────────────

async function bgm(path, opts = {}) {
  const res = await fetch(`${BANGUMI_API}${path}`, {
    method:  opts.method ?? "GET",
    headers: { "Accept": "application/json", "Content-Type": "application/json", "User-Agent": BANGUMI_UA },
    body:    opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`Bangumi ${res.status}`);
  return res.json();
}

export async function searchBangumi(keyword) {
  const data = await bgm("/v0/search/subjects?limit=12&offset=0", {
    method: "POST",
    body: { keyword, sort: "match", filter: { type: [2], nsfw: false } },
  });
  return (data.data ?? []).map(s => ({
    id:     s.id,
    name:   s.name,
    nameCn: s.name_cn ?? "",
    image:  s.images?.medium ?? s.images?.small ?? "",
    date:   s.date ?? "",
    score:  s.rating?.score ?? null,
    rank:   s.rating?.rank  ?? null,
    eps:    s.eps ?? null,
  }));
}

export async function getBangumiSubject(id) {
  return bgm(`/v0/subjects/${id}`);
}

export async function getBangumiEpisodes(id) {
  const data = await bgm(`/v0/episodes?subject_id=${id}&limit=200`);
  return data.data ?? [];
}

// ── Bangumi OAuth + Sync (via Edge Functions) ───────────────────────────────

const FUNCTIONS_URL = "https://ixszjmrfchqxpxyixiai.supabase.co/functions/v1";

async function callFunction(name, body, method = "POST") {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error("Not authenticated");
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method,
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error ?? res.statusText);
  }
  return res.json();
}

export async function getBangumiStatus() {
  return callFunction("bangumi-status", null, "GET");
}

export async function startBangumiOAuth() {
  const { url } = await callFunction("bangumi-oauth-start", {});
  window.location.href = url;
}

export async function syncToBangumi(itemId, action) {
  return callFunction("bangumi-sync", { itemId, action });
}
