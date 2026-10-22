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

3. **Task Management & Form Validation**:
   - Add and edit assignments with title, course code (e.g., `CS 350`), category (assignment, lab, exam, quiz, etc.), due date & time, estimated effort (hours), priority, and notes.
   - Real-time form validation with inline feedback.
   - Fast presets for college students (`Tonight 11:59 PM`, `Tomorrow 11:59 PM`, `In 2 Days`, `+0.5h`, `+1h`, `+2h`, etc.).

4. **Task Cards with Urgency Indicators**:
   - Dynamic urgency badges: `OVERDUE`, `TIME DEFICIT`, `CRITICAL (<12H)`, `DUE TODAY (<24H)`, `UPCOMING (<3 DAYS)`, `ON RADAR`.
   - Relative countdown time (`Due in 6h 30m`) and formatted calendar timestamps.
   - Safety buffer pill (`2.5h buffer` or `⚠️ 1.5h Deficit!`).
   - One-click completion with congratulatory confetti animation.
   - Edit and delete actions with confirmation dialog.

5. **Sorting & Filtering**:
   - Search across task titles, course codes, and notes.
   - Filter by status (`All`, `Pending`, `Due Today`, `Overdue`, `Completed`) and Course code.
   - Sort by Smart Rescue Priority, Deadline (Soonest first), Priority level, or Effort.

6. **Persistence & Sample Data**:
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

