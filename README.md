# MIT Hostel Allotment System

I built this specifically to tackle the problem MIT (Manipal Institute of Technology) currently faces every year: a highly stressful, vague, and often opaque hostel allocation process. The goal was to build a system that can handle our complex institutional logic—like CGPA sorting, year-based tiebreakers, and keeping friend groups together, without it turning into a manual spreadsheet nightmare or a random lottery.

The stack is **Next.js (App Router)**, **React**, **PostgreSQL (Neon)**, and **Prisma ORM**.

## 🌐 Live Demo

**[https://hostel-allotment-system-eight.vercel.app/](https://hostel-allotment-system-eight.vercel.app/)**

| Portal | URL |
|--------|-----|
| 🏠 Home | [/](https://hostel-allotment-system-eight.vercel.app/) |
| 🛡️ Admin Portal | [/admin](https://hostel-allotment-system-eight.vercel.app/admin) |
| 🎓 Student Portal | [/student](https://hostel-allotment-system-eight.vercel.app/student) |

> Hosted on **Vercel** · Database on **Neon (PostgreSQL)**

---

## 🚀 Getting Started — Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- A [Neon](https://neon.tech) account (free tier is enough) **or** any PostgreSQL instance
- `git` installed

### 1. Clone the repository
```bash
git clone https://github.com/aryanDevpura/hostel-allotment-system.git
cd hostel-allotment-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up your environment file
Create a `.env` file in the root directory (you can copy `.env.example`):
```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://<user>:<password>@<host>/<dbname>?sslmode=require"

# Admin portal auth
ADMIN_PASSWORD_HASH="\$2b\$12\$..."  # Escaped bcrypt hash for admin password
ADMIN_SESSION_TOKEN="<random-64-character-hex-string>"

# JWT Secret for student auth
JWT_SECRET="<your-strong-random-jwt-secret>"
```
> If using Neon: run `neon deploy` to automatically link and pull connection credentials, or copy the connection string directly from your Neon project dashboard.

### 4. Push the database schema & seed initial blocks
This creates all tables, enums, constraints in your database, and seeds the 11 residential blocks (2,640 rooms):
```bash
npx prisma db push
npm run db:seed
```

### 5. Start the development server
```bash
npm run dev
```

The app will be live at **[http://localhost:3000](http://localhost:3000)**.

### 6. First steps after launch
1. Go to **`/admin/upload`** and upload a student CSV file to create a new allotment session. Use `sample_data.csv` in the repo root to test.
2. Go to **`/admin/allotment`** to configure algorithm rules and run the allotment engine.
3. Students can register and form groups at **`/student`**.

---

## 🏗️ Architecture & Assumptions

- **The Setup:** Next.js API routes handle the heavy lifting for the algorithm, while the frontend gives admins an interactive dashboard to run everything.
- **Database:** It's fully relational (`Students` → `StudentGroups` → `Allotments` → `Rooms` → `Blocks`). Instead of constantly wiping the DB to test things, occupancy is calculated dynamically per session. This means you can run multiple separate allotment scenarios (sessions) at the same time and compare them.
- **The Assumptions:** Because MIT doesn't have an open API for exact room layouts, this system uses an assumed seed data map. We generated realistic mock data: specific Block numbers (e.g., Block 14, Block 22), assuming ~8 floors per block, 30 rooms per floor, with varying room types (Single, Double, Quad, etc.) mapped to specific genders.

---

## ⚙️ The Engine & Algorithm Nuances

The actual algorithm (`lib/allotment-engine.js`) runs entirely in memory. It crunches the numbers fast and only writes to the database at the very end via a batched Prisma `$transaction` (so if something fails on room 499 of 500, it rolls back cleanly instead of breaking the database).

It handles some very specific, deeply nested logic:

**1. The Sorting Logic (Groups & Tiebreakers)**
When students apply together as a pair or a triple, their academic weight is the **Average CGPA** of the group (Descending).
If there's a tie (e.g. two groups both average an 8.5), it looks strictly at the *Year of Study*. A 2nd-year student gets priority over a 3rd-year (`Year 2 > Year 3 > Year 4`). For mixed groups (e.g., a 2nd year and a 4th year rooming together), we look at the youngest year, so that pair automatically gets the powerful 2nd-year priority.

**2. Group Integrity & Room Packing**
Students can apply alone, in pairs, or in triples via the CSV upload (mapped via a shared `group_id`).
- **Rule 1 (The Golden Rule):** A group is *never* split into different rooms. If a pair wants a Double room but only one bed is left in that block, the engine skips it. It will never separate them.
- **Rule 2 (Density check):** The engine hates empty space. It explicitly looks for partially filled rooms before placing people in empty ones. If there's an empty bed in an already opening Double room, an unassigned solo student goes there before we open a brand-new Double room.

**3. Modes of Operation (Round 1)**
When triggering Round 1, the admin can choose how aggressive the algorithm should be:
- **Classic (Strict Preferences):** Checks Pref 1, then Pref 2. If both are full, the group goes straight to the waitlist.
- **Smart Vacancy Fill:** If preferences are full, instead of waitlisting, the engine searches the whole campus for an open slot that fits the group's gender and size. It tries the most historically popular/premium blocks first (Block 14, 15, 22 for boys; Block 22, 13 for girls) before moving to less preferred blocks.

**4. Algorithm Rules (Admin-Configurable)**
Admins can optionally enable two constraint rules before running Round 1 (`/admin/allotment` → *Algorithm Rules* card):

- **Hard Block CGPA Cutoffs:** Set a minimum CGPA threshold per hostel block. If *any* member of a group is below the cutoff for a block, the entire group is denied that block (even if it's their preference). During Smart Vacancy Fill, the engine first tries to place groups in cutoff-compliant blocks. If no compliant vacancy exists, it falls back to ignoring cutoffs — hostels will never be left intentionally empty.

- **Max CGPA Gap in Groups (Portal Groups Only):** Set a maximum allowed CGPA difference between members of a manually-formed portal group. When a student tries to join a group via invite code, their CGPA is checked against all existing members. If the spread exceeds the limit, the join is rejected with a clear error. This rule does not apply to CSV-imported groups (those are pre-formed).

---

## 🔒 Verification & Round 2

We don't just run the algorithm blind. The session state moves cleanly: `DRAFT` → `ROUND1_DONE` → `ROUND1_LOCKED` → `ROUND2_DONE`.

**The Manual Override (Disallowing)**
After Round 1 finishes, admins get a searchable, filterable dashboard of everybody who got a room. If an admin spots an issue, they can hit `Disallow` on a group.
- **What it does:** It kicks that specific group out of the process permanently and frees their beds.
- **The nuance:** Because occupancy is dynamic, if you kick out a duo from a Quad room, the other two random students who were assigned the remaining two beds are totally unaffected. The two newly freed beds just become available when you run Round 2.

**Round 2**
Once the admin locks Round 1, Round 2 runs. Waitlisted students retry their preferences (in case beds opened up from admin disallowals) and then go through the Smart Vacancy fill to grab whatever is left. Students still unplaced after Round 2 are marked `OFF_CAMPUS`.

---

## 👨‍🎓 Student Portal

Students have their own self-service portal at `/student`:

- **Registration & Login:** Portal students register with their reg number and CGPA, secured with a JWT-based auth system.
- **Group Formation:** Students can create a group (generates a unique invite code) or join an existing group using a code shared by a friend. Groups can have up to 3 members. The system enforces gender-matching, and optionally the admin-set CGPA gap limit.
- **Preference Submission:** The group leader selects two block+room-type preference pairs. Once submitted, the group is locked and fed into the allotment engine alongside CSV-uploaded groups.
- **Portal Status:** The admin controls whether the student portal is `OPEN`, `CLOSED`, or `LOCKED`.

---

## 📁 CSV Handling

Everything starts with importing data. The client uses `PapaParse` to chew through the uploaded CSVs. It runs strict validation before anything hits the database — ensuring CGPAs are numbers, years are valid, and groups aren't doing impossible things (like three people applying for a single room). It also generates custom CSV reports (Master List, Round 1 results, Block-specific reports) at the end.

**Expected CSV format:**

| Column | Description |
|---|---|
| `reg_no` | Student registration number |
| `name` | Full name |
| `gender` | `MALE` or `FEMALE` |
| `year` | Year of study (1–4) |
| `department` | Department code or name |
| `cgpa` | CGPA (0.0–10.0) |
| `group_id` | (Optional) Shared group identifier for pre-formed groups |
| `pref1_block`, `pref1_room_type` | First preference |
| `pref2_block`, `pref2_room_type` | Second preference |

---

## 🗄️ Database Schema Overview

| Table | Description |
|---|---|
| `allotment_sessions` | Top-level container for each year's allotment run. Holds status, algo mode, and the new algorithm rule settings. |
| `students` | All students, both CSV-uploaded and portal-registered. |
| `student_groups` | Pre-processed groups fed into the engine. |
| `group_members` | Maps students to their `student_groups`. |
| `portal_groups` | Groups formed by students via the portal. |
| `portal_group_members` | Members of portal groups. |
| `allotments` | The final allotment records (one per student per round). |
| `blocks` | Hostel block definitions (number, gender, floors). |
| `rooms` | Individual rooms inside blocks. |
| `room_types` | Room type definitions (Single, Double, Quad, etc.). |
| `block_room_configs` | How many rooms of each type exist per floor in a block. |
| `block_cutoffs` | Per-session, per-block CGPA cutoff values (new). |
| `allotment_audits` | Audit log of status changes (trigger-populated). |

---

## 🛠️ API Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/sessions` | List all allotment sessions |
| `DELETE` | `/api/sessions/[id]` | Delete a session |
| `PATCH` | `/api/sessions/[id]/portal` | Set portal status (OPEN/CLOSED/LOCKED) |
| `PATCH` | `/api/sessions/[id]/lock-round1` | Lock Round 1 and enable Round 2 |
| `DELETE` | `/api/sessions/[id]/reset` | Reset session allotments to DRAFT |
| `GET/PATCH` | `/api/sessions/[id]/settings` | Read/write algorithm rule settings (cutoffs, CGPA diff) |
| `GET` | `/api/sessions/[id]/r1-allotments` | Fetch Round 1 allotments for review |
| `POST` | `/api/allotment` | Run the allotment engine (Round 1 or 2) |
| `PATCH` | `/api/allotments/[id]/disallow` | Disallow a specific allotment |
| `POST` | `/api/upload` | Upload and process a student CSV |
| `GET` | `/api/blocks` | List all hostel blocks |
| `POST` | `/api/student/register` | Student self-registration |
| `POST` | `/api/student/login` | Student login → JWT |
| `GET` | `/api/student/dashboard` | Student dashboard data |
| `POST` | `/api/student/groups/create` | Create a new portal group |
| `POST` | `/api/student/groups/join` | Join a group by invite code |
| `POST` | `/api/student/groups/leave` | Leave a group |
| `PATCH` | `/api/student/groups/submit` | Lock group and submit preferences |
