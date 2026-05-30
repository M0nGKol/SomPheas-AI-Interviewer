# User Guide

## Roles

| Role | Access |
|------|--------|
| **Candidate** | Join interviews, use editor, chat with AI |
| **Interviewer** | Create and manage interviews, invite candidates, view evaluations |
| **Admin** | Everything above + System Health dashboard |

---

## Getting Started

### 1. Create an Account

1. Go to the app and click **Get Started**
2. Enter email, password, and full name
3. Select your role: **Candidate** or **Interviewer**
4. Log in

---

## Interviewer Flow

### Create a Coding Problem

1. Go to **Problems** in the sidebar
2. Click **New Problem**
3. Fill in: title, description, difficulty (Easy / Medium / Hard), language, and starter code
4. Or click **Generate with AI** — enter a prompt and the AI creates the problem for you
5. Save

### Schedule an Interview

1. Go to **Interviews → New Interview**
2. Set title, select a candidate (by email), and optionally attach a coding problem
3. Click **Create Interview**
4. From the detail page, copy the **Invite Link** or **Room Code**
5. Send the link to your candidate

### Run the Interview

1. Open the interview detail page and click **Join Interview**
2. You enter the **Interview Room** with:
   - Shared Monaco code editor (live sync with the candidate)
   - AI chat panel on the right
   - Voice/video panel (LiveKit)
   - Run button to execute code

### Screen Sharing

1. Click the **Monitor** icon in the editor toolbar
2. Choose a screen or window in the browser dialog
3. A preview thumbnail appears in the bottom-left corner
4. If connected to LiveKit, the screen is shared with the candidate

### Collaborative Debugging

1. Click the **Bug** icon in the editor toolbar to enter Debug Mode
2. Click any **line number** in the editor gutter to set a breakpoint
3. Add an optional comment in the Debug Panel on the left
4. The candidate sees your breakpoints instantly (color-coded by author)
5. The candidate can set their own breakpoints too

### End and Review

1. Click **End Interview** when done
2. The AI evaluation runs in the background (Celery worker)
3. Go to **Analytics** — skill scores and feedback appear automatically

---

## Candidate Flow

### Join via Invite Link

1. Click the invite link the interviewer sent
2. Log in or register as a Candidate
3. You go directly into the Interview Room

### Join via Room Code

1. Log in as a Candidate
2. On the Candidate Dashboard, click **Join with Room Code**
3. Enter the 6-character code and click **Join**

### Inside the Interview Room

- **Code Editor** — write your solution; the interviewer sees every edit live
- **AI Chat** — ask for hints, explain your approach, request feedback
- **Voice/Video** — your audio and video are shared with the interviewer
- **Run Code** — click Run to execute your code and see output inline
- **Breakpoints** — if the interviewer sets a breakpoint, it appears as a colored dot on that line

> **Note:** The AI monitors for suspicious activity (tab switching, large code pastes). This is logged for the interviewer's review.

---

## Admin Flow

1. Log in with an Admin account
2. Go to **System** in the sidebar
3. The System Health dashboard shows all active backend nodes
4. Each card shows: Node ID, status, request count, CPU and memory
5. Click **Simulate Failure** to remove a node from the pool (deletes its Redis heartbeat)
6. The dashboard auto-refreshes every 5 seconds

---

## Analytics

- Go to **Analytics** in the sidebar
- View per-interview evaluation scores: Technical, Code Quality, Communication, Problem-Solving, Overall
- Skill progression charts show improvement over multiple sessions
- Strengths and weaknesses listed per evaluation with AI-generated feedback summary

---

## Tips

- Use two different browsers (or incognito) to test both Interviewer and Candidate simultaneously
- Screen sharing works best in Chrome and Edge
- If voice/video shows "Disconnected", the interviewer needs to configure LiveKit credentials
- AI evaluation may take 15–30 seconds after the interview ends — the page updates automatically
