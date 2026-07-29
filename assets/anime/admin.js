// admin.js — anime tracker admin page
import { supabase } from "./supabase-client.js";
import {
  getAdminWatchlist, addAnime, updateAnime, removeAnime,
  searchBangumi, getBangumiSubject, getBangumiEpisodes,
  getBangumiStatus, startBangumiOAuth, syncToBangumi,
} from "./api.js";

const STATUS_LABEL = {
  watching: "Watching", planned: "Planned",
  paused: "On Hold", completed: "Completed", dropped: "Dropped",
};

let state = {
  session: null,
  items: [],
  searchResults: [],
  searchOpen: false,
  searchQuery: "",
  searching: false,
  adding: null,
  loading: true,
  toast: null,
  bgmConn: null,   // { connected, bangumiUsername } or null
  syncing: {},     // { [itemId+action]: true }
};

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(msg, type = "info") {
  state.toast = { msg, type };
  render();
  setTimeout(() => { state.toast = null; render(); }, 3000);
}

// ── Auth ───────────────────────────────────────────────────────────────────

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  state.session = session;
  if (session) {
    await loadItems();
    loadBgmStatus();
    // Handle OAuth callback redirect
    const p = new URLSearchParams(location.search);
    if (p.has("bangumi")) {
      const v = p.get("bangumi");
      if (v === "connected") showToast("Bangumi connected!", "ok");
      else showToast("Bangumi error: " + (p.get("reason") ?? "unknown"), "err");
      history.replaceState({}, "", location.pathname);
    }
  }
  state.loading = false;
  render();

  supabase.auth.onAuthStateChange((_e, s) => {
    state.session = s;
    if (s) loadItems();
    else state.items = [];
    render();
  });
}

async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function logout() {
  await supabase.auth.signOut();
}

// ── Data ───────────────────────────────────────────────────────────────────

async function loadItems() {
  state.items = await getAdminWatchlist();
  render();
}

async function loadBgmStatus() {
  try { state.bgmConn = await getBangumiStatus(); } catch { state.bgmConn = null; }
  render();
}

async function handleSync(itemId, action) {
  const key = itemId + action;
  if (state.syncing[key]) return;
  state.syncing[key] = true;
  render();
  try {
    await syncToBangumi(itemId, action);
    showToast(`Synced ${action} to Bangumi ✓`, "ok");
    await loadItems();
  } catch (e) {
    showToast("Sync failed: " + e.message, "err");
  } finally {
    delete state.syncing[key];
    render();
  }
}

async function handleAdd(bgmId) {
  if (state.adding) return;
  state.adding = bgmId;
  render();
  try {
    const [subj, eps] = await Promise.all([
      getBangumiSubject(bgmId),
      getBangumiEpisodes(bgmId).catch(() => []),
    ]);
    await addAnime(bgmId, subj, eps);
    await loadItems();
    state.searchOpen = false;
    state.searchResults = [];
    state.searchQuery = "";
    showToast(`Added: ${subj.name_cn || subj.name}`, "ok");
  } catch (e) {
    showToast(e.message, "err");
  } finally {
    state.adding = null;
    render();
  }
}

async function handleUpdate(id, patch) {
  try {
    await updateAnime(id, patch);
    await loadItems();
    // Auto-sync to Bangumi if connected
    if (state.bgmConn?.connected) {
      if ("local_status" in patch) handleSync(id, "status");
      if ("progress"     in patch) handleSync(id, "progress");
    }
  } catch (e) {
    showToast(e.message, "err");
  }
}

async function handleRemove(id, name) {
  if (!confirm(`Remove "${name}" from your list?`)) return;
  try {
    await removeAnime(id);
    await loadItems();
    showToast("Removed", "ok");
  } catch (e) {
    showToast(e.message, "err");
  }
}

async function handleSearch(q) {
  if (!q.trim()) { state.searchResults = []; render(); return; }
  state.searching = true;
  render();
  try {
    state.searchResults = await searchBangumi(q);
  } catch (e) {
    showToast("Search failed: " + e.message, "err");
    state.searchResults = [];
  } finally {
    state.searching = false;
    render();
  }
}

// ── Render ─────────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById("anime-app");
  if (state.loading) {
    app.innerHTML = `<div class="anime-loading"><div class="anime-loading-spinner"></div><span>Loading...</span></div>`;
    return;
  }
  if (!state.session) { app.innerHTML = renderLogin(); bindLogin(); return; }
  app.innerHTML = renderDashboard();
  bindDashboard();
}

// ── Login ──────────────────────────────────────────────────────────────────

function renderLogin() {
  return `
<div class="anime-login-wrap">
  <h2>⚙️ Anime Admin</h2>
  <label>Email</label>
  <input id="adm-email" type="email" autocomplete="email" placeholder="you@example.com">
  <label>Password</label>
  <input id="adm-pw" type="password" autocomplete="current-password" placeholder="••••••••">
  <button class="btn-primary" id="adm-login-btn">Sign in</button>
  <div class="anime-error-msg" id="adm-err"></div>
</div>`;
}

function bindLogin() {
  document.getElementById("adm-login-btn").addEventListener("click", async () => {
    const email = document.getElementById("adm-email").value.trim();
    const pw    = document.getElementById("adm-pw").value;
    const btn   = document.getElementById("adm-login-btn");
    const err   = document.getElementById("adm-err");
    btn.disabled = true; btn.textContent = "Signing in…"; err.textContent = "";
    try {
      await login(email, pw);
    } catch (e) {
      err.textContent = e.message;
      btn.disabled = false; btn.textContent = "Sign in";
    }
  });
  document.getElementById("adm-pw").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("adm-login-btn").click();
  });
}

// ── Dashboard ──────────────────────────────────────────────────────────────

function renderDashboard() {
  const toastHtml = state.toast
    ? `<div class="adm-toast adm-toast-${state.toast.type}">${state.toast.msg}</div>`
    : "";
  const bgm = state.bgmConn;
  const bgmBtn = bgm?.connected
    ? `<span class="adm-bgm-status">🟢 Bangumi: <b>${escHtml(bgm.bangumiUsername ?? "connected")}</b></span>`
    : `<button class="btn-secondary" id="adm-bgm-connect">🔗 Connect Bangumi</button>`;
  return `
${toastHtml}
<div class="admin-toolbar">
  <h2>⚙️ Anime Admin</h2>
  <button class="btn-secondary" id="adm-search-open">＋ Add anime</button>
  <button class="btn-secondary" id="adm-reload">↻ Refresh</button>
  ${bgmBtn}
  <button class="btn-secondary" id="adm-logout">Sign out</button>
</div>
${state.searchOpen ? renderSearchDialog() : ""}
<div class="adm-item-list">
  ${state.items.length === 0
    ? `<div class="anime-empty">No anime yet. Click "＋ Add anime" to search Bangumi.</div>`
    : state.items.map(renderAdminCard).join("")}
</div>`;
}

function renderSearchDialog() {
  const results = state.searchResults;
  return `
<div class="search-overlay" id="search-overlay">
  <div class="search-dialog">
    <div class="search-dialog-header">
      <input id="search-input" type="text" placeholder="Search Bangumi…" value="${escHtml(state.searchQuery)}" autofocus>
      <button class="btn-secondary" id="search-go">Search</button>
      <button class="btn-secondary" id="search-close">✕</button>
    </div>
    <div class="search-results">
      ${state.searching
        ? `<div class="search-empty"><div class="anime-loading-spinner" style="margin:auto"></div></div>`
        : results.length === 0 && state.searchQuery
          ? `<div class="search-empty">No results.</div>`
          : results.map(r => `
<div class="search-result-item" data-bgm-id="${r.id}">
  ${r.image ? `<img src="${r.image}" alt="" loading="lazy">` : `<div style="width:40px;height:56px;background:#eee;border-radius:4px;flex-shrink:0"></div>`}
  <div class="search-result-info">
    <div class="search-result-name">${escHtml(r.nameCn || r.name)}</div>
    <div class="search-result-meta">${escHtml(r.name)}${r.date ? " · " + r.date.slice(0, 4) : ""}${r.score ? " · ★" + r.score.toFixed(1) : ""}${r.eps ? " · " + r.eps + "ep" : ""}</div>
  </div>
  ${state.adding === r.id
    ? `<span style="font-size:.8rem;color:#aaa">Adding…</span>`
    : `<button class="btn-secondary add-btn" data-bgm-id="${r.id}">Add</button>`}
</div>`).join("")}
    </div>
  </div>
</div>`;
}

function renderAdminCard(item) {
  const name = item.nameCn || item.name;
  const syncing = state.syncing[item.id+"status"] || state.syncing[item.id+"progress"];
  return `
<div class="adm-card" data-id="${item.id}">
  <div class="adm-card-cover">
    <a href="https://bgm.tv/subject/${item.subjectId}" target="_blank" rel="noopener">
      ${item.image
        ? `<img src="${item.image}" alt="${escHtml(name)}" loading="lazy">`
        : `<div class="anime-card-cover-placeholder">📺</div>`}
    </a>
  </div>
  <div class="adm-card-body">
    <div class="adm-card-title">
      <a class="adm-title-link" href="https://bgm.tv/subject/${item.subjectId}" target="_blank" rel="noopener">${escHtml(name)}</a>
    </div>
    <div class="adm-card-meta">${item.airDate ? item.airDate.slice(0,4) + " · " : ""}${item.score ? "★ " + item.score.toFixed(1) : "—"}</div>
    <div class="adm-card-controls">
      <select class="adm-select" data-field="local_status" data-id="${item.id}">
        ${Object.entries(STATUS_LABEL).map(([k,v]) =>
          `<option value="${k}"${item.status===k?" selected":""}>${v}</option>`).join("")}
      </select>
      <label class="adm-label">Ep</label>
      <input class="adm-input adm-input-ep" type="number" min="0" max="${item.totalEpisodes ?? 9999}"
             value="${item.progress}" data-field="progress" data-id="${item.id}">
      ${item.totalEpisodes ? `<span class="adm-ep-total">/ ${item.totalEpisodes}</span>` : ""}
      <label class="adm-label adm-public-label">
        <input type="checkbox" class="adm-checkbox" data-field="is_public" data-id="${item.id}"${item.isPublic?" checked":""}>
        Public
      </label>
    </div>
    <div class="adm-sync-row">
      ${syncing ? `<span class="adm-syncing-indicator">↑ Syncing…</span>` : ""}
      <button class="btn-danger adm-remove" data-id="${item.id}" data-name="${escHtml(name)}">Remove</button>
    </div>
  </div>
</div>`;
}

function bindDashboard() {
  const app = document.getElementById("anime-app");

  app.querySelector("#adm-logout")?.addEventListener("click", logout);
  app.querySelector("#adm-reload")?.addEventListener("click", loadItems);
  app.querySelector("#adm-bgm-connect")?.addEventListener("click", () => startBangumiOAuth().catch(e => showToast(e.message, "err")));
  app.querySelector("#adm-search-open")?.addEventListener("click", () => {
    state.searchOpen = true; render();
  });

  // Search dialog
  if (state.searchOpen) {
    const overlay = app.querySelector("#search-overlay");
    const input   = app.querySelector("#search-input");
    app.querySelector("#search-close")?.addEventListener("click", () => {
      state.searchOpen = false; state.searchResults = []; state.searchQuery = ""; render();
    });
    overlay?.addEventListener("click", e => {
      if (e.target === overlay) { state.searchOpen = false; state.searchResults = []; state.searchQuery = ""; render(); }
    });
    const doSearch = () => {
      state.searchQuery = input?.value ?? "";
      handleSearch(state.searchQuery);
    };
    app.querySelector("#search-go")?.addEventListener("click", doSearch);
    input?.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
    // Add buttons
    app.querySelectorAll(".add-btn").forEach(btn => {
      btn.addEventListener("click", () => handleAdd(+btn.dataset.bgmId));
    });
  }

  // Inline edit controls
  app.querySelectorAll(".adm-select").forEach(sel => {
    sel.addEventListener("change", () => handleUpdate(sel.dataset.id, { [sel.dataset.field]: sel.value }));
  });
  app.querySelectorAll(".adm-input").forEach(inp => {
    inp.addEventListener("change", () => {
      const v = inp.dataset.field === "progress" ? +inp.value : inp.value;
      handleUpdate(inp.dataset.id, { [inp.dataset.field]: v });
    });
  });
  app.querySelectorAll(".adm-checkbox").forEach(cb => {
    cb.addEventListener("change", () => handleUpdate(cb.dataset.id, { [cb.dataset.field]: cb.checked }));
  });
  app.querySelectorAll(".adm-remove").forEach(btn => {
    btn.addEventListener("click", () => handleRemove(btn.dataset.id, btn.dataset.name));
  });
}

function escHtml(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── CSS additions (injected once) ─────────────────────────────────────────

const style = document.createElement("style");
style.textContent = `
.adm-toast { position:fixed; top:1rem; right:1rem; padding:.6rem 1.2rem; border-radius:8px;
  font-size:.85rem; z-index:200; box-shadow:0 4px 12px rgba(0,0,0,.15); }
.adm-toast-ok  { background:#e6f4ea; color:#1a7f37; }
.adm-toast-err { background:#fde8e8; color:#c0392b; }
.adm-toast-info{ background:#e8f0fe; color:#1a56db; }
.adm-item-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1rem; }
.adm-card { border:1px solid #eee; border-radius:10px; overflow:hidden; background:#fff; display:flex; }
.adm-card-cover { width:80px; flex-shrink:0; }
.adm-card-cover img, .adm-card-cover .anime-card-cover-placeholder
  { width:80px; height:110px; object-fit:cover; display:block; }
.adm-card-body { padding:.6rem; flex:1; min-width:0; }
.adm-card-title { font-size:.85rem; font-weight:600; color:#222; margin-bottom:.1rem;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.adm-card-meta  { font-size:.7rem; color:#999; margin-bottom:.25rem; }
.adm-card-score { font-size:.72rem; color:#e8a000; margin-bottom:.4rem; }
.adm-card-controls { display:flex; align-items:center; flex-wrap:wrap; gap:.3rem; margin-bottom:.4rem; }
.adm-select { font-size:.75rem; padding:.2rem .3rem; border:1px solid #ddd; border-radius:4px; }
.adm-label  { font-size:.72rem; color:#888; }
.adm-public-label { display:flex; align-items:center; gap:.2rem; cursor:pointer; }
.adm-input  { font-size:.75rem; padding:.2rem .3rem; border:1px solid #ddd; border-radius:4px; }
.adm-input-ep     { width:46px; }
.adm-input-rating { width:40px; }
.adm-ep-total { font-size:.72rem; color:#aaa; }
.adm-checkbox { accent-color:#222; }
.adm-sync-row { display:flex; flex-wrap:wrap; gap:.3rem; margin-top:.4rem; }
.adm-bgm-status { font-size:.8rem; color:#555; align-self:center; }
.adm-title-link { color:inherit; text-decoration:none; }
.adm-title-link:hover { text-decoration:underline; }
.adm-syncing-indicator { font-size:.72rem; color:#888; align-self:center; }
.adm-card-cover a { display:block; }
`;
document.head.appendChild(style);

// ── Boot ───────────────────────────────────────────────────────────────────
init();
