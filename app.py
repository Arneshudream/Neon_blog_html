from flask import Flask, request, jsonify, session, send_from_directory
from pathlib import Path
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import json, os, secrets, threading

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
USERS_FILE = DATA / "users.txt"
DB_FILE = DATA / "database.txt"
for p in (USERS_FILE, DB_FILE):
    p.touch(exist_ok=True)

app = Flask(__name__, static_folder="static")
app.secret_key = os.environ.get("BLOG_SECRET_KEY") or secrets.token_hex(32)
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")
lock = threading.RLock()

def read_json_lines(path):
    rows = []
    with lock:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    # Skip a damaged line rather than crashing the entire site.
                    continue
    return rows

def write_json_lines(path, rows):
    # Write a complete replacement then atomically swap it in to reduce corruption risk.
    temp = path.with_suffix(path.suffix + ".tmp")
    with lock:
        with temp.open("w", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
            f.flush()
            os.fsync(f.fileno())
        temp.replace(path)

def users():
    return read_json_lines(USERS_FILE)

def posts():
    return read_json_lines(DB_FILE)

def save_posts(rows):
    write_json_lines(DB_FILE, rows)

def current_user():
    return session.get("username")

def require_login(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if not current_user():
            return jsonify(error="Please log in first."), 401
        return fn(*args, **kwargs)
    return wrapped

def clean_text(value, limit):
    return str(value or "").strip()[:limit]

@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Cache-Control"] = "no-store"
    return response

@app.get("/")
def home():
    return send_from_directory("static", "index.html")

@app.get("/api/me")
def me():
    return jsonify(username=current_user())

@app.post("/api/signup")
def signup():
    body = request.get_json(silent=True) or {}
    username = clean_text(body.get("username"), 24)
    password = str(body.get("password") or "")
    if not (3 <= len(username) <= 24) or not all(c.isalnum() or c in "_-" for c in username):
        return jsonify(error="Username must be 3–24 characters using letters, numbers, _ or -."), 400
    if len(password) < 8:
        return jsonify(error="Use a password with at least 8 characters."), 400
    with lock:
        existing = users()
        if any(u["username"].casefold() == username.casefold() for u in existing):
            return jsonify(error="That username already exists."), 409
        existing.append({"username": username, "password_hash": generate_password_hash(password)})
        write_json_lines(USERS_FILE, existing)
    session["username"] = username
    return jsonify(username=username), 201

@app.post("/api/login")
def login():
    body = request.get_json(silent=True) or {}
    username = clean_text(body.get("username"), 24)
    password = str(body.get("password") or "")
    user = next((u for u in users() if u.get("username", "").casefold() == username.casefold()), None)
    if not user or not check_password_hash(user.get("password_hash", ""), password):
        return jsonify(error="Incorrect username or password."), 401
    session.clear()
    session["username"] = user["username"]
    return jsonify(username=user["username"])

@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=True)

@app.get("/api/posts")
def get_posts():
    data = posts()
    data.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    viewer = current_user()
    for p in data:
        p["liked_by_me"] = bool(viewer and viewer in p.get("likes", []))
        p["like_count"] = len(p.get("likes", []))
        p["comment_count"] = len(p.get("comments", []))
        # Frontend only needs comment contents, never expose internal password data.
    return jsonify(posts=data, username=viewer)

@app.post("/api/posts")
@require_login
def create_post():
    body = request.get_json(silent=True) or {}
    title = clean_text(body.get("title"), 100)
    content = clean_text(body.get("content"), 5000)
    if not title or not content:
        return jsonify(error="Add both a title and some content."), 400
    data = posts()
    post = {
        "id": secrets.token_urlsafe(9), "author": current_user(),
        "title": title, "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "likes": [], "comments": []
    }
    data.append(post)
    save_posts(data)
    return jsonify(post=post), 201

@app.post("/api/posts/<post_id>/copy")
@require_login
def copy_post(post_id):
    data = posts()
    original = next((p for p in data if p.get("id") == post_id), None)
    if not original:
        return jsonify(error="Post not found."), 404
    duplicate = {
        "id": secrets.token_urlsafe(9), "author": current_user(),
        "title": "Copy of " + original.get("title", "")[:90],
        "content": original.get("content", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "likes": [], "comments": []
    }
    data.append(duplicate)
    save_posts(data)
    return jsonify(post=duplicate), 201

@app.delete("/api/posts/<post_id>")
@require_login
def delete_post(post_id):
    data = posts()
    post = next((p for p in data if p.get("id") == post_id), None)
    if not post:
        return jsonify(error="Post not found."), 404
    if post.get("author") != current_user():
        return jsonify(error="You can delete only your own posts."), 403
    save_posts([p for p in data if p.get("id") != post_id])
    return jsonify(ok=True)

@app.post("/api/posts/<post_id>/like")
@require_login
def toggle_like(post_id):
    data = posts()
    post = next((p for p in data if p.get("id") == post_id), None)
    if not post:
        return jsonify(error="Post not found."), 404
    likes = post.setdefault("likes", [])
    if current_user() in likes:
        likes.remove(current_user())
    else:
        likes.append(current_user())
    save_posts(data)
    return jsonify(liked=current_user() in likes, like_count=len(likes))

@app.post("/api/posts/<post_id>/comments")
@require_login
def add_comment(post_id):
    body = request.get_json(silent=True) or {}
    text = clean_text(body.get("text"), 1000)
    if not text:
        return jsonify(error="Write a comment first."), 400
    data = posts()
    post = next((p for p in data if p.get("id") == post_id), None)
    if not post:
        return jsonify(error="Post not found."), 404
    comment = {
        "id": secrets.token_urlsafe(7), "author": current_user(),
        "text": text, "created_at": datetime.now(timezone.utc).isoformat()
    }
    post.setdefault("comments", []).append(comment)
    save_posts(data)
    return jsonify(comment=comment), 201

if __name__ == "__main__":
    print("Neon Local Blog is running at http://127.0.0.1:5000")
    print("Keep this terminal open while using the website. Press Ctrl+C to stop.")
    app.run(host="127.0.0.1", port=5000, debug=False)
