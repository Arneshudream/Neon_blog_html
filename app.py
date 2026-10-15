
from flask import Flask, request, jsonify, session, send_from_directory
from pathlib import Path
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import json
import os
import secrets
import threading

ROOT = Path(__file__).resolve().parent
USERS_FILE = ROOT / "users.txt"
DB_FILE = ROOT / "database.txt"

USERS_FILE.touch(exist_ok=True)
DB_FILE.touch(exist_ok=True)

app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get("BLOG_SECRET_KEY") or secrets.token_hex(32)

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("RENDER") == "true",
)

lock = threading.RLock()


# Frontend routes

@app.get("/")
def home():
    return send_from_directory(str(ROOT), "index.html")


@app.get("/static/style.css")
def serve_css():
    return send_from_directory(str(ROOT), "style.css")


@app.get("/static/app.js")
def serve_javascript():
    return send_from_directory(str(ROOT), "app.js")


# Database helpers

def read_json_lines(path):
    rows = []
    with lock:
        with path.open("r", encoding="utf-8") as file:
            for line in file:
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                    if isinstance(item, dict):
                        rows.append(item)
                except json.JSONDecodeError:
                    continue
    return rows


def write_json_lines(path, rows):
    temp = path.with_suffix(path.suffix + ".tmp")
    with lock:
        with temp.open("w", encoding="utf-8") as file:
            for row in rows:
                file.write(json.dumps(row, ensure_ascii=False) + "\n")
            file.flush()
            os.fsync(file.fileno())
        temp.replace(path)


def users():
    return read_json_lines(USERS_FILE)


def posts():
    return read_json_lines(DB_FILE)


def save_posts(rows):
    write_json_lines(DB_FILE, rows)


# Authentication helpers

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
    if not isinstance(value, str):
        return ""
    return value.strip()[:limit]


# Security headers

@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


# Current user

@app.get("/api/me")
def me():
    return jsonify(username=current_user())


# Signup

@app.post("/api/signup")
def signup():
    body = request.get_json(silent=True) or {}
    username = clean_text(body.get("username"), 24)
    password = body.get("password", "")

    if not isinstance(password, str):
        return jsonify(error="Invalid password."), 400

    if not (
        3 <= len(username) <= 24
        and all(c.isalnum() or c in "_-" for c in username)
    ):
        return jsonify(
            error="Username must be 3-24 characters using letters, numbers, _ or -."
        ), 400

    if len(password) < 8:
        return jsonify(
            error="Use a password with at least 8 characters."
        ), 400

    with lock:
        existing = users()

        if any(
            u.get("username", "").casefold() == username.casefold()
            for u in existing
        ):
            return jsonify(error="That username already exists."), 409

        existing.append({
            "username": username,
            "password_hash": generate_password_hash(password),
        })
        write_json_lines(USERS_FILE, existing)

    session.clear()
    session["username"] = username
    return jsonify(username=username), 201


# Login

@app.post("/api/login")
def login():
    body = request.get_json(silent=True) or {}
    username = clean_text(body.get("username"), 24)
    password = body.get("password", "")

    if not isinstance(password, str):
        return jsonify(error="Incorrect username or password."), 401

    user = next(
        (
            u for u in users()
            if u.get("username", "").casefold() == username.casefold()
        ),
        None,
    )

    if not user:
        return jsonify(error="Incorrect username or password."), 401

    password_hash = user.get("password_hash", "")
    if not password_hash or not check_password_hash(password_hash, password):
        return jsonify(error="Incorrect username or password."), 401

    session.clear()
    session["username"] = user["username"]
    return jsonify(username=user["username"])


# Logout

@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


# Get posts

@app.get("/api/posts")
def get_posts():
    data = posts()
    data.sort(
        key=lambda post: post.get("created_at", ""),
        reverse=True,
    )

    viewer = current_user()

    for post in data:
        likes = post.get("likes", [])
        comments = post.get("comments", [])

        if not isinstance(likes, list):
            likes = []
        if not isinstance(comments, list):
            comments = []

        post["liked_by_me"] = bool(viewer and viewer in likes)
        post["like_count"] = len(likes)
        post["comment_count"] = len(comments)

    return jsonify(posts=data, username=viewer)


# Create post

@app.post("/api/posts")
@require_login
def create_post():
    body = request.get_json(silent=True) or {}
    title = clean_text(body.get("title"), 100)
    content = clean_text(body.get("content"), 5000)

    if not title or not content:
        return jsonify(error="Add both a title and some content."), 400

    post = {
        "id": secrets.token_urlsafe(9),
        "author": current_user(),
        "title": title,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "likes": [],
        "comments": [],
    }

    with lock:
        data = posts()
        data.append(post)
        save_posts(data)

    return jsonify(post=post), 201


# Copy post

@app.post("/api/posts/<post_id>/copy")
@require_login
def copy_post(post_id):
    with lock:
        data = posts()
        original = next(
            (p for p in data if p.get("id") == post_id),
            None,
        )

        if not original:
            return jsonify(error="Post not found."), 404

        duplicate = {
            "id": secrets.token_urlsafe(9),
            "author": current_user(),
            "title": "Copy of " + original.get("title", "")[:90],
            "content": original.get("content", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "likes": [],
            "comments": [],
        }

        data.append(duplicate)
        save_posts(data)

    return jsonify(post=duplicate), 201


# Delete own post

@app.delete("/api/posts/<post_id>")
@require_login
def delete_post(post_id):
    with lock:
        data = posts()
        post = next(
            (p for p in data if p.get("id") == post_id),
            None,
        )

        if not post:
            return jsonify(error="Post not found."), 404

        if post.get("author") != current_user():
            return jsonify(
                error="You can delete only your own posts."
            ), 403

        save_posts([
            p for p in data if p.get("id") != post_id
        ])

    return jsonify(ok=True)


# Like or unlike post

@app.post("/api/posts/<post_id>/like")
@require_login
def toggle_like(post_id):
    with lock:
        data = posts()
        post = next(
            (p for p in data if p.get("id") == post_id),
            None,
        )

        if not post:
            return jsonify(error="Post not found."), 404

        likes = post.setdefault("likes", [])
        if not isinstance(likes, list):
            likes = []
            post["likes"] = likes

        username = current_user()

        if username in likes:
            likes.remove(username)
        else:
            likes.append(username)

        save_posts(data)

    return jsonify(
        liked=username in likes,
        like_count=len(likes),
    )


# Add comment

@app.post("/api/posts/<post_id>/comments")
@require_login
def add_comment(post_id):
    body = request.get_json(silent=True) or {}
    comment_text = clean_text(body.get("text"), 1000)

    if not comment_text:
        return jsonify(error="Write a comment first."), 400

    with lock:
        data = posts()
        post = next(
            (p for p in data if p.get("id") == post_id),
            None,
        )

        if not post:
            return jsonify(error="Post not found."), 404

        comments = post.setdefault("comments", [])
        if not isinstance(comments, list):
            comments = []
            post["comments"] = comments

        comment = {
            "id": secrets.token_urlsafe(7),
            "author": current_user(),
            "text": comment_text,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        comments.append(comment)
        save_posts(data)

    return jsonify(comment=comment), 201


# Start local server

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
                            
