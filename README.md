# SmartRail 🚆
> **"SmartRail doesn't just tell you the next train. It helps you decide which train to take."**

SmartRail is an MVP web application designed for Mumbai local train commuters. While commuters often know when the next train arrives, they lack visibility into how crowded upcoming trains are likely to be. SmartRail calculates realistic crowd percentages from key operational factors (peak hours, direction flow, train origin, train type, platform headway) and recommends the best train based on your personal travel preference.

---

## ✨ Features

- **Route Selection**: Choose source and destination stations across major Western and Central Line stations (Churchgate, Dadar, Bandra, Andheri, Borivali, CSMT, Kurla, Thane, Kalyan).
- **Auto Direction Detection**: Automatically detects direction (Northbound / Southbound) and applies direction-specific peak hour flow multipliers.
- **Travel Preference Control**:
  - **Fastest**: Prioritizes shortest waiting time to board as quickly as possible.
  - **Balanced**: Gives balanced weight to both waiting time and crowd comfort (Default).
  - **Least Crowded**: Prioritizes minimum crowd percentage for maximum travel comfort.
- **Factor-Based Crowd Density Model**:
  - **Peak vs Off-Peak Time & Direction**: Models morning southbound flow (7:30–10:30 AM) and evening northbound flow (4:30–8:30 PM).
  - **Simulated Historical Station Baseline**: Accounts for major interchange station volume (Dadar, Andheri, Borivali, CSMT, Kurla, Thane).
  - **Train Type**: Fast trains reflect concentrated long-distance commuter load (+18% density).
  - **Station Origin Discount**: Trains originating at the user's station start empty (-35% crowd reduction).
  - **Headway / Time Gap**: Platform crowd accumulation scales with headway since the previous train.
- **Preference-Weighted Recommendation Scoring**: Calculates an objective score based on selected preference weights.
- **"Why this train?" Explanation**: Displays the main factors behind the recommendation aligned with the chosen travel preference.

---

##  How to Run locally

### Option 1: Built-in PowerShell Server (Recommended for Windows)

Run the included PowerShell script in your terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```

Then open your browser and navigate to:
```
http://localhost:8080
```

### Option 2: Direct File Open or Python HTTP Server

If you prefer Python or double-clicking `index.html`:

**Python 3:**
```bash
python -m http.server 8080
```

**Or simply open `index.html` directly in any web browser.**

---

## 💡 Crowd Calculation & Scoring Formula

### 1. Factor-Based Crowd Density Percentage:
$$\text{Crowd\%} = \text{Base (42\%)} \times \text{TimeDirectionFactor} \times \text{StationBaseline} \times \text{TrainTypeFactor} \times \text{OriginFactor} \times \text{HeadwayFactor}$$

### 2. Preference-Weighted Scoring Function:
$$\text{Score} = W_{\text{crowd}} \times \left(\frac{\text{Crowd\%}}{10}\right)^{1.8} + W_{\text{wait}} \times \text{WaitTimeMinutes}$$

- **Fastest**: $W_{\text{wait}} = 6.0$, $W_{\text{crowd}} = 0.5$
- **Balanced**: $W_{\text{wait}} = 2.0$, $W_{\text{crowd}} = 2.2$
- **Least Crowded**: $W_{\text{wait}} = 0.4$, $W_{\text{crowd}} = 6.0$

The train with the **lowest overall score** for the active preference is highlighted as the recommended choice.

---

## 📂 Project Structure

```
SmartRail/
├── index.html     # Semantic HTML5 layout and form inputs with preference control
├── styles.css     # Responsive CSS design system with segmented controls & badges
├── app.js         # Preference-weighted scoring, crowd engine & dynamic UI rendering
├── server.ps1     # Native PowerShell HTTP server
└── README.md      # Setup and project documentation
```
SmartRail
