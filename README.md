# Neon Local Blog

A lightweight blogging website made with HTML, CSS, JavaScript, Python (Flask), JSON, and plain-text data files. It uses **no cloud database**.

## Features

- Sign up and log in with a username and password.
- Passwords are stored as salted password hashes in `data/users.txt` (not readable plaintext passwords).
- Create posts, browse posts, like/unlike posts, comment, copy posts, and delete your own posts.
- Posts, likes, and comments persist in `data/database.txt` as one JSON object per line.
- Export a JSON backup from the footer.
- Neon RGB-inspired visuals, floating particles, responsive layout, and a **Memory saver** toggle.
- Uses only a small particle canvas and disables animations/particles in Memory saver mode.

## Run on Windows, macOS, Linux, or Android

Python 3.10+ is recommended.

1. Extract the complete ZIP to a folder.
2. Open a terminal in that folder.
3. Install dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

4. Start the server:

   ```bash
   python app.py
   ```

5. Open `http://127.0.0.1:5000` in your browser on the same device.

On Android, you can try this with Pydroid 3: install Flask using its pip interface or `pip install Flask`, then run `app.py`. Keep the app/terminal alive while using the site.

## Important: do not open `static/index.html` directly

The browser cannot safely write to local `.txt` files. The Python server connects the HTML frontend to the local text files. Always open the local address shown above.

## Where your data lives

- `data/users.txt` — one JSON record per line with username and password hash.
- `data/database.txt` — one JSON record per line for each post, including likes and comments.

Keep these files in place. Back them up before updating or moving the project. The app creates them automatically if missing. The app uses a temporary file and atomic replacement when saving to reduce the chance of a half-written database.

## Moving the project to another device

To carry the existing content to another device, stop the server and copy the **entire project folder**, including both text files inside `data/`. The copy contains the data as it existed at copy time. Later edits on one device do **not** automatically appear on another device; that would require a server or cloud sync. Do not run two app instances that write to the same files over a shared network folder.

## Security notes

- This is a small local/demo app, not a hardened public website.
- Passwords are hashed using Werkzeug's password hashing; never store real passwords as plain text.
- Keep the project private because `users.txt` and `database.txt` contain account and blog data.
- The server is bound to `127.0.0.1`, so it is only reachable from the same device by default. Do not expose it to the public internet without adding production security controls.
- The Flask session secret is generated each time the server starts unless `BLOG_SECRET_KEY` is set. This is fine for a local demo; active sessions may be logged out after a restart.
- Make regular backups. Text files are convenient but are not encryption or a substitute for backups.

## Project structure

```text
neon_local_blog/
├── app.py
├── requirements.txt
├── README.md
├── data/
│   ├── database.txt
│   └── users.txt
└── static/
    ├── index.html
    ├── style.css
    └── app.js
```
