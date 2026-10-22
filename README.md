# Deadline Rescue — College Student Priority Engine

**Deadline Rescue** is a responsive web app tailored for college students facing heavy course loads. It triages coursework using deadline proximity, priority level, and estimated hours of effort to answer the critical question: *"What should I work on right now, and why?"*

---

## 🚀 How to Run the App

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Quick Start
```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Start development server
npm run dev

# 3. Open in your browser
# Typically http://localhost:3000 or the URL shown in terminal
```

To create and preview the production build:
```bash
npm run build
npm run preview
```

### Running Automated Tests
```bash
# Run unit test suite (Vitest)
npm test
```

---

## ✨ Features

1. **Streaming-Style Dashboard & Visual Architecture**:
   - **Aurora Background**: 3 slowly drifting radial-gradient blobs driven by transform-only GPU-accelerated CSS keyframes, layered beneath a static SVG noise film-grain overlay (~0.04 opacity).
   - **Workload Mood System**: Dynamic 7-day demand/capacity evaluation cross-fades smoothly over 1.2s between three atmospheric mood states: *Calm* (teal/emerald, <0.7 ratio), *Busy* (amber, 0.7–1.0 ratio), and *Overloaded* (warm red, >1.0 ratio).
   - **Glass Surfaces**: High-performance translucent glass panels (`rgba(10,10,14,0.55)`) with `backdrop-filter: blur(20px) saturate(140%)`, 1px borders (`rgba(255,255,255,0.12)`), 24px corner radius, and solid fallbacks for unsupported engines.
   - **Performance Guardrails**: Heavy backdrop blur strictly scoped to floating navigation, hero buttons, dropdown menus, and modals (never applied across repeated list items). Automatically pauses background animations when `document.hidden`. Includes a persistent **"Reduce effects"** toggle in the settings menu that activates automatically for `prefers-reduced-motion`.
   - **Floating Navigation with Hash Sync**:
     - Desktop: Floating glass pill positioned at top right with Today, Week, and Tasks tabs. The active tab is a crisp white pill sliding smoothly across tabs via shared `layoutId` physics. Includes direct Ask trigger, quick Add task button, and an animated glass settings menu.
     - Mobile: Floating bottom navigation bar respecting device safe-area insets (`pb-safe`).
     - No router library: Tab transitions are synced directly to the URL hash (`#today`, `#week`, `#tasks`) with cross-fading and vertical slide transitions via `<AnimatePresence>`.
   - **Hero Carousel (Today View)**:
     - Prominently showcases the top 3 ranked priority tasks as swipeable slides (no auto-advancing; accessible touch swipes, arrow keys, and carousel dots with an elongated active bar).
     - Bold condensed typography (`Bebas Neue`, `clamp(56px, 11vw, 120px)`) layered with a faint watermark course code.
     - 1-line grounded reason (under 90 characters) computed from real numbers.
     - White pill "Start" button linked to stopwatch chrono controls, paired with a glass secondary pill for "Done" and expandable "Details" (10-minute kickoff, notes, Not today deferral, and overdue recovery).
   - **Horizontal Task Rails**:
     - Scroll-snap horizontal rails with section titles and left/right gradient edge fades.
     - Cards (~260px wide) featuring course code chips, 2-line clamped titles, relative due text, and circular SVG progress rings tracking logged stopwatch time against estimated effort.
     - Today view rails: *"Keep Going"* (incomplete tasks with logged time), *"Due Soon"* (tasks due in next 48h), and *"Catch Up"* (overdue items needing resolution). Empty rails hide automatically.
   - **Full Week Workload Forecast (Week View)**:
     - Large glass panel displaying all 7 days with demand vs. capacity fill gauges and status pills (*Clear*, *Balanced*, *Heavy*).
     - Tapping any day reveals scheduled tasks and launches the interactive *"What if I move this?"* delay simulator with +1d, +2d, +3d shifts and instant plain-English consequence sentences.
   - **Course-Grouped Task Manager (Tasks View)**:
     - Search and course filter chips with active counts.
     - All coursework grouped cleanly under uppercase course headers in responsive glass rows with quick edit, delete, complete, and instructor email actions.

2. **Zero-Setup Clean Empty State & Explicit Demo Mode**:
   - First launch starts completely clean with zero pre-seeded fake tasks.
   - Welcomes students with an invitation (*"What's on your plate this week?"*), two clear primary actions (*"Paste your deadlines"* and *"Add a task"*), and a quiet link to take a tour.
   - Hides recommendation cards, lists, and forecasts entirely when empty so the screen never feels prematurely cluttered.
   - Reviewers and new students can load rich sample data on-demand in one tap via the **"..."** menu.
   - Detects legacy pre-seeded demo tasks for existing users and presents a non-destructive banner (*"These look like the demo tasks. Clear them and start fresh? [Clear] [Keep]"*) without ever wiping user data without confirmation.

3. **Continuous Risk Prioritization Engine & Overdue Threshold**:
   - Continuous rule-based risk formulation: $\text{risk} = \frac{\text{remaining effort}}{\text{available hours}}$.
   - Guarantees that closer deadlines, higher priority, greater effort, or tighter buffers never lower score.
   - Tasks in time deficit mathematically never rank below non-deficit tasks of equal or lower priority.
   - **Overdue Multiplier Cap**: Capped at 1.5x of the deadline risk so overdue tasks cannot permanently hijack focus from large projects due tonight.
   - **24-Hour Overdue Threshold**: Tasks overdue by $\le 24$ hours remain in the normal ranking (allowing quick late turn-in for partial credit). After 24 hours, tasks gracefully drop out of "Now" and "Next up" and move to a dedicated **Catch-up list**.
   - **Guilt-Free Catch-up Review**: A calm note under the Now card (*"N older items need attention"*) opens an actionable modal with 4 calm choices: *Mark done*, *Let it go* (dropped without shame), *Email instructor*, or *Reschedule*.
   - Live 30-second interval ticker refreshes countdowns, buffers, and urgency badges in real time.
   - Safe local storage schema versioning and seamless migration (`v1` to `v2`).
   - Clear explainable rationale in supportive, non-scolding language.

4. **Student Capacity & Working Hours Buffer**:
   - Replaces naive wall-clock time with an **available working hours buffer** that counts only actual focus study hours before each deadline.
   - Configurable daily focus hours per day of week (defaults to 4h/day weekdays, 5h/day weekends with zero setup required).
   - Blocked recovery & academic windows (sleep from 11 PM to 7 AM, classes from 9 AM to 3 PM) prevent unrealistic buffer assumptions.
   - Real-time daily **Demand vs Capacity Balance** monitor flags overloaded and filling-up days.

4. **Real Remaining Effort & Estimate Calibration**:
   - Subtracts logged stopwatch time from estimated workload to dynamically calculate remaining effort for ranking.
   - Per-category calibration computes actual-to-estimated ratio from completed assignments once at least 3 samples exist.
   - Non-intrusive estimate suggestion banners propose realistic adjustments with transparent reasoning ("Labs usually take about 1.4x your estimate. Use 3.5h?").
   - Never overrides user estimates silently.

5. **7-Day Workload Forecast & "What if I delay this?" Simulator**:
   - Visual 7-day strip tracking daily load vs capacity with clear / filling up / overloaded status.
   - Click-through reveals the specific assignments driving the workload for any day.
   - Interactive deferral simulation recalculates weekly capacity live and explains the exact consequence in a single clear sentence.
   - Warns students immediately if postponing a task would push it past its deadline or cause late penalties.

6. **Start Now Low-Barrier Kickoff Flow**:
   - Primary "Start Now" action on the top recommended assignment removes activation energy and decision paralysis.
   - Generates category-specific 10-minute micro-steps (e.g. outlining key questions, verifying code compiles, skimming chapter headings).
   - Seamlessly associates and launches the stopwatch chrono linked directly to the task.

7. **Tactical Capacity-Driven Triage Mode**:
   - One-click recovery protocol activated whenever demand outstrips available capacity or emergency deficits occur.
   - Intelligently partitions coursework into three strategic buckets:
     1. **Do Fully**: High-stakes deliverables (Exams, Projects, Urgent High-Priority items) requiring full focus and hours.
     2. **Do the Minimum (MVP)**: Moderate-weight homework and lab work targeted for 75–80% partial credit with 50% effort reduction.
     3. **Safe to Defer or Skip**: Low-priority readings and non-urgent items scheduled for 0h today to immediately free study hours without penalty.
   - Displays transparent hours saved and net deficit reduction.
   - **Explicit Non-Prediction Notice**: Communicates transparently that suggestions are computed strictly from student inputs (estimates, priorities, deadlines, and working hours), not algorithmic black-box grade predictions.

8. **Recovery, Not Shame & "Reset My Week"**:
   - **Guilt-Free Copy Architecture**: All shaming language, streaks, alarms, and penalty warnings eliminated in favor of supportive, action-oriented guidance.
   - **Overdue Recovery Actions**: Rather than displaying punitive alerts, overdue assignments offer concrete next steps:
     - *Submit Partial Work*: Secure baseline partial credit and close open loops.
     - *Email Instructor Outreach*: Built-in modal with pre-composed, polite student email templates (24–48h Extension Request, Partial Submission check-in, Office Hours request) featuring one-click clipboard copying and direct `mailto:` integration.
   - **Reset My Week Clean-Slate Protocol**:
     - Provides a one-click reset for students overwhelmed by backlogged deadlines.
     - Offers 3 strategies: *Realistic Reschedule* (distributes overdue tasks forward into upcoming open capacity windows), *Submit Partial Work*, and *Clean Slate / Drop* (forgives backlog so student can focus 100% on upcoming deliverables).
     - Full interactive preview displaying before-and-after schedule and capacity impact before confirmation.

9. **Paste-to-Import with Fallback Engine (Offline Rule-Based + Serverless Gemini AI)**:
   - Paste raw syllabus excerpts, Canvas announcements, professor emails, or study group chat messages into an intake console.
   - **Offline Rule-Based Parser (100% Private, Zero Setup)**:
     - Runs locally in the browser with no backend or external network connection required.
     - High-precision regex pattern matching for course codes (`CS 350`, `MATH 101`, `ECON 201`), dates (`Oct 28`, `Friday 11:59pm`, `10/30`, `tomorrow at 5pm`), categories (`assignment`, `lab`, `quiz`, `project`, `exam`, `reading`), and effort keywords (`~4h`, `2.5 hours`).
     - **Ambiguity Detection**: Explicitly flags ambiguous dates (e.g. only a weekday mentioned, missing cutoff times, or unstated years) for student review rather than silently guessing.
   - **Hardened Serverless Gemini AI Parser (`api/parse-tasks.ts` & `api/_lib/guard.ts`)**:
     - Hosted on Vercel as a secure, hardened serverless function using Google Gemini 2.5 Flash for natural language parsing of complex, conversational text.
     - **Strict Input Limits**: Enforces a strict 6,000-character payload ceiling, returning clear 400 responses for oversized requests.
     - **Same-Origin Enforcement**: Rejects cross-origin access (no wildcard CORS) to prevent unauthorized API reuse.
     - **Per-IP Rate Limiting & Daily Usage Cap**: In-memory token-bucket limiter throttles abuse, supported by configurable global daily caps (`GLOBAL_DAILY_LIMIT`) to protect budgets.
     - **Secure Header Authentication**: Passes credentials exclusively via the `x-goog-api-key` HTTP header (never in URL query strings) and redacts keys and raw prompts from logs.
     - **Prompt Injection Hardening**: Delimits untrusted input inside `<untrusted_student_input>` tags with explicit model instructions to ignore embedded commands.
     - **Server-Side Schema Validation**: Validates all model JSON on the server against strict types, ranges (0.25h to 40h), and allowed enums before returning data to the client.
     - **Seamless Fallback**: If the serverless endpoint is offline, rate-limited, or no API key is set, the app instantly falls back to the rule-based engine with zero interruption.
   - **Editable Review Table**:
     - Clean tabular review interface before items hit the priority radar.
     - Edit titles, course codes, deadlines, categories, and estimated hours inline.
     - Highlighted ambiguity banners alert students to verify cutoff times.
     - Checkbox selection allows students to deselect false positives or irrelevant lines with one click.

10. **Conversational Grounded Schedule Assistant ("Rescue" Assistant v2)**:
   - Conversational schedule triage thread accessible via the **"Ask"** button in the header (accessible modal on desktop, smooth slide-up sheet on mobile).
   - Designed strictly for academic triage: answers questions grounded in the student's real deadlines, priorities, and study hours with full multi-turn conversational history.
   - **Function Calling Architecture**: Uses Gemini function declarations (`explain_task`, `propose_add_task`, `propose_set_capacity`, `propose_drop_task`, `propose_move_task`) rather than rigid intent JSON. A tool call only creates a proposal; the client validates it with local deterministic math and presents interactive confirmation cards.
   - **Configurable Models & Honest Diagnostics**:
     - Configurable via `GEMINI_MODEL` (defaults to `gemini-3.5-flash-lite`) with automatic retry on `GEMINI_FALLBACK_MODEL` (defaults to `gemini-3.8-flash`).
     - Sets thinking to `low` (`thinkingConfig: { thinkingLevel: 'low' }`) and temperature to `0.4`.
     - Provides clear source badges in the UI: `✦ AI` or `Offline mode (limited)`, with honest diagnostic tooltips (`no_key`, `model_unavailable`, `rate_limited`, or `error`).
   - **Conversational Memory & Pronoun Resolution**: Supports natural follow-up questions (e.g. asking *"Can I delay it by 1 day?"* or *"What if I skip it?"* automatically resolves pronouns like `"it"`, `"that one"`, or `"this task"` to the most recently discussed assignment).
   - **Fuzzy Coursework & Course Code Matching**: Matches queries by course codes (`CS 350`, `cs350`, `DBMS`, `ECON 201`) and partial title keywords with automatic candidate scoring.
   - **Ambiguity Clarification**: If a task reference is ambiguous or matches multiple items (e.g. *"the lab"* when two labs exist), the assistant presents clickable option chips instead of silently guessing.
   - **Fast Local Small-Talk & Grounded Greetings**: Intercepts greetings (`"hello"`, `"hey"`), thanks, and help queries instantly without network latency, welcoming students with real data about their top task and today's schedule.
   - **Distress & Overwhelm Empathy**: Kind, non-lecture response to overwhelmed students, breaking panic into a single concrete 10-minute starter micro-step.
   - **Privacy First**: To answer, task titles and dates are sent to the secure Gemini API endpoint when online. Data is processed in-memory for the active session only and never stored remotely. Offline fallback runs 100% in-browser with zero remote requests.

11. **Local Welcome Greeting Banner**:
   - Dismissible card rendered at the top of the main dashboard, evaluated 100% locally with zero API calls.
   - **First Visit Ever**: Shows a warm welcome intro with quick action chips (*"Paste my deadlines"*, *"Add a task"*, *"Show me around"*).
   - **Returning Daily Visit**: Greets the student by time of day (*"Good morning!"*, *"Good afternoon!"*), displays a concrete schedule update from real facts (e.g. upcoming deadlines, overdue alerts, or today's study capacity balance), and provides actionable chips (*"Start <top task>"*, *"Plan my week"*, *"I'm swamped"*).
   - **Same-Day Dismissal Memory**: Once dismissed, remembers dismissal for the rest of the day in localStorage and softly animates out. Respects `prefers-reduced-motion`.

11. **Task Management & Form Validation**:
   - Add and edit assignments with title, course code (e.g., `CS 350`), category (assignment, lab, exam, quiz, etc.), due date & time, estimated effort (hours), priority, and notes.
   - Real-time form validation with inline feedback.
   - Fast presets for college students (`Tonight 11:59 PM`, `Tomorrow 11:59 PM`, `In 2 Days`, `+0.5h`, `+1h`, `+2h`, etc.).

11. **Task Cards with Urgency Indicators**:
   - Dynamic urgency badges: `OVERDUE`, `TIME DEFICIT`, `CRITICAL (<12H)`, `DUE TODAY (<24H)`, `UPCOMING (<3 DAYS)`, `ON RADAR`.
   - Relative countdown time (`Due in 6h 30m`) and formatted calendar timestamps.
   - Safety buffer pill (`2.5h buffer` or `⚠️ 1.5h Deficit!`).
   - One-click completion with congratulatory confetti animation.
   - Edit and delete actions with confirmation dialog.

12. **Sorting & Filtering**:
   - Search across task titles, course codes, and notes.
   - Filter by status (`All`, `Pending`, `Due Today`, `Overdue`, `Completed`) and Course code.
   - Sort by Smart Rescue Priority, Deadline (Soonest first), Priority level, or Effort.

13. **Accessible Product Tour (Tour Mode)**:
   - 5-step focused walkthrough highlighting: *Add or paste deadlines*, *The "Now" card*, *7-day workload forecast*, *Ask in plain language*, and the *Tools & study capacity* menu.
   - **In-Memory Demo Dataset**: Runs on an ephemeral preview dataset that is never written to `localStorage`. Exiting the tour immediately restores the student's real task state with zero data mutation.
   - Accessible keyboard controls (Escape to close, Arrow keys to navigate, focus trap) with graceful off-screen element handling.
   - Persistent `tour seen` flag ensures new students are invited once without nagging returning users.

14. **Persistence & Storage Architecture**:
   - Persisted seamlessly via `localStorage` with versioned schema migrations (`v1` to `v2`).
   - Clean empty state on first launch with on-demand demo data loading via the **"..."** menu.

---

## 🔑 Configuring Serverless Gemini AI (Optional)

By default, Deadline Rescue operates **100% offline with zero configuration** using its built-in rule-based parsing engine.

If you deploy to **Vercel** and wish to enable LLM-assisted parsing for conversational text:
1. Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).
2. In your Vercel project dashboard, navigate to **Settings > Environment Variables**.
3. Add:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. For local testing with the Vercel CLI:
   ```bash
   vercel env pull .env.local
   vercel dev
   ```

> **Privacy & Fallback Invariant**: The API key is strictly server-side (`process.env.GEMINI_API_KEY`) and is never exposed in client bundles. If the key is unset or network requests fail, the client seamlessly falls back to local rule-based parsing.

---

## 🛠 Tech Stack

- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS** (Premium dark palette, accessible contrast, custom scrollbars)
- **Lucide React** (Icons)
- **Canvas Confetti** (Micro-delight for completed milestones)

