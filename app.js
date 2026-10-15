(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  let mode = "login";
  let me = null;
  let posts = [];
  let toastTimer = null;
  let loadingPosts = false;

  const escapeHtml = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error || `Request failed (${response.status})`);
    }

    return body;
  }

  function toast(message) {
    const element = $("toast");
    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      element.classList.remove("show");
    }, 2400);
  }

  function setMode(next) {
    mode = next;

    document.querySelectorAll(".tab").forEach(button => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });

    if ($("authSubmit")) {
      $("authSubmit").innerHTML =
        mode === "login"
          ? 'Log in <span>↗</span>'
          : 'Create account <span>✦</span>';
    }

    if ($("authPassword")) {
      $("authPassword").autocomplete =
        mode === "login" ? "current-password" : "new-password";
    }

    if ($("authMessage")) $("authMessage").textContent = "";
  }

  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  $("authForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    if ($("authMessage")) $("authMessage").textContent = "";

    try {
      const result = await api(`/api/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          username: $("authUsername").value.trim(),
          password: $("authPassword").value
        })
      });

      me = result.username;
      $("authPassword").value = "";

      updateAuth();
      await loadPosts();

      toast(mode === "login" ? "Welcome back!" : "Account created!");
    } catch (error) {
      if ($("authMessage")) {
        $("authMessage").textContent = error.message;
      }
    }
  });

  function updateAuth() {
    if ($("userBadge")) {
      $("userBadge").textContent = me ? `@${me}` : "Guest";
    }

    $("authPanel")?.classList.toggle("hidden", !!me);
    $("composer")?.classList.toggle("hidden", !me);
    $("logoutBtn")?.classList.toggle("hidden", !me);
  }

  $("logoutBtn")?.addEventListener("click", async () => {
    try {
      await api("/api/logout", {
        method: "POST",
        body: "{}"
      });

      me = null;
      updateAuth();
      await loadPosts();
      toast("Logged out.");
    } catch (error) {
      toast(error.message);
    }
  });

  $("postForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    if ($("postMessage")) $("postMessage").textContent = "";

    try {
      await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          title: $("postTitle").value.trim(),
          content: $("postContent").value.trim()
        })
      });

      $("postForm").reset();
      await loadPosts();
      toast("Your post is saved locally.");
    } catch (error) {
      if ($("postMessage")) {
        $("postMessage").textContent = error.message;
      }
    }
  });

  async function loadPosts() {
    if (loadingPosts) return;
    loadingPosts = true;

    try {
      const data = await api("/api/posts");

      me = data.username;
      posts = Array.isArray(data.posts) ? data.posts : [];

      updateAuth();

      if ($("postTotal")) {
        $("postTotal").textContent = posts.length;
      }

      renderPosts();
    } catch (error) {
      if ($("feed")) {
        $("feed").innerHTML = `
          <div class="empty-state">
            Could not load posts: ${escapeHtml(error.message)}
            <br>Check that the Python server is running.
          </div>`;
      }
    } finally {
      loadingPosts = false;
    }
  }

  function renderPosts() {
    const feed = $("feed");
    if (!feed) return;

    if (!posts.length) {
      feed.innerHTML = `
        <div class="empty-state">
          <p>✨ No posts yet.</p>
          <p>Be the first to share something with the community.</p>
        </div>`;
      return;
    }

    feed.innerHTML = posts.map(post => {
      const date = post.created_at
        ? new Date(post.created_at).toLocaleString()
        : "";

      const comments = (post.comments || []).map(comment => `
        <div class="comment">
          <strong>${escapeHtml(comment.author)}</strong>
          ${escapeHtml(comment.text)}
        </div>
      `).join("");

      const own = me && post.author === me;

      return `
        <article class="post-card" data-id="${escapeHtml(post.id)}">
          <div class="post-meta">
            <span class="author">✦ ${escapeHtml(post.author)}</span>
            <span class="date">${escapeHtml(date)}</span>
          </div>

          <h3>${escapeHtml(post.title)}</h3>
          <p class="post-content">${escapeHtml(post.content)}</p>

          <div class="post-actions">
            <button class="action-btn ${post.liked_by_me ? "liked" : ""}"
              data-action="like" type="button">
              ${post.liked_by_me ? "♥" : "♡"}
              ${Number(post.like_count) || 0} Like
            </button>

            <button class="action-btn"
              data-action="comments" type="button">
              ▤ ${Number(post.comment_count) || 0} Comments
            </button>

            <button class="action-btn"
              data-action="copy" type="button">
              ▣ Copy post
            </button>

            ${own ? `
              <button class="action-btn"
                data-action="delete" type="button">
                ⌫ Delete
              </button>
            ` : ""}
          </div>

          <div class="comments ${post.showComments ? "" : "hidden"}">
            <div class="comment-list">
              ${comments || '<div class="comment">No comments yet. Start the conversation.</div>'}
            </div>

            ${me ? `
              <form class="comment-form">
                <input name="comment"
                  maxlength="1000"
                  required
                  placeholder="Write a comment..."
                  aria-label="Write a comment">

                <button class="btn btn-quiet" type="submit">
                  Send
                </button>
              </form>
            ` : `
              <p class="tiny-note">Log in to leave a comment.</p>
            `}
          </div>
        </article>
      `;
    }).join("");
  }

  $("feed")?.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const card = button.closest(".post-card");
    if (!card) return;

    const id = card.dataset.id;
    const action = button.dataset.action;

    if (action === "comments") {
      const post = posts.find(item => item.id === id);

      if (post) {
        post.showComments = !post.showComments;
        renderPosts();
      }

      return;
    }

    if (action === "delete") {
      if (!confirm("Delete your post permanently from this local database?")) {
        return;
      }
    }

    button.disabled = true;

    try {
      if (action === "like") {
        await api(`/api/posts/${encodeURIComponent(id)}/like`, {
          method: "POST",
          body: "{}"
        });

        await loadPosts();
      } else if (action === "copy") {
        await api(`/api/posts/${encodeURIComponent(id)}/copy`, {
          method: "POST",
          body: "{}"
        });

        await loadPosts();
        toast("A copy was added to your posts.");
      } else if (action === "delete") {
        await api(`/api/posts/${encodeURIComponent(id)}`, {
          method: "DELETE"
        });

        await loadPosts();
        toast("Post deleted.");
      }
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  });

  $("feed")?.addEventListener("submit", async event => {
    if (!event.target.matches(".comment-form")) return;

    event.preventDefault();

    const form = event.target;
    const card = form.closest(".post-card");
    const input = form.elements.comment;

    if (!card || !input.value.trim()) return;

    const postId = card.dataset.id;
    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = true;

    try {
      await api(
        `/api/posts/${encodeURIComponent(postId)}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            text: input.value.trim()
          })
        }
      );

      await loadPosts();

      const post = posts.find(item => item.id === postId);
      if (post) post.showComments = true;

      renderPosts();
      toast("Comment saved.");
    } catch (error) {
      toast(error.message);
      if (submitButton) submitButton.disabled = false;
    }
  });

  $("refreshBtn")?.addEventListener("click", loadPosts);

  const lowMotion = $("lowMotion");

  function saveMotionPreference(enabled) {
    document.body.classList.toggle("low-motion", enabled);

    try {
      localStorage.setItem("neonBlogLowMotion", enabled ? "1" : "0");
    } catch (_) {}

    if (enabled) {
      stopParticles();
    } else {
      startParticles();
    }
  }

  if (lowMotion) {
    try {
      lowMotion.checked =
        localStorage.getItem("neonBlogLowMotion") === "1";
    } catch (_) {}

    document.body.classList.toggle("low-motion", lowMotion.checked);

    lowMotion.addEventListener("change", event => {
      saveMotionPreference(event.target.checked);
    });
  }

  $("exportBtn")?.addEventListener("click", async () => {
    try {
      const data = await api("/api/posts");

      const backup = {
        exported_at: new Date().toISOString(),
        posts: data.posts || []
      };

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = "neon-blog-backup.json";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast("Backup export started.");
    } catch (error) {
      toast(error.message);
    }
  });

  const canvas = $("particles");
  const ctx = canvas ? canvas.getContext("2d", { alpha: true }) : null;

  let particles = [];
  let raf = 0;
  let width = 0;
  let height = 0;

  function resize() {
    if (!canvas || !ctx) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const count = window.innerWidth < 600 ? 14 : 28;

    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1 + Math.random() * 1.5,
      dx: (Math.random() - 0.5) * 0.25,
      dy: -0.12 - Math.random() * 0.25,
      a: 0.2 + Math.random() * 0.45
    }));
  }

  function draw() {
    if (!ctx || !canvas) {
      raf = 0;
      return;
    }

    ctx.clearRect(0, 0, width, height);

    for (const particle of particles) {
      particle.x += particle.dx;
      particle.y += particle.dy;

      if (particle.y < -5) {
        particle.y = height + 5;
        particle.x = Math.random() * width;
      }

      if (particle.x < -5) particle.x = width + 5;
      if (particle.x > width + 5) particle.x = -5;

      ctx.beginPath();
      ctx.arc(
        particle.x,
        particle.y,
        particle.r,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = `rgba(60,244,237,${particle.a})`;
      ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  function startParticles() {
    if (
      !canvas ||
      !ctx ||
      raf ||
      document.hidden ||
      (lowMotion && lowMotion.checked)
    ) {
      return;
    }

    resize();
    draw();
  }

  function stopParticles() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    if (ctx) ctx.clearRect(0, 0, width, height);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopParticles();
    } else {
      startParticles();
    }
  });

  window.addEventListener("resize", () => {
    if (!lowMotion || !lowMotion.checked) {
      resize();
    }
  });

  if (!lowMotion || !lowMotion.checked) {
    startParticles();
  }

  async function initialize() {
    try {
      const data = await api("/api/me");
      me = data.username || null;
    } catch (_) {
      me = null;
    }

    updateAuth();
    await loadPosts();
  }

  initialize();
})();
