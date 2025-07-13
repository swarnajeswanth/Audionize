# Audionize

**Audionize** is a modern web app for real-time audio synchronization across multiple devices. Built with Next.js, React, and Socket.IO, it enables seamless group listening experiences—whether on the same network or across the globe.

---

## 🚀 Features

- **Universal Audio Sync:** Host audio playback and synchronize it with clients in real time—works on both LAN and Internet.
-  Host uploads audio and controls playback; clients join instantly with a 6-digit code.
- **Secure Authentication:** Email/password login with NextAuth.js, JWT sessions, bcrypt password hashing, and rate limiting.
- **Session Management:** Automatic reconnection, heartbeat monitoring, and persistent sessions for reliable group listening.
- **Modern UI:** Responsive, mobile-friendly interface with Tailwind CSS and smooth GSAP animations.
- **Production-Ready Security:** CSP, XSS/CSRF protection, security headers, and more. See [SECURITY.md](SECURITY.md).
- **Open Source:** Easy to deploy, customize, and extend.

---

## 🛠️ Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.local.example` to `.env.local` and set your secrets (see [AUTH_SETUP.md](AUTH_SETUP.md)).

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Sync Server:**  
   For real-time sync, deploy or run the sync server (see [SYNC_SERVER_SETUP.md](SYNC_SERVER_SETUP.md)).

---

## 🧑‍💻 Project Structure

```
audionize/
├── src/
│   ├── app/                # Next.js app directory
│   │   ├── api/            # API routes (auth, health, info, network)
│   │   ├── auth/           # Sign-in and sign-up pages
│   │   ├── client/         # Client join page
│   │   └── page.js         # Main app entry
│   ├── components/         # React UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # API config (Axios, helpers)
│   ├── services/           # API service layer
│   ├── store/              # Redux state management
│   └── utils/              # Utility functions (security, users)
├── public/                 # Static assets
├── server.js               # Sync server (Socket.IO)
├── SECURITY.md             # Security implementation details
├── SYNC_SERVER_SETUP.md    # Sync server deployment guide
├── CLIENT_SESSION_IMPROVEMENTS.md
├── USER_FLOW.md
├── AUTH_SETUP.md
├── CLEANUP_SUMMARY.md
└── README.md               # This file
```

---

## 🔒 Security

- **Input validation & sanitization**
- **Rate limiting** on authentication and API
- **Password hashing** with bcryptjs
- **JWT session management**
- **Security headers** (CSP, XSS, etc.)
- **CSRF protection**
- **Session management**
- **Error handling** without sensitive data
- **HTTPS enforcement** (middleware)
- **File upload validation**
- **WebSocket authentication**

See [SECURITY.md](SECURITY.md) for full details.

---

## 🌐 Deployment

- **Frontend:** Deploy on [Vercel](https://vercel.com), [Netlify](https://netlify.com), or your preferred platform.
- **Sync Server:** Deploy on [Render](https://render.com), Railway, or run locally.  
  See [SYNC_SERVER_SETUP.md](SYNC_SERVER_SETUP.md) for instructions.

---

## 👤 Authentication

- **Sign Up:** `/auth/signup`
- **Sign In:** `/auth/signin`
- **Protected Routes:** `/host`, `/settings`
- **Demo Account:**  
  - Email: `admin@audionize.com`  
  - Password: `password`

See [AUTH_SETUP.md](AUTH_SETUP.md) for more.

---

## 📖 Documentation

- [USER_FLOW.md](USER_FLOW.md): User journey and authentication flow
- [SYNC_FEATURES.md](SYNC_FEATURES.md): Audio sync features and technical details
- [CLIENT_SESSION_IMPROVEMENTS.md](CLIENT_SESSION_IMPROVEMENTS.md): Session reliability improvements
- [CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md): Codebase and security summary

---

## 🤝 Contributing

Contributions are welcome! Please open issues or pull requests for improvements and bug fixes.

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Socket.IO Documentation](https://socket.io/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---



<img width="362" height="647" alt="Audionize1" src="https://github.com/user-attachments/assets/9ad00670-d097-470a-8251-0123a6f208e6" />
<img width="1017" height="817" alt="Audionize2" src="https://github.com/user-attachments/assets/868e9a6a-1403-4685-a6c7-b093fccc17df" />
<img width="783" height="765" alt="Audionize3" src="https://github.com/user-attachments/assets/7c65d423-3ff3-40d9-b91b-aa151ee15ba8" />

