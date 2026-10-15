🌌 NEON LOCAL BLOG // CYBERPUNK EDITION

<div align="center">⚡ NEON BLOG ⚡

"YOUR WORDS. YOUR WORLD. YOUR DIGITAL CITY."

◈ SYSTEM STATUS: ONLINE ◈

"CYBERPUNK UI" • "LOCAL-FIRST DATA" • "RGB NEON MODE"

"📸 Instagram" (https://www.instagram.com/arnesh.ai.king23/) · "💻 Repository" (https://github.com/Arneshudream/Neon_blog_html) · "🐛 Report a Bug" (https://github.com/Arneshudream/Neon_blog_html/issues)

</div>---

🧬 "01 // PROJECT OVERVIEW"

Welcome to Neon Local Blog — a lightweight blogging website with a futuristic neon aesthetic, designed for sharing thoughts, publishing posts, and connecting through comments.

Built with a Python backend and a web-based interface, the project stores blog data locally instead of relying on a cloud database.

«DESIGN DIRECTIVE: Dark surfaces. Electric colours. Glowing particles. Clear text. Maximum vibes, minimum lag.»

✨ "02 // FEATURES"

- 🔐 Account System — Sign up and log in with a username and password.
- 📝 Create Posts — Publish your thoughts and browse blog entries.
- 💬 Comments — Join conversations around posts.
- 💜 Like System — Like and unlike posts.
- 🗑️ Post Management — Delete your own posts.
- 📋 Copy Posts — Copy post content easily.
- 💾 Local Data Storage — Store posts, likes, and comments in local text files.
- 📦 JSON Backup — Export a backup of your blog data.
- 🌈 Neon Interface — RGB-inspired visuals and floating particles.
- 🧠 Memory Saver — Reduce animation and particle effects on lower-end devices.
- 📱 Responsive Layout — Designed for desktop and mobile screens.

🛠️ "03 // TECH STACK"

Technology| Purpose
HTML5| Web page structure
CSS3| Neon theme and responsive design
JavaScript| Interactive frontend
Python| Backend logic
Flask| Local web server
JSON / TXT| Local data persistence

🚀 "04 // INSTALLATION PROTOCOL"

💻 Windows, macOS, or Linux

Requirements: Python 3.10 or newer recommended.

1. Download or extract the complete project folder.
2. Open a terminal inside the project folder.
3. Install the dependencies:

python -m pip install -r requirements.txt

4. Start the application:

python app.py

5. Open this address in your browser on the same device:

http://127.0.0.1:5000

📱 Android — Pydroid 3

1. Install Pydroid 3.
2. Extract the complete project folder.
3. Install Flask using Pydroid's Pip interface or run:

pip install Flask

4. Open "app.py" in Pydroid 3 and run it.
5. Keep the server running while using the blog.
6. Open "http://127.0.0.1:5000" in your phone's browser.

«⚠️ If the browser cannot connect, keep the server running and check the terminal for errors. Do not open "static/index.html" directly; the Flask server connects the webpage to the local data files.»

📂 "05 // PROJECT STRUCTURE"

neon_local_blog/
│
├── app.py
├── requirements.txt
├── README.md
│
├── data/
│   ├── database.txt
│   └── users.txt
│
└── static/
    ├── index.html
    ├── style.css
    └── app.js

💾 "06 // DATA STORAGE"

Your blog data is stored locally:

- "data/users.txt" — usernames and password hashes.
- "data/database.txt" — blog posts, likes, and comments.

Moving to another device?

1. Stop the Flask server.
2. Copy the entire project folder, including both files inside "data/".
3. Transfer the folder to the other device.
4. Install the dependencies and run the application again.

Your copied data represents the state of the blog at the time of copying. Changes made afterward will not automatically synchronize between devices.

🔒 "07 // SECURITY PROTOCOL"

- Passwords should remain hashed, never stored as readable plaintext.
- Keep backups of your data files.
- Do not commit real passwords, secret keys, or private account data to GitHub.
- This project is intended as a local/demo application, not a hardened public service.
- Do not expose the Flask development server to the public internet without appropriate production security controls.

🧪 "08 // DEVELOPMENT CHECKLIST"

- [ ] Verify installation on Android.
- [ ] Test registration and login.
- [ ] Test creating, liking, and deleting posts.
- [ ] Test comments and JSON backup.
- [ ] Confirm data persists after restarting the server.
- [ ] Test Memory Saver mode on low-end devices.
- [ ] Keep project documentation updated.

---

<div align="center">🌃 "WELCOME TO THE NEON NETWORK"

CODE THE NIGHT. SHARE YOUR WORLD.

"⚡ VIEW REPOSITORY" (https://github.com/Arneshudream/Neon_blog_html)

"📸 FOLLOW ON INSTAGRAM" (https://www.instagram.com/arnesh.ai.king23/)

"NEON LOCAL BLOG // CYBERPUNK MODE // END OF TRANSMISSION"

</div>
