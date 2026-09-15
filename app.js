/**
 * SmartRail - Mumbai Local Train Recommender MVP Logic
 * Enhanced algorithmic crowd model & preference-based recommendation engine
 */

// Station Data with lines, sequential index, and historical volume baseline
const STATIONS = [
    // Western Line (South -> North)
    { id: 'churchgate', name: 'Churchgate', line: 'Western', index: 1, baselineVolume: 1.25, isTerminus: true },
    { id: 'marine_lines', name: 'Marine Lines', line: 'Western', index: 2, baselineVolume: 0.85, isTerminus: false },
    { id: 'charni_road', name: 'Charni Road', line: 'Western', index: 3, baselineVolume: 0.90, isTerminus: false },
    { id: 'grant_road', name: 'Grant Road', line: 'Western', index: 4, baselineVolume: 0.95, isTerminus: false },
    { id: 'mumbai_central', name: 'Mumbai Central', line: 'Western', index: 5, baselineVolume: 1.10, isTerminus: false },
    { id: 'dadar_w', name: 'Dadar (Western)', line: 'Western', index: 6, baselineVolume: 1.35, isTerminus: false },
    { id: 'bandra', name: 'Bandra', line: 'Western', index: 7, baselineVolume: 1.20, isTerminus: false },
    { id: 'andheri', name: 'Andheri', line: 'Western', index: 8, baselineVolume: 1.30, isTerminus: false },
    { id: 'borivali', name: 'Borivali', line: 'Western', index: 9, baselineVolume: 1.25, isTerminus: true },

    // Central Line (South -> North)
    { id: 'csmt', name: 'CSMT', line: 'Central', index: 1, baselineVolume: 1.30, isTerminus: true },
    { id: 'dadar_c', name: 'Dadar (Central)', line: 'Central', index: 6, baselineVolume: 1.40, isTerminus: false },
    { id: 'kurla', name: 'Kurla', line: 'Central', index: 7, baselineVolume: 1.25, isTerminus: false },
    { id: 'thane', name: 'Thane', line: 'Central', index: 8, baselineVolume: 1.30, isTerminus: false },
    { id: 'kalyan', name: 'Kalyan', line: 'Central', index: 9, baselineVolume: 1.25, isTerminus: true }
];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    populateStationDropdowns();
    setDefaultTime();
    bindEvents();
}

function populateStationDropdowns() {
    const sourceSelect = document.getElementById('sourceStation');
    const destSelect = document.getElementById('destStation');

    sourceSelect.innerHTML = '<option value="" disabled selected>Select origin...</option>';
    destSelect.innerHTML = '<option value="" disabled selected>Select destination...</option>';

    const lines = ['Western', 'Central'];

    lines.forEach(line => {
        const lineStations = STATIONS.filter(s => s.line === line);
        
        const optGroupSource = document.createElement('optgroup');
        optGroupSource.label = `${line} Line`;
        
        const optGroupDest = document.createElement('optgroup');
        optGroupDest.label = `${line} Line`;

        lineStations.forEach(st => {
            const opt1 = new Option(st.name, st.id);
            const opt2 = new Option(st.name, st.id);
            optGroupSource.appendChild(opt1);
            optGroupDest.appendChild(opt2);
        });

        sourceSelect.appendChild(optGroupSource);
        destSelect.appendChild(optGroupDest);
    });

    sourceSelect.value = 'churchgate';
    destSelect.value = 'dadar_w';
    updateDirectionLabel();
}

function setDefaultTime() {
    const travelTimeInput = document.getElementById('travelTime');
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    // Default to 17:30 (5:30 PM peak) if current time is late night, otherwise actual time
    if (hours < 6 || hours > 22) {
        hours = 17;
        minutes = 30;
    }

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    travelTimeInput.value = `${formattedHours}:${formattedMinutes}`;
}

function getSelectedPreference() {
    const checkedRadio = document.querySelector('input[name="travelPreference"]:checked');
    return checkedRadio ? checkedRadio.value : 'balanced';
}

function bindEvents() {
    const form = document.getElementById('plannerForm');
    const sourceSelect = document.getElementById('sourceStation');
    const destSelect = document.getElementById('destStation');
    const swapBtn = document.getElementById('swapBtn');
    const chipButtons = document.querySelectorAll('.chip-time');

    sourceSelect.addEventListener('change', () => {
        autoSelectMatchingDestLine();
        updateDirectionLabel();
    });

    destSelect.addEventListener('change', () => {
        updateDirectionLabel();
    });

    swapBtn.addEventListener('click', () => {
        const temp = sourceSelect.value;
        sourceSelect.value = destSelect.value;
        destSelect.value = temp;
        updateDirectionLabel();
    });

    chipButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const timeVal = e.target.getAttribute('data-time');
            if (timeVal === 'now') {
                setDefaultTime();
            } else {
                document.getElementById('travelTime').value = timeVal;
            }
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleCalculateRecommendation();
    });
}

function autoSelectMatchingDestLine() {
    const sourceId = document.getElementById('sourceStation').value;
    const sourceObj = STATIONS.find(s => s.id === sourceId);
    const destSelect = document.getElementById('destStation');
    const destObj = STATIONS.find(s => s.id === destSelect.value);

    if (sourceObj && destObj && sourceObj.line !== destObj.line) {
        const sameLineDests = STATIONS.filter(s => s.line === sourceObj.line && s.id !== sourceId);
        if (sameLineDests.length > 0) {
            destSelect.value = sameLineDests[Math.min(2, sameLineDests.length - 1)].id;
        }
    }
}

function updateDirectionLabel() {
    const sourceId = document.getElementById('sourceStation').value;
    const destId = document.getElementById('destStation').value;
    const dirInput = document.getElementById('directionSelect');

    const sourceObj = STATIONS.find(s => s.id === sourceId);
    const destObj = STATIONS.find(s => s.id === destId);

    if (!sourceObj || !destObj) {
        dirInput.value = 'Auto-detected';
        return;
    }

    if (sourceObj.line !== destObj.line) {
        dirInput.value = `Interline (${sourceObj.line} → ${destObj.line})`;
        return;
    }

    if (destObj.index > sourceObj.index) {
        dirInput.value = 'Northbound (Down)';
    } else if (destObj.index < sourceObj.index) {
        dirInput.value = 'Southbound (Up)';
    } else {
        dirInput.value = 'Same Station';
    }
}

function handleCalculateRecommendation() {
    const sourceId = document.getElementById('sourceStation').value;
    const destId = document.getElementById('destStation').value;
    const timeStr = document.getElementById('travelTime').value;
    const preference = getSelectedPreference();

    const sourceObj = STATIONS.find(s => s.id === sourceId);
    const destObj = STATIONS.find(s => s.id === destId);

    if (!sourceObj || !destObj || sourceId === destId) {
        alert('Please select two different stations for source and destination.');
        return;
    }

    // Generate upcoming trains with factor-calculated crowd density
    const trains = generateFactorBasedTrains(sourceObj, destObj, timeStr);

    // Score & select best train using user preference
    const evaluated = evaluateAndRecommend(trains, sourceObj, destObj, preference);

    // Render results
    renderResults(sourceObj, destObj, timeStr, evaluated);
}

/**
 * Calculates time and peak directional flow factor.
 */
function getTimeAndDirectionFactor(hours, minutes, isNorthbound) {
    const totalMinutes = hours * 60 + minutes;

    // Morning Peak: 7:30 AM to 10:30 AM
    if (totalMinutes >= 450 && totalMinutes <= 630) {
        return !isNorthbound ? 1.65 : 0.75;
    }
    
    // Evening Peak: 4:30 PM to 8:30 PM
    if (totalMinutes >= 990 && totalMinutes <= 1230) {
        return isNorthbound ? 1.70 : 0.80;
    }

    // Shoulder period: 11 AM to 4:00 PM
    if (totalMinutes >= 660 && totalMinutes <= 960) {
        return 1.05;
    }

    return 0.55;
}

function getHeadwayFactor(timeGapMinutes) {
    const baselineGap = 4;
    return 1.0 + (timeGapMinutes - baselineGap) * 0.035;
}

function getOriginFactor(sourceId, isOriginatingAtSource, isTerminusOrigin) {
    if (isOriginatingAtSource) return 0.65;
    if (isTerminusOrigin) return 0.82;
    return 1.10;
}

function getTrainTypeFactor(isFast) {
    return isFast ? 1.18 : 0.95;
}

function generateFactorBasedTrains(source, dest, departureTimeStr) {
    const [reqHours, reqMins] = departureTimeStr.split(':').map(Number);
    const baseMinutesFromMidnight = reqHours * 60 + reqMins;

    const scheduleSpecs = [
        { waitMin: 2, gapMin: 3, forceOrigin: false },
        { waitMin: 9, gapMin: 7, forceOrigin: false },
        { waitMin: 18, gapMin: 9, forceOrigin: true },
        { waitMin: 28, gapMin: 10, forceOrigin: false }
    ];

    const isNorthbound = dest.index >= source.index;
    const timeDirFactor = getTimeAndDirectionFactor(reqHours, reqMins, isNorthbound);
    const stationBaseline = (source.baselineVolume + dest.baselineVolume) / 2;

    return scheduleSpecs.map((spec, idx) => {
        const trainTimeMins = baseMinutesFromMidnight + spec.waitMin;
        const depTimeStr = formatMinutesToTimeStr(trainTimeMins);

        const isFast = (idx % 2 === 0) && (Math.abs(dest.index - source.index) >= 3);
        const trainType = isFast ? 'FAST' : 'SLOW';

        let originName = source.line === 'Western' ? 'Churchgate' : 'CSMT';
        let isOriginatingAtSource = false;

        if (source.isTerminus) {
            originName = source.name;
            isOriginatingAtSource = true;
        } else if (spec.forceOrigin && idx === 2) {
            originName = `${source.name} (Originating)`;
            isOriginatingAtSource = true;
        }

        const isTerminusOrigin = (originName === 'Churchgate' || originName === 'CSMT');
        const typeFactor = getTrainTypeFactor(isFast);
        const originFactor = getOriginFactor(source.id, isOriginatingAtSource, isTerminusOrigin);
        const headwayFactor = getHeadwayFactor(spec.gapMin);

        const rawCrowdPct = 42 * timeDirFactor * stationBaseline * typeFactor * originFactor * headwayFactor;
        const crowdPct = Math.max(15, Math.min(98, Math.round(rawCrowdPct)));
        const categoryInfo = getCrowdCategory(crowdPct);

        const factors = {
            timeDir: { factor: timeDirFactor, desc: getTimeDirDesc(timeDirFactor, isNorthbound) },
            origin: { factor: originFactor, desc: getOriginDesc(isOriginatingAtSource, isTerminusOrigin, originName) },
            type: { factor: typeFactor, desc: isFast ? 'Fast Express (+18% density)' : 'Slow Local (Distributed)' },
            headway: { factor: headwayFactor, gapMinutes: spec.gapMin, desc: `${spec.gapMin}m headway since prev train` }
        };

        return {
            id: `TR-${101 + idx}`,
            depTime: depTimeStr,
            waitTime: spec.waitMin,
            gapMin: spec.gapMin,
            type: trainType,
            origin: originName,
            isOriginatingAtSource: isOriginatingAtSource,
            crowdPct: crowdPct,
            crowdCategory: categoryInfo.label,
            crowdClass: categoryInfo.cssClass,
            factors: factors
        };
    });
}

function getTimeDirDesc(factor, isNorthbound) {
    if (factor > 1.5) return `${isNorthbound ? 'Evening' : 'Morning'} Peak Flow (Heavy)`;
    if (factor > 1.0) return 'Mid-day Shoulder Volume';
    return 'Off-peak Reverse Flow (Light)';
}

function getOriginDesc(isOriginatingAtSource, isTerminusOrigin, originName) {
    if (isOriginatingAtSource) return 'Originates at your station (Starts Empty -35%)';
    if (isTerminusOrigin) return `Originates at ${originName} (-18% crowd relief)`;
    return 'Passing train from upstream';
}

function getCrowdCategory(pct) {
    if (pct < 45) {
        return { label: 'Low', cssClass: 'low' };
    } else if (pct < 68) {
        return { label: 'Moderate', cssClass: 'moderate' };
    } else if (pct < 85) {
        return { label: 'High', cssClass: 'high' };
    } else {
        return { label: 'Very High', cssClass: 'very-high' };
    }
}

/**
 * Preference-based Recommendation Scoring Function:
 * - Fastest: weight waitTime high (6.0), crowd low (0.5)
 * - Balanced: balanced weights (waitTime 2.0, crowd 2.2)
 * - Least Crowded: weight crowd high (6.0), waitTime low (0.4)
 */
function evaluateAndRecommend(trains, source, dest, preference = 'balanced') {
    let waitWeight = 2.0;
    let crowdWeight = 2.2;
    let prefLabel = 'Balanced';

    if (preference === 'fastest') {
        waitWeight = 6.0;
        crowdWeight = 0.5;
        prefLabel = 'Fastest';
    } else if (preference === 'least_crowded') {
        waitWeight = 0.4;
        crowdWeight = 6.0;
        prefLabel = 'Least Crowded';
    }

    let bestIndex = 0;
    let minScore = Infinity;

    trains.forEach((train, idx) => {
        const crowdPenalty = crowdWeight * Math.pow(train.crowdPct / 10, 1.8);
        const waitPenalty = waitWeight * train.waitTime;

        const totalScore = Math.round((crowdPenalty + waitPenalty) * 10) / 10;
        train.score = totalScore;

        if (totalScore < minScore) {
            minScore = totalScore;
            bestIndex = idx;
        }
    });

    const recommendedTrain = trains[bestIndex];
    const whyFactors = generateWhyFactors(trains, bestIndex, source, preference, prefLabel);

    return {
        trains: trains,
        recommendedIndex: bestIndex,
        recommendedTrain: recommendedTrain,
        preference: preference,
        prefLabel: prefLabel,
        whyFactors: whyFactors
    };
}

/**
 * Generates factor breakdown bullet points for "Why this train?"
 */
function generateWhyFactors(trains, recIndex, source, preference, prefLabel) {
    const rec = trains[recIndex];
    const next = trains[0];
    const factorsList = [];

    // Preference indicator
    factorsList.push(`<strong>Preference Match</strong>: Selected for <em>${prefLabel}</em> priority`);

    if (preference === 'fastest') {
        factorsList.push(`<strong>Minimizes Wait Time</strong>: Departs in ${rec.waitTime} min${rec.waitTime === 1 ? '' : 's'}`);
    } else if (preference === 'least_crowded') {
        factorsList.push(`<strong>Minimizes Crowd Density</strong>: Reaches lowest crowd level (${rec.crowdPct}% ${rec.crowdCategory})`);
    } else {
        if (recIndex > 0) {
            const crowdDiff = next.crowdPct - rec.crowdPct;
            const extraWait = rec.waitTime - next.waitTime;
            factorsList.push(`<strong>${crowdDiff}% lower crowd</strong> for just ${extraWait} min extra wait`);
        } else {
            factorsList.push(`<strong>Optimal Balance</strong>: Earliest departure with manageable crowd (${rec.crowdPct}%)`);
        }
    }

    if (rec.isOriginatingAtSource) {
        factorsList.push(`<strong>Station Origin</strong>: Train starts empty at ${source.name} (-35% crowd density)`);
    } else if (rec.origin === 'Churchgate' || rec.origin === 'CSMT') {
        factorsList.push(`<strong>Terminus Origin</strong>: Starts at ${rec.origin} (-18% crowd relief)`);
    }

    if (rec.gapMin >= 8) {
        factorsList.push(`<strong>Headway Gap</strong>: ${rec.gapMin}-minute interval cleared platform backlog`);
    }

    return factorsList;
}

function renderResults(source, dest, travelTimeStr, result) {
    const emptyState = document.getElementById('emptyState');
    const resultsContent = document.getElementById('resultsContent');

    emptyState.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('routeTitle').textContent = `${source.name} → ${dest.name}`;
    document.getElementById('routeMeta').textContent = `${source.line} Line • Scheduled around ${formatTime24to12(travelTimeStr)}`;
    document.getElementById('activeSearchTime').textContent = formatTime24to12(travelTimeStr);

    const recTrain = result.recommendedTrain;
    const recIndex = result.recommendedIndex;
    const prefLabel = result.prefLabel;

    const recTitleEl = document.getElementById('recTitle');
    const recExplanationEl = document.getElementById('recExplanation');

    recTitleEl.textContent = `Take the ${recTrain.depTime} ${recTrain.type} Train (${recTrain.waitTime}m wait)`;

    // Main paragraph summary showing travel preference
    const nextTrain = result.trains[0];
    if (result.preference === 'fastest') {
        recExplanationEl.textContent = `Optimized for your "${prefLabel}" preference: Recommends the earliest departing train at ${recTrain.depTime} (arriving in ${recTrain.waitTime}m) with a crowd level of ${recTrain.crowdPct}%.`;
    } else if (result.preference === 'least_crowded') {
        recExplanationEl.textContent = `Optimized for your "${prefLabel}" preference: Recommends the ${recTrain.depTime} train, achieving the lowest crowd density of ${recTrain.crowdPct}% (${recTrain.crowdCategory}) for a comfortable ride.`;
    } else {
        if (recIndex === 0) {
            recExplanationEl.textContent = `Optimized for your "${prefLabel}" preference: The upcoming ${recTrain.depTime} train provides the best balance (${recTrain.waitTime}m wait, ${recTrain.crowdPct}% crowd).`;
        } else {
            const crowdDiff = nextTrain.crowdPct - recTrain.crowdPct;
            const extraWait = recTrain.waitTime - nextTrain.waitTime;
            recExplanationEl.textContent = `Optimized for your "${prefLabel}" preference: Waiting ${extraWait} extra minute${extraWait > 1 ? 's' : ''} drops crowd density from ${nextTrain.crowdPct}% (${nextTrain.crowdCategory}) down to ${recTrain.crowdPct}% (${recTrain.crowdCategory}).`;
        }
    }

    // Append "Why this train?" Factor Pills in recommendation banner
    let factorsBox = document.getElementById('recFactorsBox');
    if (!factorsBox) {
        factorsBox = document.createElement('div');
        factorsBox.id = 'recFactorsBox';
        factorsBox.className = 'rec-factors-box';
        document.getElementById('recommendationBanner').appendChild(factorsBox);
    }

    factorsBox.innerHTML = `
        <div class="rec-factors-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Why this train? (${prefLabel} Priority)
        </div>
        <ul class="rec-factors-list">
            ${result.whyFactors.map(f => `<li class="rec-factor-item">${f}</li>`).join('')}
        </ul>
    `;

    // Render Trains List
    const trainsListContainer = document.getElementById('trainsList');
    trainsListContainer.innerHTML = '';

    result.trains.forEach((train, idx) => {
        const isRec = idx === recIndex;
        const card = document.createElement('div');
        card.className = `train-card ${isRec ? 'recommended' : ''}`;

        card.innerHTML = `
            ${isRec ? `
                <div class="rec-tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    RECOMMENDED (${prefLabel.toUpperCase()})
                </div>
            ` : ''}

            <div class="train-card-main">
                <div class="train-left">
                    <div class="train-time-group">
                        <span class="dep-time">${train.depTime}</span>
                        <span class="wait-time">in ${train.waitTime} min${train.waitTime === 1 ? '' : 's'}</span>
                    </div>
                    <div class="train-details">
                        <span class="train-type-badge ${train.type === 'FAST' ? 'train-type-fast' : 'train-type-slow'}">${train.type}</span>
                        <span class="train-origin">From ${train.origin}</span>
                    </div>
                    <div class="factor-chips">
                        <span class="factor-chip">${train.factors.timeDir.desc}</span>
                        <span class="factor-chip">${train.factors.origin.desc}</span>
                        <span class="factor-chip">${train.factors.headway.desc}</span>
                    </div>
                </div>

                <div class="crowd-info-group">
                    <div class="crowd-stat">
                        <span class="crowd-pct">${train.crowdPct}%</span>
                        <span class="crowd-badge ${train.crowdClass}">${train.crowdCategory}</span>
                    </div>
                </div>
            </div>

            <div class="crowd-bar-container">
                <div class="crowd-bar-fill ${train.crowdClass}" style="width: ${train.crowdPct}%"></div>
            </div>
        `;

        trainsListContainer.appendChild(card);
    });

    resultsContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function formatMinutesToTimeStr(totalMinutes) {
    let mins = totalMinutes % (24 * 60);
    let hours = Math.floor(mins / 60);
    let minutes = mins % 60;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;

    return `${hours}:${strMinutes} ${ampm}`;
}

function formatTime24to12(time24) {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const strM = m < 10 ? '0' + m : m;
    return `${h12}:${strM} ${ampm}`;
}

/**
 * SmartRail — Mumbai Local Train Crowd Recommender MVP Logic
 * Enhanced with SQLite Database Persistence, Live Chat, and Real-Time Metrics
 */

// Station Data with lines, sequential index, and historical volume baseline
const STATIONS = [
    // Western Line (South -> North)
    { id: 'churchgate', name: 'Churchgate', line: 'Western', index: 1, baselineVolume: 1.25, isTerminus: true },
    { id: 'marine_lines', name: 'Marine Lines', line: 'Western', index: 2, baselineVolume: 0.85, isTerminus: false },
    { id: 'charni_road', name: 'Charni Road', line: 'Western', index: 3, baselineVolume: 0.90, isTerminus: false },
    { id: 'grant_road', name: 'Grant Road', line: 'Western', index: 4, baselineVolume: 0.95, isTerminus: false },
    { id: 'mumbai_central', name: 'Mumbai Central', line: 'Western', index: 5, baselineVolume: 1.10, isTerminus: false },
    { id: 'dadar_w', name: 'Dadar (Western)', line: 'Western', index: 6, baselineVolume: 1.35, isTerminus: false },
    { id: 'bandra', name: 'Bandra', line: 'Western', index: 7, baselineVolume: 1.20, isTerminus: false },
    { id: 'andheri', name: 'Andheri', line: 'Western', index: 8, baselineVolume: 1.30, isTerminus: false },
    { id: 'borivali', name: 'Borivali', line: 'Western', index: 9, baselineVolume: 1.25, isTerminus: true },

    // Central Line (South -> North)
    { id: 'csmt', name: 'CSMT', line: 'Central', index: 1, baselineVolume: 1.30, isTerminus: true },
    { id: 'dadar_c', name: 'Dadar (Central)', line: 'Central', index: 6, baselineVolume: 1.40, isTerminus: false },
    { id: 'kurla', name: 'Kurla', line: 'Central', index: 7, baselineVolume: 1.25, isTerminus: false },
    { id: 'thane', name: 'Thane', line: 'Central', index: 8, baselineVolume: 1.30, isTerminus: false },
    { id: 'kalyan', name: 'Kalyan', line: 'Central', index: 9, baselineVolume: 1.25, isTerminus: true }
];

// App State
const state = {
    userId: '',
    username: '',
    currentRoute: '',
    currentRecTrain: null,
    currentPreference: 'balanced',
    recClickCount: 0,
    chatPollInterval: null,
    heartbeatInterval: null,
    latestMessagesCount: 0
};

document.addEventListener('DOMContentLoaded', () => {
    initUserSession();
    initApp();
    initDatabaseSync();
    initChatSystem();
});

/* ==========================================================================
   User Session & Identity
   ========================================================================== */
function initUserSession() {
    let uid = localStorage.getItem('smartrail_uid');
    if (!uid) {
        uid = 'usr_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('smartrail_uid', uid);
    }
    state.userId = uid;

    const defaultNames = ['BandraRider', 'MarineDriveCommuter', 'ChurchgateFast', 'AndheriTraveller', 'DadarExpress'];
    const randomDefault = defaultNames[Math.floor(Math.random() * defaultNames.length)] + '_' + Math.floor(Math.random() * 89 + 10);
    
    let uname = localStorage.getItem('smartrail_uname') || randomDefault;
    state.username = uname;

    const nameInput = document.getElementById('chatUsernameInput');
    if (nameInput) {
        nameInput.value = uname;
        nameInput.addEventListener('change', (e) => {
            const val = e.target.value.trim();
            if (val) {
                state.username = val;
                localStorage.setItem('smartrail_uname', val);
                sendChatHeartbeat();
            }
        });
    }
}

/* ==========================================================================
   Core App Initialization
   ========================================================================== */
function initApp() {
    populateStationDropdowns();
    setDefaultTime();
    bindEvents();
}

function populateStationDropdowns() {
    const sourceSelect = document.getElementById('sourceStation');
    const destSelect = document.getElementById('destStation');

    sourceSelect.innerHTML = '<option value="" disabled selected>Select origin...</option>';
    destSelect.innerHTML = '<option value="" disabled selected>Select destination...</option>';

    const lines = ['Western', 'Central'];

    lines.forEach(line => {
        const lineStations = STATIONS.filter(s => s.line === line);
        
        const optGroupSource = document.createElement('optgroup');
        optGroupSource.label = `${line} Line`;
        
        const optGroupDest = document.createElement('optgroup');
        optGroupDest.label = `${line} Line`;

        lineStations.forEach(st => {
            const opt1 = new Option(st.name, st.id);
            const opt2 = new Option(st.name, st.id);
            optGroupSource.appendChild(opt1);
            optGroupDest.appendChild(opt2);
        });

        sourceSelect.appendChild(optGroupSource);
        destSelect.appendChild(optGroupDest);
    });

    sourceSelect.value = 'churchgate';
    destSelect.value = 'dadar_w';
    updateDirectionLabel();
}

function setDefaultTime() {
    const travelTimeInput = document.getElementById('travelTime');
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    // Default to 17:30 (5:30 PM peak) if current time is late night, otherwise actual time
    if (hours < 6 || hours > 22) {
        hours = 17;
        minutes = 30;
    }

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    travelTimeInput.value = `${formattedHours}:${formattedMinutes}`;
}

function getSelectedPreference() {
    const checkedRadio = document.querySelector('input[name="travelPreference"]:checked');
    return checkedRadio ? checkedRadio.value : 'balanced';
}

function bindEvents() {
    const form = document.getElementById('plannerForm');
    const sourceSelect = document.getElementById('sourceStation');
    const destSelect = document.getElementById('destStation');
    const swapBtn = document.getElementById('swapBtn');
    const chipButtons = document.querySelectorAll('.chip-time');

    sourceSelect.addEventListener('change', () => {
        autoSelectMatchingDestLine();
        updateDirectionLabel();
    });

    destSelect.addEventListener('change', () => {
        updateDirectionLabel();
    });

    swapBtn.addEventListener('click', () => {
        const temp = sourceSelect.value;
        sourceSelect.value = destSelect.value;
        destSelect.value = temp;
        updateDirectionLabel();
    });

    chipButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const timeVal = e.target.getAttribute('data-time');
            if (timeVal === 'now') {
                setDefaultTime();
            } else {
                document.getElementById('travelTime').value = timeVal;
            }
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleCalculateRecommendation();
    });

    // Interactive Recommendation Track Click
    const btnTrackRec = document.getElementById('btnTrackRecommendation');
    if (btnTrackRec) {
        btnTrackRec.addEventListener('click', handleTrackRecommendationClick);
    }
}

function autoSelectMatchingDestLine() {
    const sourceId = document.getElementById('sourceStation').value;
    const sourceObj = STATIONS.find(s => s.id === sourceId);
    const destSelect = document.getElementById('destStation');
    const destObj = STATIONS.find(s => s.id === destSelect.value);

    if (sourceObj && destObj && sourceObj.line !== destObj.line) {
        const sameLineDests = STATIONS.filter(s => s.line === sourceObj.line && s.id !== sourceId);
        if (sameLineDests.length > 0) {
            destSelect.value = sameLineDests[Math.min(2, sameLineDests.length - 1)].id;
        }
    }
}

function updateDirectionLabel() {
    const sourceId = document.getElementById('sourceStation').value;
    const destId = document.getElementById('destStation').value;
    const dirInput = document.getElementById('directionSelect');

    const sourceObj = STATIONS.find(s => s.id === sourceId);
    const destObj = STATIONS.find(s => s.id === destId);

    if (!sourceObj || !destObj) {
        dirInput.value = 'Auto-detected';
        return;
    }

    if (sourceObj.line !== destObj.line) {
        dirInput.value = `Interline (${sourceObj.line} → ${destObj.line})`;
        return;
    }

    if (destObj.index > sourceObj.index) {
        dirInput.value = 'Northbound (Down)';
    } else if (destObj.index < sourceObj.index) {
        dirInput.value = 'Southbound (Up)';
    } else {
        dirInput.value = 'Same Station';
    }
}

/* ==========================================================================
   Algorithmic Crowd & Scoring Engine
   ========================================================================== */
function handleCalculateRecommendation() {
    const sourceId = document.getElementById('sourceStation').value;
    const destId = document.getElementById('destStation').value;
    const timeStr = document.getElementById('travelTime').value;
    const preference = getSelectedPreference();

    const sourceObj = STATIONS.find(s => s.id === sourceId);
    const destObj = STATIONS.find(s => s.id === destId);

    if (!sourceObj || !destObj || sourceId === destId) {
        alert('Please select two different stations for source and destination.');
        return;
    }

    state.currentRoute = `${sourceObj.name} → ${destObj.name}`;
    state.currentPreference = preference;

    // Generate upcoming trains with factor-calculated crowd density
    const trains = generateFactorBasedTrains(sourceObj, destObj, timeStr);

    // Score & select best train using user preference
    const evaluated = evaluateAndRecommend(trains, sourceObj, destObj, preference);
    state.currentRecTrain = evaluated.recommendedTrain;

    // Render results
    renderResults(sourceObj, destObj, timeStr, evaluated);
}

function getTimeAndDirectionFactor(hours, minutes, isNorthbound) {
    const totalMinutes = hours * 60 + minutes;

    // Morning Peak: 7:30 AM to 10:30 AM
    if (totalMinutes >= 450 && totalMinutes <= 630) {
        return !isNorthbound ? 1.65 : 0.75;
    }
    
    // Evening Peak: 4:30 PM to 8:30 PM
    if (totalMinutes >= 990 && totalMinutes <= 1230) {
        return isNorthbound ? 1.70 : 0.80;
    }

    // Shoulder period: 11 AM to 4:00 PM
    if (totalMinutes >= 660 && totalMinutes <= 960) {
        return 1.05;
    }

    return 0.55;
}

function getHeadwayFactor(timeGapMinutes) {
    const baselineGap = 4;
    return 1.0 + (timeGapMinutes - baselineGap) * 0.035;
}

function getOriginFactor(sourceId, isOriginatingAtSource, isTerminusOrigin) {
    if (isOriginatingAtSource) return 0.65;
    if (isTerminusOrigin) return 0.82;
    return 1.10;
}

function getTrainTypeFactor(isFast) {
    return isFast ? 1.18 : 0.95;
}

function generateFactorBasedTrains(source, dest, departureTimeStr) {
    const [reqHours, reqMins] = departureTimeStr.split(':').map(Number);
    const baseMinutesFromMidnight = reqHours * 60 + reqMins;

    const scheduleSpecs = [
        { waitMin: 2, gapMin: 3, forceOrigin: false },
        { waitMin: 9, gapMin: 7, forceOrigin: false },
        { waitMin: 18, gapMin: 9, forceOrigin: true },
        { waitMin: 28, gapMin: 10, forceOrigin: false }
    ];

    const isNorthbound = dest.index >= source.index;
    const timeDirFactor = getTimeAndDirectionFactor(reqHours, reqMins, isNorthbound);
    const stationBaseline = (source.baselineVolume + dest.baselineVolume) / 2;

    return scheduleSpecs.map((spec, idx) => {
        const trainTimeMins = baseMinutesFromMidnight + spec.waitMin;
        const depTimeStr = formatMinutesToTimeStr(trainTimeMins);

        const isFast = (idx % 2 === 0) && (Math.abs(dest.index - source.index) >= 3);
        const trainType = isFast ? 'FAST' : 'SLOW';

        let originName = source.line === 'Western' ? 'Churchgate' : 'CSMT';
        let isOriginatingAtSource = false;

        if (source.isTerminus) {
            originName = source.name;
            isOriginatingAtSource = true;
        } else if (spec.forceOrigin && idx === 2) {
            originName = `${source.name} (Originating)`;
            isOriginatingAtSource = true;
        }

        const isTerminusOrigin = (originName === 'Churchgate' || originName === 'CSMT');
        const typeFactor = getTrainTypeFactor(isFast);
        const originFactor = getOriginFactor(source.id, isOriginatingAtSource, isTerminusOrigin);
        const headwayFactor = getHeadwayFactor(spec.gapMin);

        const rawCrowdPct = 42 * timeDirFactor * stationBaseline * typeFactor * originFactor * headwayFactor;
        const crowdPct = Math.max(15, Math.min(98, Math.round(rawCrowdPct)));
        const categoryInfo = getCrowdCategory(crowdPct);

        const factors = {
            timeDir: { factor: timeDirFactor, desc: getTimeDirDesc(timeDirFactor, isNorthbound) },
            origin: { factor: originFactor, desc: getOriginDesc(isOriginatingAtSource, isTerminusOrigin, originName) },
            type: { factor: typeFactor, desc: isFast ? 'Fast Express (+18% load)' : 'Slow Local (Distributed)' },
            headway: { factor: headwayFactor, gapMinutes: spec.gapMin, desc: `${spec.gapMin}m headway interval` }
        };

        return {
            id: `TR-${101 + idx}`,
            depTime: depTimeStr,
            waitTime: spec.waitMin,
            gapMin: spec.gapMin,
            type: trainType,
            origin: originName,
            isOriginatingAtSource: isOriginatingAtSource,
            crowdPct: crowdPct,
            crowdCategory: categoryInfo.label,
            crowdClass: categoryInfo.cssClass,
            factors: factors
        };
    });
}

function getTimeDirDesc(factor, isNorthbound) {
    if (factor > 1.5) return `${isNorthbound ? 'Evening' : 'Morning'} Peak Flow (Heavy)`;
    if (factor > 1.0) return 'Mid-day Volume';
    return 'Off-peak Reverse Flow (Light)';
}

function getOriginDesc(isOriginatingAtSource, isTerminusOrigin, originName) {
    if (isOriginatingAtSource) return 'Starts empty here (-35%)';
    if (isTerminusOrigin) return `Starts at ${originName} (-18%)`;
    return 'Passing train';
}

function getCrowdCategory(pct) {
    if (pct < 45) {
        return { label: 'Low', cssClass: 'crowd-low' };
    } else if (pct < 68) {
        return { label: 'Moderate', cssClass: 'crowd-mod' };
    } else if (pct < 85) {
        return { label: 'High', cssClass: 'crowd-high' };
    } else {
        return { label: 'Very High', cssClass: 'crowd-vhigh' };
    }
}

function evaluateAndRecommend(trains, source, dest, preference = 'balanced') {
    let waitWeight = 2.0;
    let crowdWeight = 2.2;
    let prefLabel = 'Balanced';

    if (preference === 'fastest') {
        waitWeight = 6.0;
        crowdWeight = 0.5;
        prefLabel = 'Fastest';
    } else if (preference === 'least_crowded') {
        waitWeight = 0.4;
        crowdWeight = 6.0;
        prefLabel = 'Comfort (Least Crowded)';
    }

    let bestIndex = 0;
    let minScore = Infinity;

    trains.forEach((train, idx) => {
        const crowdPenalty = crowdWeight * Math.pow(train.crowdPct / 10, 1.8);
        const waitPenalty = waitWeight * train.waitTime;

        const totalScore = Math.round((crowdPenalty + waitPenalty) * 10) / 10;
        train.score = totalScore;

        if (totalScore < minScore) {
            minScore = totalScore;
            bestIndex = idx;
        }
    });

    const recommendedTrain = trains[bestIndex];
    const whyFactors = generateWhyFactors(trains, bestIndex, source, preference, prefLabel);

    return {
        trains: trains,
        recommendedIndex: bestIndex,
        recommendedTrain: recommendedTrain,
        preference: preference,
        prefLabel: prefLabel,
        whyFactors: whyFactors
    };
}

function generateWhyFactors(trains, recIndex, source, preference, prefLabel) {
    const rec = trains[recIndex];
    const next = trains[0];
    const factorsList = [];

    factorsList.push(`<strong>Priority Alignment</strong>: Algorithm optimized for <em>${prefLabel}</em> preference`);

    if (preference === 'fastest') {
        factorsList.push(`<strong>Quick Departure</strong>: Boards in just ${rec.waitTime} min${rec.waitTime === 1 ? '' : 's'}`);
    } else if (preference === 'least_crowded') {
        factorsList.push(`<strong>Maximum Comfort</strong>: Achieves lowest crowd rating (${rec.crowdPct}% ${rec.crowdCategory})`);
    } else {
        if (recIndex > 0) {
            const crowdDiff = next.crowdPct - rec.crowdPct;
            const extraWait = rec.waitTime - next.waitTime;
            factorsList.push(`<strong>${crowdDiff}% lower crowd</strong> for just ${extraWait} min extra wait`);
        } else {
            factorsList.push(`<strong>Optimal Balance</strong>: Earliest departure with balanced comfort (${rec.crowdPct}%)`);
        }
    }

    if (rec.isOriginatingAtSource) {
        factorsList.push(`<strong>Empty Origin</strong>: Train starts at ${source.name} (-35% crowd reduction)`);
    } else if (rec.origin === 'Churchgate' || rec.origin === 'CSMT') {
        factorsList.push(`<strong>Terminus Start</strong>: Starts at ${rec.origin} (-18% relief)`);
    }

    if (rec.gapMin >= 8) {
        factorsList.push(`<strong>Cleared Backlog</strong>: ${rec.gapMin} min headway allowed platform clearance`);
    }

    return factorsList;
}

/* ==========================================================================
   UI Rendering
   ========================================================================== */
function renderResults(source, dest, travelTimeStr, result) {
    const emptyState = document.getElementById('emptyState');
    const resultsContent = document.getElementById('resultsContent');

    emptyState.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    document.getElementById('routeTitle').textContent = `${source.name} → ${dest.name}`;
    document.getElementById('routeMeta').textContent = `${source.line} Line • Scheduled around ${formatTime24to12(travelTimeStr)}`;
    document.getElementById('activeSearchTime').textContent = formatTime24to12(travelTimeStr);

    const recTrain = result.recommendedTrain;
    const recIndex = result.recommendedIndex;
    const prefLabel = result.prefLabel;

    const recTitleEl = document.getElementById('recTitle');
    const recExplanationEl = document.getElementById('recExplanation');

    recTitleEl.textContent = `Take the ${recTrain.depTime} ${recTrain.type} Train (${recTrain.waitTime}m wait)`;

    // Main paragraph summary
    const nextTrain = result.trains[0];
    if (result.preference === 'fastest') {
        recExplanationEl.textContent = `Optimized for your "${prefLabel}" preference: Recommends the earliest departing train at ${recTrain.depTime} (in ${recTrain.waitTime}m) with a crowd level of ${recTrain.crowdPct}%.`;
    } else if (result.preference === 'least_crowded') {
        recExplanationEl.textContent = `Optimized for your "${prefLabel}" preference: Recommends the ${recTrain.depTime} train, achieving lowest crowd density of ${recTrain.crowdPct}% (${recTrain.crowdCategory}).`;
    } else {
        if (recIndex === 0) {
            recExplanationEl.textContent = `Optimized for your "${prefLabel}" preference: The upcoming ${recTrain.depTime} train provides the best balance (${recTrain.waitTime}m wait, ${recTrain.crowdPct}% crowd).`;
        } else {
            const crowdDiff = nextTrain.crowdPct - recTrain.crowdPct;
            const extraWait = recTrain.waitTime - nextTrain.waitTime;
            recExplanationEl.textContent = `Optimized for your "${prefLabel}" preference: Waiting ${extraWait} extra min${extraWait > 1 ? 's' : ''} drops crowd from ${nextTrain.crowdPct}% (${nextTrain.crowdCategory}) down to ${recTrain.crowdPct}% (${recTrain.crowdCategory}).`;
        }
    }

    // Reset button state
    const btnTrack = document.getElementById('btnTrackRecommendation');
    const btnLabel = document.getElementById('recBtnLabel');
    btnTrack.classList.remove('clicked');
    btnLabel.textContent = "I'm Taking This Train (Record in Database)";

    // Append / Update Factors Box
    let factorsBox = document.getElementById('recFactorsBox');
    if (!factorsBox) {
        factorsBox = document.createElement('div');
        factorsBox.id = 'recFactorsBox';
        factorsBox.className = 'rec-factors-box';
        document.getElementById('recommendationBanner').appendChild(factorsBox);
    }

    factorsBox.innerHTML = `
        <div class="rec-factors-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Why this train? (${prefLabel})
        </div>
        <ul class="rec-factors-list">
            ${result.whyFactors.map(f => `<li class="rec-factor-item">${f}</li>`).join('')}
        </ul>
    `;

    // Render Trains List
    const trainsListContainer = document.getElementById('trainsList');
    trainsListContainer.innerHTML = '';

    result.trains.forEach((train, idx) => {
        const isRec = idx === recIndex;
        const card = document.createElement('div');
        card.className = `train-card ${isRec ? 'recommended' : ''}`;

        card.innerHTML = `
            ${isRec ? `
                <div class="rec-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    RECOMMENDED
                </div>
            ` : ''}

            <div class="train-card-main">
                <div class="train-left">
                    <div class="train-time-group">
                        <span class="dep-time">${train.depTime}</span>
                        <span class="wait-time">in ${train.waitTime} min${train.waitTime === 1 ? '' : 's'}</span>
                    </div>
                    <div class="train-details">
                        <span class="train-type-badge ${train.type === 'FAST' ? 'train-type-fast' : 'train-type-slow'}">${train.type}</span>
                        <span class="train-origin">From ${train.origin}</span>
                    </div>
                    <div class="factor-chips">
                        <span class="factor-chip">${train.factors.timeDir.desc}</span>
                        <span class="factor-chip">${train.factors.origin.desc}</span>
                        <span class="factor-chip">${train.factors.headway.desc}</span>
                    </div>
                </div>

                <div class="crowd-info-group">
                    <div class="crowd-stat">
                        <span class="crowd-pct">${train.crowdPct}%</span>
                        <span class="crowd-badge ${train.crowdClass}">${train.crowdCategory}</span>
                    </div>
                </div>
            </div>

            <div class="crowd-bar-container">
                <div class="crowd-bar-fill ${train.crowdClass}" style="width: ${train.crowdPct}%"></div>
            </div>
        `;

        trainsListContainer.appendChild(card);
    });

    resultsContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ==========================================================================
   Interactive Recommendation Tracking (SQLite Database Integration)
   ========================================================================== */
async function handleTrackRecommendationClick() {
    if (!state.currentRecTrain) return;

    const btnTrack = document.getElementById('btnTrackRecommendation');
    const btnLabel = document.getElementById('recBtnLabel');
    const train = state.currentRecTrain;

    try {
        btnLabel.textContent = 'Saving to Database...';

        const payload = {
            userId: state.userId,
            username: state.username,
            trainTime: train.depTime,
            trainType: train.type,
            route: state.currentRoute || 'Churchgate → Dadar',
            crowdPct: train.crowdPct,
            preference: state.currentPreference
        };

        const res = await fetch('/api/recommendations/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            btnTrack.classList.add('clicked');
            btnLabel.textContent = '✓ Recorded in SQLite Database!';
            
            // Update counts immediately
            updateHeaderRecCount(data.totalClicks);
            showToast(`Tracked! Total database recommendation selections: ${data.totalClicks}`);

            // Also post quick automatic update in live chat
            sendSystemCommuterAlert(`Decided to take the ${train.depTime} ${train.type} train (${train.crowdPct}% crowd) on ${state.currentRoute}!`);
        }
    } catch (err) {
        console.error('Error tracking recommendation:', err);
        btnLabel.textContent = 'Recorded Locally';
        showToast('Selection noted!');
    }
}

function updateHeaderRecCount(count) {
    state.recClickCount = count;
    const headerEl = document.getElementById('headerRecClicks');
    const bannerCountEl = document.getElementById('recTrainClickCount');
    const modalTotalClicks = document.getElementById('modalTotalClicks');

    if (headerEl) headerEl.textContent = count;
    if (bannerCountEl) bannerCountEl.textContent = count;
    if (modalTotalClicks) modalTotalClicks.textContent = count;
}

/* ==========================================================================
   Live Commuter Chat System
   ========================================================================== */
function initChatSystem() {
    const chatWidget = document.getElementById('chatWidget');
    const btnToggle = document.getElementById('btnToggleChat');
    const chatHeader = document.getElementById('chatHeader');
    const chatForm = document.getElementById('chatForm');
    const quickChips = document.querySelectorAll('.quick-chip');

    // Toggle chat drawer
    chatHeader.addEventListener('click', (e) => {
        if (e.target.closest('input') || e.target.closest('select')) return;
        chatWidget.classList.toggle('collapsed');
    });

    btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        chatWidget.classList.toggle('collapsed');
    });

    // Quick chips
    quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const input = document.getElementById('chatTextInput');
            input.value = chip.getAttribute('data-msg');
            input.focus();
        });
    });

    // Chat submit
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatTextInput');
        const stationSelect = document.getElementById('chatStationTag');
        const text = input.value.trim();

        if (!text) return;

        const payload = {
            userId: state.userId,
            username: state.username,
            stationTag: stationSelect.value,
            message: text
        };

        input.value = '';

        try {
            await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            fetchChatMessages();
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    });

    // Initial fetch and start interval
    fetchChatMessages();
    state.chatPollInterval = setInterval(fetchChatMessages, 3500);

    // Heartbeat every 20 seconds
    sendChatHeartbeat();
    state.heartbeatInterval = setInterval(sendChatHeartbeat, 20000);
}

async function fetchChatMessages() {
    try {
        const res = await fetch('/api/chat/messages?limit=30');
        if (!res.ok) return;

        const data = await res.json();
        renderChatMessages(data.messages);
        updateActiveChatUsers(data.activeChatUsers);
    } catch (err) {
        // Silently handle polling errors if offline
    }
}

function renderChatMessages(messages) {
    const container = document.getElementById('chatMessagesList');
    if (!container || !messages) return;

    const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 40;

    container.innerHTML = '';
    messages.forEach(msg => {
        const isMine = msg.user_id === state.userId;
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${isMine ? 'mine' : ''}`;

        const timeStr = msg.created_at ? formatSqlTime(msg.created_at) : 'Just now';

        bubble.innerHTML = `
            <div class="chat-meta">
                <span class="chat-username">${escapeHtml(msg.username)}</span>
                ${msg.station_tag && msg.station_tag !== 'General' ? `<span class="chat-station-pill">${escapeHtml(msg.station_tag)}</span>` : ''}
                <span class="chat-time">${timeStr}</span>
            </div>
            <div class="chat-text">${escapeHtml(msg.message)}</div>
        `;
        container.appendChild(bubble);
    });

    if (isScrolledToBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendChatHeartbeat() {
    try {
        const stationSelect = document.getElementById('chatStationTag');
        const payload = {
            userId: state.userId,
            username: state.username,
            station: stationSelect ? stationSelect.value : 'General'
        };

        const res = await fetch('/api/chat/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            updateActiveChatUsers(data.activeChatUsers);
        }
    } catch (err) {
        // Silent error
    }
}

function updateActiveChatUsers(count) {
    const badge = document.getElementById('chatHeaderBadge');
    const headerEl = document.getElementById('headerActiveChat');
    const modalEl = document.getElementById('modalActiveUsers');

    const formatted = `${count} Online`;
    if (badge) badge.textContent = formatted;
    if (headerEl) headerEl.textContent = count;
    if (modalEl) modalEl.textContent = count;
}

async function sendSystemCommuterAlert(text) {
    try {
        const sourceSelect = document.getElementById('sourceStation');
        const stationObj = STATIONS.find(s => s.id === sourceSelect.value);
        await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.userId,
                username: state.username,
                stationTag: stationObj ? stationObj.name : 'General',
                message: text
            })
        });
        fetchChatMessages();
    } catch (e) {
        // Silent
    }
}

/* ==========================================================================
   Database Analytics Modal & Overview
   ========================================================================== */
function initDatabaseSync() {
    // Initial fetch of stats
    fetchStats();

    const btnOpenModal = document.getElementById('btnOpenDatabase');
    const modal = document.getElementById('dbModal');
    const btnClose = document.getElementById('btnCloseModal');
    const btnCloseBottom = document.getElementById('btnCloseModalBottom');
    const btnRefresh = document.getElementById('btnRefreshDbModal');
    const btnExport = document.getElementById('btnExportJson');

    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', () => {
            modal.classList.remove('hidden');
            loadModalData();
        });
    }

    const closeModal = () => modal.classList.add('hidden');
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCloseBottom) btnCloseBottom.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            loadModalData();
            showToast('Database metrics refreshed!');
        });
    }

    if (btnExport) {
        btnExport.addEventListener('click', downloadDbJson);
    }

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const target = btn.getAttribute('data-tab');
            const panel = document.getElementById(target);
            if (panel) panel.classList.add('active');
        });
    });
}

async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;

        const data = await res.json();
        if (data.success && data.stats) {
            updateHeaderRecCount(data.stats.totalClicks);
            updateActiveChatUsers(data.stats.activeChatUsers);
            const totalMsgsEl = document.getElementById('modalTotalMsgs');
            if (totalMsgsEl) totalMsgsEl.textContent = data.stats.totalMessages;
        }
    } catch (e) {
        // Server might be starting
    }
}

async function loadModalData() {
    try {
        const [statsRes, exportRes, chatRes] = await Promise.all([
            fetch('/api/stats'),
            fetch('/api/database/export'),
            fetch('/api/chat/messages?limit=10')
        ]);

        const statsData = await statsRes.json();
        const exportData = await exportRes.json();
        const chatData = await chatRes.json();

        // Update KPI
        if (statsData.success) {
            updateHeaderRecCount(statsData.stats.totalClicks);
            updateActiveChatUsers(statsData.stats.activeChatUsers);
            document.getElementById('modalTotalMsgs').textContent = statsData.stats.totalMessages;

            // Render Clicks Table
            renderClicksTable(statsData.stats.recentClicks);
        }

        // Render Active Users Table
        if (chatData.activeList) {
            renderUsersTable(chatData.activeList);
        }

        // Render Raw JSON
        const rawEl = document.getElementById('rawDbContent');
        if (rawEl) {
            rawEl.textContent = JSON.stringify(exportData, null, 2);
        }
    } catch (err) {
        console.error('Failed to load database modal data:', err);
    }
}

function renderClicksTable(clicks) {
    const tbody = document.getElementById('tblClicksBody');
    if (!tbody) return;

    if (!clicks || clicks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#94a3b8;">No recommendation clicks recorded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = clicks.map(c => `
        <tr>
            <td><strong>#${c.id}</strong></td>
            <td>${escapeHtml(c.username || 'Commuter')}</td>
            <td>${escapeHtml(c.train_time)}</td>
            <td><span class="train-type-badge ${c.train_type === 'FAST' ? 'train-type-fast' : 'train-type-slow'}">${escapeHtml(c.train_type)}</span></td>
            <td>${escapeHtml(c.route)}</td>
            <td><strong>${c.crowd_pct}%</strong></td>
            <td><span class="pref-pill">${escapeHtml(c.preference)}</span></td>
            <td>${formatSqlTime(c.created_at)}</td>
        </tr>
    `).join('');
}

function renderUsersTable(users) {
    const tbody = document.getElementById('tblUsersBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No active commuters online currently.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td><code>${escapeHtml(u.user_id)}</code></td>
            <td><strong>${escapeHtml(u.username)}</strong></td>
            <td><span class="chat-station-pill">${escapeHtml(u.station || 'General')}</span></td>
            <td><span class="pulse-indicator"></span> Active in Mumbai local network</td>
        </tr>
    `).join('');
}

async function downloadDbJson() {
    try {
        const res = await fetch('/api/database/export');
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartrail_database_dump_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Database dump downloaded successfully!');
    } catch (e) {
        alert('Could not download database export');
    }
}

/* ==========================================================================
   Utilities
   ========================================================================== */
function formatMinutesToTimeStr(totalMinutes) {
    let mins = totalMinutes % (24 * 60);
    let hours = Math.floor(mins / 60);
    let minutes = mins % 60;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;

    return `${hours}:${strMinutes} ${ampm}`;
}

function formatTime24to12(time24) {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const strM = m < 10 ? '0' + m : m;
    return `${h12}:${strM} ${ampm}`;
}

function formatSqlTime(sqlDateStr) {
    if (!sqlDateStr) return '';
    const d = new Date(sqlDateStr.includes('Z') ? sqlDateStr : sqlDateStr + 'Z');
    if (isNaN(d.getTime())) return sqlDateStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(msg) {
    const toast = document.getElementById('toastNotification');
    const msgEl = document.getElementById('toastMessage');
    if (!toast || !msgEl) return;

    msgEl.textContent = msg;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
