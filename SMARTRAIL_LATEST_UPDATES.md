# SmartRail 🚆 — Latest Project Documentation & Update Log

> **"SmartRail doesn't just tell you the next train. It helps you decide which train to take."**  
> *Latest Build: September 2026 • Stack: Native Node.js + SQLite (`node:sqlite`) + Vanilla ES6/CSS3*

---

## 🌟 1. Executive Summary & Overview

SmartRail is an interactive commute assistant designed for Mumbai's suburban railway network (Western and Central Lines). 

While conventional transit applications merely list scheduled train timings, **SmartRail estimates crowd density percentages** using a multi-factor operational algorithm and recommends the best train tailored to the commuter's travel priority (*Fastest*, *Balanced*, or *Comfort / Least Crowded*).

This latest release introduces a **classy, minimal aesthetic** inspired by Mumbai's iconic coastline and architecture, **real-time commuter chat with presence detection**, **interactive recommendation decision tracking**, and a **built-in zero-dependency SQLite database** (`smartrail.db`).

---

## 🎨 2. Classy Minimal Mumbai Aesthetic

| Element | Design Decision & Implementation |
|---|---|
| **Canvas & Atmosphere** | Heritage ivory & warm sandstone tones (`#faf9f6` to `#f5f2eb`) providing a clean, bright, and distraction-free white palette. |
| **Vector Skyline Backdrop** | Subtle architectural SVG layer at the base depicting the **Bandra-Worli Sea Link** cable-stayed bridge and the **Victorian Gothic Mumbai skyline** with soft ambient golden-hour lighting. |
| **Accents & Materials** | Deep heritage navy (`#0f172a`), warm brass/amber accents (`#b45309`), and glassmorphism card elevation with soft 1px borders (`rgba(15, 23, 42, 0.08)`). |
| **Typography** | Refined geometric sans (`Plus Jakarta Sans`) paired with serif quote styling (`Playfair Display`). |

---

## ⚡ 3. Interactive Core Features

### 1. Interactive Recommendation Action
- When the optimal train is calculated, an interactive action button is rendered:  
  `[ ✓ I'm Taking This Train (Record in Database) ]`
- **Instant Micro-Interactions**:
  - Button state transitions to `✓ Recorded in SQLite Database!` with checkmark animation.
  - Live click counter dynamically increments in the top header and in the database metrics modal.
  - Automatically posts an informational alert into the live commuter chat feed.

### 2. Live Mumbai Commuter Chat Drawer
- **Floating Widget**: Tastefully docked in the bottom-right corner (`🟢 Mumbai Commuter Chat • N Online`).
- **Presence Tracking**: Automatically monitors active users within a 5-minute sliding window via an asynchronous heartbeat loop.
- **Commuter Identity**: Assigns friendly Mumbai monikers (e.g., `BandraRider_77`, `MarineDriveCommuter_12`) with the ability to rename directly in the interface.
- **Station Tagging & Quick Alerts**: Supports station-specific updates with quick-report action chips (`⚡ On Time`, `🚶 Moderate Crowd`, `⚠️ Heavy Rush`, `🚆 Originated Empty`).

### 3. Live Database Analytics Dashboard Modal
- Accessible via the **"Database Analytics"** button in the header bar.
- **Live KPI Metric Cards**:
  - Total Recommendation Clicks recorded in database.
  - Active Commuters currently online in chat.
  - Total station updates logged.
  - Database engine synchronization status (`smartrail.db`).
- **Tabbed Query Views**:
  1. *Recent Recommendation Clicks*: Detailed log with Commuter, Train Time, Type (Fast/Slow), Route, Crowd %, Preference, and Timestamp.
  2. *Active Chat Commuters*: Real-time list of online users with station affiliations.
  3. *Raw Database JSON*: Direct snapshot with a one-click **"Download Full DB JSON"** export button.

---

## 💾 4. Database Architecture & Storage

All application data is persistently saved to disk in a local SQLite 3 database file:

📍 **Database File Location:**  
[`c:\Users\Atharva\OneDrive\Desktop\Projects\BuildSprint\smartrail.db`](file:///c:/Users/Atharva/OneDrive/Desktop/Projects/BuildSprint/smartrail.db)

### Database Engine
* **Engine:** Built-in Node.js SQLite (`node:sqlite`).
* **Zero External Dependencies:** No need for `npm install sqlite3` or third-party native compilation.

### Database Schema

```sql
-- 1. Tracked Recommendation Clicks
CREATE TABLE IF NOT EXISTS recommendation_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT DEFAULT 'Commuter',
    train_time TEXT NOT NULL,
    train_type TEXT NOT NULL,
    route TEXT NOT NULL,
    crowd_pct INTEGER NOT NULL,
    preference TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Live Chat Users & Presence Heartbeat
CREATE TABLE IF NOT EXISTS chat_users (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    station TEXT DEFAULT 'General',
    last_active INTEGER NOT NULL
);

-- 3. Live Commuter Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    station_tag TEXT DEFAULT 'General',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🌐 5. REST API Endpoints

The built-in Node.js server exposes clean REST endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats` | Returns aggregate counts (total clicks, active users, messages, recent clicks, preference breakdown). |
| `POST` | `/api/recommendations/click` | Records a user clicking on a recommended train into SQLite. |
| `GET` | `/api/chat/messages` | Retrieves recent chat messages (limit queryable) and the active user list. |
| `POST` | `/api/chat/messages` | Posts a new station message and updates user's `last_active` timestamp. |
| `POST` | `/api/chat/heartbeat` | Updates user presence to maintain accurate online count. |
| `GET` | `/api/database/export` | Returns a full JSON dump of all tables for transparency and export. |

---

## 🧮 6. Crowd Modeling & Scoring Formula

### Factor-Based Crowd Density Model:
$$\text{Crowd\%} = \text{Base (42\%)} \times \text{TimeDirectionFactor} \times \text{StationBaseline} \times \text{TrainTypeFactor} \times \text{OriginFactor} \times \text{HeadwayFactor}$$

- **Time & Direction Factor**:
  - Morning Peak (7:30 AM – 10:30 AM): Southbound flow = $1.65\times$, Northbound = $0.75\times$.
  - Evening Peak (4:30 PM – 8:30 PM): Northbound flow = $1.70\times$, Southbound = $0.80\times$.
  - Off-Peak: $0.55\times$ to $1.05\times$.
- **Station Baseline**: High-volume interchanges (Dadar, Andheri, Borivali, CSMT, Kurla, Thane) apply $1.25\times$ to $1.40\times$.
- **Train Type Factor**: Fast trains concentrate long-distance commuters ($+18\%$), Slow trains distribute load evenly ($-5\%$).
- **Origin Discount**: Originating trains start completely empty ($-35\%$ crowd density).
- **Headway / Gap**: Platform crowd accumulation increases with time elapsed since the previous train.

### Objective Preference Scoring Function:
$$\text{Score} = W_{\text{crowd}} \times \left(\frac{\text{Crowd\%}}{10}\right)^{1.8} + W_{\text{wait}} \times \text{WaitTimeMinutes}$$

- **Fastest Priority**: $W_{\text{wait}} = 6.0$, $W_{\text{crowd}} = 0.5$ (Minimizes waiting time).
- **Balanced Priority (Default)**: $W_{\text{wait}} = 2.0$, $W_{\text{crowd}} = 2.2$ (Optimal crowd vs. wait trade-off).
- **Comfort Priority**: $W_{\text{wait}} = 0.4$, $W_{\text{crowd}} = 6.0$ (Strictly minimizes crowd density).

---

## 🚀 7. How to Run Locally

### Start Server
```bash
node server.js
```
*or*
```bash
npm start
```

### Access Application
Open any web browser and go to:
```
http://localhost:8080
```

---

## 📂 8. Repository Structure

```
SmartRail/
├── index.html                  # Semantic layout with Mumbai vector backdrop & modal UI
├── styles.css                  # Classy ivory/gold design system & chat drawer CSS
├── app.js                      # Crowd engine, chat controller, SQLite API sync
├── server.js                   # Node.js server with built-in node:sqlite REST APIs
├── smartrail.db                # SQLite 3 persistent database file
├── SMARTRAIL_LATEST_UPDATES.md # Comprehensive documentation & update log
├── package.json                # Project metadata & start script
└── README.md                   # Quickstart guide
```

---

*SmartRail — Engineered for Mumbai Local Commuters.*
