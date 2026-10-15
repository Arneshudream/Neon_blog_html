(() => {
  const $ = id => document.getElementById(id);
  let mode = "login", me = null, posts = [], toastTimer = null;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(url, options={}) {
    const response = await fetch(url, {credentials:"same-origin", headers:{"Content-Type":"application/json", ...(options.headers||{})}, ...options});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  }
  function toast(message) {
    $("toast").textContent = message; $("toast").classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2400);
  }
  function setMode(next) {
    mode = next;
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    $("authSubmit").innerHTML = mode === "login" ? 'Log in <span>↗</span>' : 'Create account <span>✦</span>';
    $("authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
    $("authMessage").textContent = "";
  }
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  $("authForm").addEventListener("submit", async e => {
    e.preventDefault(); $("authMessage").textContent = "";
    try {
      const result = await api(`/api/${mode}`, {method:"POST", body:JSON.stringify({username:$("authUsername").value.trim(), password:$("authPassword").value})});
      me = result.username; $("authPassword").value = ""; updateAuth(); await loadPosts(); toast(mode === "login" ? "Welcome back!" : "Account created!");
    } catch(err) { $("authMessage").textContent = err.message; }
  });
  function updateAuth() {
    $("userBadge").textContent = me ? `@${me}` : "Guest";
    $("authPanel").classList.toggle("hidden", !!me);
    $("composer").classList.toggle("hidden", !me);
    $("logoutBtn").classList.toggle("hidden", !me);
  }
  $("logoutBtn").addEventListener("click", async () => {
    try { await api("/api/logout", {method:"POST", body:"{}"}); } catch(_) {}
    me = null; updateAuth(); await loadPosts(); toast("Logged out.");
  });
  $("postForm").addEventListener("submit", async e => {
    e.preventDefault(); $("postMessage").textContent = "";
    try {
      await api("/api/posts", {method:"POST", body:JSON.stringify({title:$("postTitle").value, content:$("postContent").value})});
      $("postForm").reset(); await loadPosts(); toast("Your post is saved locally.");
    } catch(err) { $("postMessage").textContent = err.message; }
  });
  async function loadPosts() {
    try {
      const data = await api("/api/posts"); me = data.username; posts = data.posts || [];
      updateAuth(); $("postTotal").textContent = posts.length;
      renderPosts();
    } catch(err) {
      $("feed").innerHTML = `<div class="empty-state">Could not load posts: ${escapeHtml(err.message)}<br>Check that the Python server is running.</div>`;
    }
  }
  function renderPosts() {
    if (!posts.length) { $("feed").innerHTML = '<div class="empty-state"><p>✨ No posts yet.</p><p>Be the first to share something with the community.</p></div>'; return; }
    $("feed").innerHTML = posts.map(p => {
      const date = p.created_at ? new Date(p.created_at).toLocaleString() : "";
      const comments = (p.comments || []).map(c => `<div class="comment"><strong>${escapeHtml(c.author)}</strong>${escapeHtml(c.text)}</div>`).join("");
      const own = me && p.author === me;
      return `<article class="post-card" data-id="${escapeHtml(p.id)}">
        <div class="post-meta"><span class="author">✦ ${escapeHtml(p.author)}</span><span class="date">${escapeHtml(date)}</span></div>
        <h3>${escapeHtml(p.title)}</h3><p class="post-content">${escapeHtml(p.content)}</p>
        <div class="post-actions">
          <button class="action-btn ${p.liked_by_me?'liked':''}" data-action="like">${p.liked_by_me?'♥':'♡'} ${p.like_count||0} Like</button>
          <button class="action-btn" data-action="comments">▤ ${(p.comment_count||0)} Comments</button>
          <button class="action-btn" data-action="copy">▣ Copy post</button>
          ${own?'<button class="action-btn" data-action="delete">⌫ Delete</button>':''}
        </div>
        <div class="comments ${p.showComments?'':'hidden'}"><div class="comment-list">${comments || '<div class="comment">No comments yet. Start the conversation.</div>'}</div>
          ${me?`<form class="comment-form"><input name="comment" maxlength="1000" required placeholder="Write a comment..." aria-label="Write a comment"><button class="btn btn-quiet" type="submit">Send</button></form>`:'<p class="tiny-note">Log in to leave a comment.</p>'}
        </div></article>`;
    }).join("");
  }
  $("feed").addEventListener("click", async e => {
    const btn = e.target.closest("[data-action]"); if (!btn) return;
    const card = btn.closest(".post-card"), id = card.dataset.id, action = btn.dataset.action;
    try {
      if (action === "comments") {
        const post = posts.find(p => p.id === id); if (post) post.showComments = !post.showComments;
        renderPosts(); return;
      }
      if (action === "like") {
        await api(`/api/posts/${encodeURIComponent(id)}/like`, {method:"POST", body:"{}"}); await loadPosts();
      } else if (action === "copy") {
        await api(`/api/posts/${encodeURIComponent(id)}/copy`, {method:"POST", body:"{}"}); await loadPosts(); toast("A copy was added to your posts.");
      } else if (action === "delete") {
        if (!confirm("Delete your post permanently from this local database?")) return;
        await api(`/api/posts/${encodeURIComponent(id)}`, {method:"DELETE"}); await loadPosts(); toast("Post deleted.");
      }
    } catch(err) { toast(err.message); }
  });
  $("feed").addEventListener("submit", async e => {
    if (!e.target.matches(".comment-form")) return;
    e.preventDefault(); const card = e.target.closest(".post-card"), input = e.target.elements.comment;
    try {
      await api(`/api/posts/${encodeURIComponent(card.dataset.id)}/comments`, {method:"POST", body:JSON.stringify({text:input.value})});
      await loadPosts(); const p = posts.find(p => p.id === card.dataset.id); if (p) p.showComments = true; renderPosts(); toast("Comment saved.");
    } catch(err) { toast(err.message); }
  });
  $("refreshBtn").addEventListener("click", loadPosts);
  $("lowMotion").addEventListener("change", e => {
    document.body.classList.toggle("low-motion", e.target.checked);
    try { localStorage.setItem("neonBlogLowMotion", e.target.checked ? "1" : "0"); } catch(_) {}
    if (e.target.checked) stopParticles(); else startParticles();
  });
  try { if (localStorage.getItem("neonBlogLowMotion") === "1") { $("lowMotion").checked = true; document.body.classList.add("low-motion"); } } catch(_) {}
  $("exportBtn").addEventListener("click", async () => {
    try {
      const data = await api("/api/posts");
      const blob = new Blob([JSON.stringify({exported_at:new Date().toISOString(), posts:data.posts}, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = "neon-blog-backup.json"; a.click(); URL.revokeObjectURL(url);
      toast("Backup export started.");
    } catch(err) { toast(err.message); }
  });

  // Small canvas particle effect; fewer particles on narrow screens and disabled in memory-saver mode.
  const canvas = $("particles"), ctx = canvas.getContext("2d", {alpha:true});
  let particles = [], raf = 0, width = 0, height = 0;
  function resize() {
    width = canvas.width = Math.min(window.innerWidth, 1600);
    height = canvas.height = Math.min(window.innerHeight, 1200);
    const count = window.innerWidth < 600 ? 14 : 28;
    particles = Array.from({length:count}, () => ({x:Math.random()*width,y:Math.random()*height,r:1+Math.random()*1.5,dx:(Math.random()-.5)*.25,dy:-.12-Math.random()*.25,a:.2+Math.random()*.45}));
  }
  function draw() {
    ctx.clearRect(0,0,width,height);
    for (const p of particles) {
      p.x += p.dx; p.y += p.dy;
      if (p.y < -5) {p.y=height+5;p.x=Math.random()*width;}
      if (p.x < -5) p.x=width+5; if (p.x > width+5) p.x=-5;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(60,244,237,${p.a})`; ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }
  function startParticles() { if (!raf && !document.hidden && !$("lowMotion").checked) {resize(); draw();} }
  function stopParticles() { if (raf) cancelAnimationFrame(raf); raf=0; ctx.clearRect(0,0,width,height); }
  document.addEventListener("visibilitychange", () => document.hidden ? stopParticles() : startParticles());
  window.addEventListener("resize", () => { if (!$("lowMotion").checked) resize(); });
  if (!$("lowMotion").checked) startParticles();
  (async () => { try { const data = await api("/api/me"); me = data.username; } catch(_) {} updateAuth(); await loadPosts(); })();
})();
