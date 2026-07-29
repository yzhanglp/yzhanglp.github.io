// admin.js — anime tracker admin page (Phase 2+ placeholder)

const app = document.getElementById("anime-app");
app.innerHTML = `
<div class="anime-header">
  <h1>⚙️ Anime Admin</h1>
  <div class="subtitle">Admin panel — login coming in Phase 2 (Supabase Auth)</div>
</div>
<div class="anime-empty">
  <p>Supabase backend not yet connected.</p>
  <p>Run: <code>supabase init &amp;&amp; supabase start</code> and fill in <code>assets/anime/config.js</code>.</p>
</div>`;
