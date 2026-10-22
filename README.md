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

1. **Executive Dashboard**:
   - Total active vs completed tasks.
   - Completion rate progress bar.
   - Imminent deadlines (<24h and <48h counters).
   - Emergency Rescue Alerts (overdue count and estimated time deficit warnings).

2. **Continuous Risk Prioritization Engine**:
   - Continuous rule-based risk formulation: $\text{risk} = \frac{\text{remaining effort}}{\text{available hours}}$.
   - Guarantees that closer deadlines, higher priority, greater effort, or tighter buffers never lower score.
   - Tasks in time deficit mathematically never rank below non-deficit tasks of equal or lower priority.
   - Smooth, non-punitive continuous overdue handling (no arbitrary tier jumps or magic score offsets).
   - Live 30-second interval ticker refreshes countdowns, buffers, and urgency badges in real time.
   - Safe local storage schema versioning and seamless migration (`v1` to `v2`).
   - Clear explainable rationale in supportive, non-scolding language.

3. **Student Capacity & Working Hours Buffer**:
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

9. **Task Management & Form Validation**:
   - Add and edit assignments with title, course code (e.g., `CS 350`), category (assignment, lab, exam, quiz, etc.), due date & time, estimated effort (hours), priority, and notes.
   - Real-time form validation with inline feedback.
   - Fast presets for college students (`Tonight 11:59 PM`, `Tomorrow 11:59 PM`, `In 2 Days`, `+0.5h`, `+1h`, `+2h`, etc.).

10. **Task Cards with Urgency Indicators**:
   - Dynamic urgency badges: `OVERDUE`, `TIME DEFICIT`, `CRITICAL (<12H)`, `DUE TODAY (<24H)`, `UPCOMING (<3 DAYS)`, `ON RADAR`.
   - Relative countdown time (`Due in 6h 30m`) and formatted calendar timestamps.
   - Safety buffer pill (`2.5h buffer` or `⚠️ 1.5h Deficit!`).
   - One-click completion with congratulatory confetti animation.
   - Edit and delete actions with confirmation dialog.

11. **Sorting & Filtering**:
   - Search across task titles, course codes, and notes.
   - Filter by status (`All`, `Pending`, `Due Today`, `Overdue`, `Completed`) and Course code.
   - Sort by Smart Rescue Priority, Deadline (Soonest first), Priority level, or Effort.

12. **Persistence & Sample Data**:
   - Persisted seamlessly via `localStorage` across page refreshes.
   - Loaded with realistic college coursework upon first visit.
   - "Reset Samples" button for instant testing.

---

## 🛠 Tech Stack

- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS** (Premium dark palette, accessible contrast, custom scrollbars)
- **Lucide React** (Icons)
- **Canvas Confetti** (Micro-delight for completed milestones)

