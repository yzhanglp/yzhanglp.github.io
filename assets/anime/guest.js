// guest.js — public anime tracker page
import { getPublicWatchlist } from "./api.js";
import { CONFIG } from "./config.js";

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const STATUS_LABEL = {
  watching:"Watching", planned:"Planned",
  paused:"On Hold", completed:"Completed", dropped:"Dropped",
};

// ── Mock data (shown when Supabase is not configured) ─────────────────────
const MOCK_ITEMS = [
  { subjectId:400602, name:"葬送のフリーレン", nameCn:"葬送的芙莉莲",
    image:"https://lain.bgm.tv/pic/cover/l/19/02/400602_iQlMW.jpg",
    score:9.0, rank:12, ratingCount:52341, status:"completed", progress:28, totalEpisodes:28, weekday:5, nextEpisode:null },
  { subjectId:464796, name:"Re:ゼロから始める異世界生活 第3期", nameCn:"Re:从零开始的异世界生活 第3季",
    image:"https://lain.bgm.tv/pic/cover/l/9e/2e/464796_DAXFD.jpg",
    score:8.5, rank:67, ratingCount:12480, status:"watching", progress:5, totalEpisodes:25, weekday:3,
    nextEpisode:{ episode:6, airdate:"2026-08-05" } },
  { subjectId:471765, name:"推しの子 第3期", nameCn:"我推的孩子 第3季",
    image:"https://lain.bgm.tv/pic/cover/l/3c/5f/471765_sVz3p.jpg",
    score:8.3, rank:104, ratingCount:8923, status:"watching", progress:3, totalEpisodes:13, weekday:2,
    nextEpisode:{ episode:4, airdate:"2026-08-06" } },
  { subjectId:454430, name:"薬屋のひとりごと 第2期", nameCn:"药屋少女的呢喃 第2季",
    image:"https://lain.bgm.tv/pic/cover/l/53/6e/454430_lVhIq.jpg",
    score:8.9, rank:31, ratingCount:18654, status:"watching", progress:8, totalEpisodes:24, weekday:6,
    nextEpisode:{ episode:9, airdate:"2026-08-08" } },
  { subjectId:429757, name:"ダンジョン飯", nameCn:"迷宫饭",
    image:"https://lain.bgm.tv/pic/cover/l/6b/f7/429757_H6yit.jpg",
    score:8.8, rank:23, ratingCount:31208, status:"completed", progress:24, totalEpisodes:24, weekday:5, nextEpisode:null },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }

function formatDaysUntil(dateStr) {
  const d = Math.ceil((new Date(dateStr) - new Date(today())) / 86400000);
  if (d < 0) return "Aired"; if (d === 0) return "Today";
  if (d === 1) return "Tomorrow"; return `in ${d} days`;
}

function updatedAt() {
  return new Intl.DateTimeFormat(undefined, {
    timeZone:"Europe/London", dateStyle:"medium", timeStyle:"short",
  }).format(new Date());
}

// ── Render ─────────────────────────────────────────────────────────────────

function statusBadge(status) {
  return `<span class="anime-card-status-badge status-${status}">${STATUS_LABEL[status] ?? status}</span>`;
}

function renderCard(item) {
  const name = item.nameCn || item.name;
  const nextHtml = item.nextEpisode
    ? `<div class="anime-card-next">Ep ${item.nextEpisode.episode} · ${formatDaysUntil(item.nextEpisode.airdate)}</div>`
    : "";
  const progressHtml = item.totalEpisodes
    ? `<div class="anime-card-progress">${item.progress} / ${item.totalEpisodes} ep</div>`
    : (item.progress ? `<div class="anime-card-progress">${item.progress} ep</div>` : "");
  const scoreHtml = item.score
    ? `<div class="anime-card-score"><span class="score-value">★ ${item.score.toFixed(1)}</span><span class="score-rank"> · #${item.rank ?? "?"}</span></div>`
    : "";
  const coverHtml = item.image
    ? `<img class="anime-card-cover" src="${item.image}" alt="${name}" loading="lazy">`
    : `<div class="anime-card-cover-placeholder">📺</div>`;
  return `
<div class="anime-card" data-status="${item.status}">
  ${coverHtml}
  <div class="anime-card-body">
    ${statusBadge(item.status)}
    <div class="anime-card-title-cn">${name}</div>
    <div class="anime-card-title-jp">${item.name}</div>
    ${scoreHtml}${progressHtml}${nextHtml}
  </div>
</div>`;
}

function renderSchedule(items) {
  const todayWd = new Date().getDay();
  const byDay = Object.fromEntries(WEEKDAYS.map((_,i) => [i, []]));
  items.forEach(item => { if (item.weekday != null && item.nextEpisode) byDay[item.weekday].push(item); });
  return `
<div class="anime-section-title">Weekly Schedule</div>
<div class="schedule-board">
${WEEKDAYS.map((day, wd) => `
  <div class="schedule-day${wd === todayWd ? " today" : ""}">
    <div class="schedule-day-label">${day}</div>
    ${byDay[wd].map(item => `
      <div class="schedule-thumb">
        ${item.image ? `<img src="${item.image}" alt="" loading="lazy">` : "📺"}
        <span class="schedule-thumb-name">${item.nameCn || item.name}</span>
      </div>`).join("")}
  </div>`).join("")}
</div>`;
}

function renderGrid(items, filter) {
  const filtered = filter === "all" ? items : items.filter(x => x.status === filter);
  if (!filtered.length) return `<div class="anime-empty">Nothing here yet.</div>`;
  return `<div class="anime-grid">${filtered.map(renderCard).join("")}</div>`;
}

function renderFilters(current, items) {
  const counts = {};
  items.forEach(x => { counts[x.status] = (counts[x.status] ?? 0) + 1; });
  const opts = [["all", "All", items.length], ...Object.entries(STATUS_LABEL).map(([k,v]) => [k, v, counts[k] ?? 0])];
  return `<div class="anime-filters">
    ${opts.filter(([k,, c]) => c > 0 || k === "all").map(([k,v,c]) =>
      `<button class="filter-btn${k===current?" active":""}" data-filter="${k}">${v}${c ? ` <small>(${c})</small>` : ""}</button>`
    ).join("")}
  </div>`;
}

// ── App state ──────────────────────────────────────────────────────────────

let state = { items: [], filter: "all", mock: false };

function renderApp() {
  const app = document.getElementById("anime-app");
  const watching = state.items.filter(x => x.status === "watching");
  const filtered  = state.filter === "all" ? state.items : state.items.filter(x => x.status === state.filter);
  app.innerHTML = `
<div class="anime-header">
  <h1>📺 Anime</h1>
  <div class="subtitle">Updated ${updatedAt()}${state.mock ? " · <em>demo data</em>" : ""}</div>
</div>
${renderFilters(state.filter, state.items)}
${watching.length && state.filter === "all" ? renderSchedule(watching) : ""}
<div class="anime-section-title">
  ${state.filter === "all" ? "All" : STATUS_LABEL[state.filter] ?? state.filter}
  (${filtered.length})
</div>
${renderGrid(state.items, state.filter)}`;

  app.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => { state.filter = btn.dataset.filter; renderApp(); });
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    if (CONFIG.supabaseUrl) {
      state.items = await getPublicWatchlist();
      state.mock  = false;
    } else {
      state.items = MOCK_ITEMS;
      state.mock  = true;
    }
  } catch (e) {
    console.warn("Supabase load failed, using mock:", e);
    state.items = MOCK_ITEMS;
    state.mock  = true;
  }
  renderApp();
})();
