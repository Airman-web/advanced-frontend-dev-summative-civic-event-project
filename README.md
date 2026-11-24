# CivicEvent+ Project

An accessible city events & services portal.

| Folder | Contents |
|---|---|
| [`frontend/`](frontend/) | The UI: HTML, Tailwind CSS and jQuery. **Start here:** [frontend/README.md](frontend/README.md) explains how to run it and connect it to the API. |
| [`backend/`](backend/) | The provided Node.js + Express + PostgreSQL API. See [backend/README.md](backend/README.md). |
| [`video-demo/`](video-demo/) | Walkthrough video |

## Run locally

```bash
# Backend: http://localhost:4000 (needs PostgreSQL; see backend/README.md)
cd backend && npm install && npm run dev

# Frontend: http://localhost:5500
cd frontend && python3 -m http.server 5500
```

The frontend reads the API base URL from `frontend/assets/js/config.js` (default `http://localhost:4000`).
