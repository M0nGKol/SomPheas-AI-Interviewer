# InterviewLab Frontend

Next.js 16 frontend for InterviewLab — real-time collaborative technical interview platform.

## Features

- **Live collaborative editor** — Monaco + Yjs CRDT, synced in real time across participants
- **Voice & video** — LiveKit WebRTC with local/remote track rendering
- **Screen sharing** — `getDisplayMedia` + LiveKit screen track publishing
- **Collaborative debugging** — shared Yjs breakpoints with per-author color coding
- **AI chat** — SSE streaming from Gemini during interviews
- **Analytics** — skill progression charts with Recharts
- **Role-based UI** — Candidate, Interviewer, and Admin dashboards

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (Radix UI primitives)
- **State**: Zustand (auth), TanStack Query (server state)
- **Real-time**: Yjs + y-monaco, LiveKit Client
- **Editor**: @monaco-editor/react
- **Charts**: Recharts
- **HTTP**: Axios
- **Forms**: React Hook Form + Zod

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, register
│   ├── dashboard/          # All dashboard pages
│   ├── interview/[id]/     # Live interview room
│   └── join/[code]/        # Candidate join page
├── components/
│   ├── interview/          # InterviewRoom, Editor, DebugPanel, Voice/Video
│   ├── analytics/          # Charts and evaluation display
│   ├── layout/             # Navbar, sidebar
│   └── ui/                 # shadcn/ui base components
├── hooks/
│   ├── use-yjs-editor.ts   # Yjs + Monaco real-time sync
│   └── use-livekit-room.ts # LiveKit WebRTC connection
└── lib/
    ├── api/                # Typed API clients (axios)
    └── store/              # Zustand stores
```
