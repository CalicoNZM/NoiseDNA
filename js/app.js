;(function() {
  'use strict';

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function getAccentColor() { return getCSSVar('--accent') || '#2997ff'; }
  function getAccentHover() { return getCSSVar('--accent-hover') || '#0066cc'; }
  function getTextMuted() { return getCSSVar('--text-muted') || '#707070'; }
  function getTextSecondary() { return getCSSVar('--text-secondary') || '#333'; }
  function getChartGrid() { return getCSSVar('--chart-grid') || 'rgba(0,0,0,0.06)'; }
  function getTooltipBg() { return getCSSVar('--tooltip-bg') || 'rgba(255,255,255,0.95)'; }
  function getTooltipBorder() { return getCSSVar('--tooltip-border') || 'rgba(0,0,0,0.1)'; }
  function getGaugeTrack() { return getCSSVar('--gauge-track') || 'rgba(0,0,0,0.06)'; }

  function chartTooltip() {
    const bg = getTooltipBg();
    const bd = getTooltipBorder();
    return {
      backgroundColor: bg,
      titleColor: getCSSVar('--text-primary') || '#1d1d1f',
      bodyColor: getCSSVar('--text-secondary') || '#333',
      borderColor: bd,
      borderWidth: 1,
      padding: 8,
    };
  }

  const COLORS = {
    cyan: '#06B6D4',
    emerald: '#10B981',
    amber: '#F59E0B',
    orange: '#F97316',
    red: '#EF4444',
    purple: '#A855F7',
    pink: '#EC4899',
  };

  const RISK_LEVELS = [
    { id: 'quiet', max: 50, label: 'Quiet', color: COLORS.emerald, icon: 'fa-volume-low' },
    { id: 'moderate', max: 65, label: 'Moderate', color: COLORS.amber, icon: 'fa-volume-low' },
    { id: 'loud', max: 80, label: 'Loud', color: COLORS.orange, icon: 'fa-volume-high' },
    { id: 'dangerous', max: 140, label: 'Dangerous', color: COLORS.red, icon: 'fa-volume-high' },
  ];

  const NOISE_SOURCE_LABELS = [
    { id: 'traffic', label: 'Traffic', color: '#06B6D4' },
    { id: 'construction', label: 'Construction', color: '#F59E0B' },
    { id: 'industrial', label: 'Industrial', color: '#EF4444' },
    { id: 'railway', label: 'Railway', color: '#A855F7' },
    { id: 'aircraft', label: 'Aircraft', color: '#EC4899' },
    { id: 'events', label: 'Events', color: '#10B981' },
    { id: 'gatherings', label: 'Public Gatherings', color: '#F97316' },
  ];

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function generateNoiseProfile(baseNoise, variance) {
    variance = variance || 5;
    return clamp(Math.round((baseNoise + rand(-variance, variance)) * 10) / 10, 20, 140);
  }

  function getRiskIndex(db) {
    if (db <= 50) return 0;
    if (db <= 65) return 1;
    if (db <= 80) return 2;
    return 3;
  }

  function getRiskLevel(db) { return RISK_LEVELS[getRiskIndex(db)]; }

  function formatTime(h) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return h12 + ampm;
  }

  function generateHourlyData(baseNoise) {
    const hours = [];
    const currentHour = new Date().getHours();
    const seed = (currentHour * 7 + currentHour * currentHour) % 13;
    for (let h = 0; h < 24; h++) {
      const pseudo = ((seed * (h + 1) * 31 + h * 17) % 100) / 100;
      let noise;
      if (h < 5) noise = baseNoise - 18 + pseudo * 6 - 3;
      else if (h < 7) noise = baseNoise - 8 + pseudo * 8 - 4;
      else if (h < 9) noise = baseNoise + 12 + pseudo * 10 - 5 + (h === 8 ? 3 : 0);
      else if (h < 12) noise = baseNoise + 5 + pseudo * 8 - 4;
      else if (h < 14) noise = baseNoise + 8 + pseudo * 6 - 3;
      else if (h < 17) noise = baseNoise + 4 + pseudo * 8 - 4;
      else if (h < 20) noise = baseNoise + 14 + pseudo * 10 - 5 + (h === 18 ? 4 : 0);
      else if (h < 23) noise = baseNoise + 3 + pseudo * 6 - 3;
      else noise = baseNoise - 8 + pseudo * 6 - 3;
      hours.push({ hour: h, noise: clamp(Math.round(noise), 20, 140), time: formatTime(h) });
    }
    return hours;
  }

  function generateSourceDistribution() {
    const sources = NOISE_SOURCE_LABELS.map(s => ({ ...s, value: randInt(5, 50) }));
    const total = sources.reduce((a, s) => a + s.value, 0);
    sources.forEach(s => { s.pct = Math.round((s.value / total) * 100); });
    return sources;
  }

  function generateWeeklyData(baseNoise) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    return days.map((day, i) => {
      const isWeekend = i === 0 || i === 6;
      const low = baseNoise - 15 + (isWeekend ? -5 : 0) + randInt(-3, 3);
      const high = baseNoise + 12 + (isWeekend ? -8 : 0) + randInt(-4, 8);
      return { day, low: clamp(low, 20, 140), high: clamp(high, 20, 140), today: i === today };
    });
  }

  function generateMapHotspots() {
    const center = [40.7128, -74.0060];
    const zones = [
      { name: 'Downtown', latOff: 0.003, lngOff: -0.002, intensity: 0.9 },
      { name: 'Times Square', latOff: 0.002, lngOff: 0.006, intensity: 1.0 },
      { name: 'Central Park', latOff: 0.013, lngOff: -0.003, intensity: 0.2 },
      { name: 'Financial District', latOff: -0.008, lngOff: -0.001, intensity: 0.85 },
      { name: 'Midtown', latOff: 0.006, lngOff: 0.002, intensity: 0.8 },
      { name: 'Upper East Side', latOff: 0.018, lngOff: 0.001, intensity: 0.4 },
      { name: 'Brooklyn Bridge', latOff: -0.005, lngOff: 0.008, intensity: 0.7 },
      { name: 'Hudson Yards', latOff: 0.004, lngOff: -0.007, intensity: 0.75 },
      { name: 'East Village', latOff: 0.001, lngOff: 0.012, intensity: 0.65 },
      { name: 'Harlem', latOff: 0.022, lngOff: -0.002, intensity: 0.55 },
      { name: 'Chelsea', latOff: 0.007, lngOff: -0.005, intensity: 0.6 },
      { name: 'Greenwich Village', latOff: 0.002, lngOff: 0.003, intensity: 0.5 },
    ];
    const hotspots = [];
    zones.forEach(z => {
      const baseNoise = 55 + z.intensity * 40;
      const count = randInt(2, 5);
      for (let i = 0; i < count; i++) {
        hotspots.push({
          lat: z.latOff + center[0] + rand(-0.003, 0.003),
          lng: z.lngOff + center[1] + rand(-0.003, 0.003),
          intensity: z.intensity * rand(0.6, 1.0),
          noise: Math.round(baseNoise + rand(-10, 10)),
          name: z.name,
        });
      }
    });
    return hotspots;
  }

  function drawGauge(canvas, value) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h - 20;
    const r = Math.min(cx - 20, 80);
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const range = endAngle - startAngle;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    const pct = Math.min(value / 120, 1);
    const valAngle = startAngle + range * pct;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, COLORS.emerald);
    grad.addColorStop(0.4, COLORS.amber);
    grad.addColorStop(0.7, COLORS.orange);
    grad.addColorStop(1, COLORS.red);

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, valAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    for (let i = 0; i <= 10; i++) {
      const tickAngle = startAngle + (range * i) / 10;
      const inner = r - 12;
      const outer = r - 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(tickAngle) * inner, cy + Math.sin(tickAngle) * inner);
      ctx.lineTo(cx + Math.cos(tickAngle) * outer, cy + Math.sin(tickAngle) * outer);
      ctx.strokeStyle = i % 5 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.stroke();
    }
  }

  function calculateBuildingNoise(buildingType, floors, proximity) {
    const base = { residential: 55, school: 50, hospital: 48, office: 58, library: 38 }[buildingType] || 50;
    const prox = { 'Direct (0–10m)': 20, 'Near (10–50m)': 10, 'Moderate (50–200m)': 3, 'Far (200m+)': -5 }[proximity] || 10;
    const flr = { '1–3': 0, '4–8': 2, '9–15': 5, '16+': 8 }[floors] || 0;
    return clamp(Math.round(base + prox + flr + rand(-3, 3)), 20, 140);
  }

  function generateRecommendations(buildingType, noise) {
    const recDB = {
      school: [
        { name: 'Acoustic Wall Panels', desc: 'Install NRC 0.85 panels in classrooms and corridors', reduction: 8, icon: 'fa-table-cells', color: '#06B6D4', cost: '$8K-$15K', difficulty: 'Moderate', roi: '2-4 months' },
        { name: 'Green Roof', desc: 'Extensive green roof with sedum for sound absorption', reduction: 6, icon: 'fa-leaf', color: '#10B981', cost: '$15K-$30K', difficulty: 'Hard', roi: '6-12 months' },
        { name: 'Sound-Absorbing Facade', desc: 'Ventilated facade with mineral wool insulation', reduction: 12, icon: 'fa-building', color: '#A855F7', cost: '$25K-$50K', difficulty: 'Hard', roi: '3-6 months' },
        { name: 'Tree Barrier', desc: 'Double-row deciduous trees along property line', reduction: 5, icon: 'fa-tree', color: '#F59E0B', cost: '$3K-$8K', difficulty: 'Easy', roi: '1-2 years' },
        { name: 'Acoustic Ceiling', desc: 'Suspended acoustic ceiling tiles in gymnasium', reduction: 4, icon: 'fa-square', color: '#EC4899', cost: '$5K-$12K', difficulty: 'Moderate', roi: '1-3 months' },
      ],
      hospital: [
        { name: 'Acoustic Wall Panels', desc: 'Hospital-grade soundproofing for patient rooms', reduction: 10, icon: 'fa-table-cells', color: '#06B6D4', cost: '$12K-$22K', difficulty: 'Moderate', roi: '2-4 months' },
        { name: 'Green Roof', desc: 'Intensive green roof with sound-absorbing substrate', reduction: 7, icon: 'fa-leaf', color: '#10B981', cost: '$25K-$50K', difficulty: 'Hard', roi: '8-14 months' },
        { name: 'Noise Barrier Wall', desc: '4m high barrier near ER ambulance entrance', reduction: 15, icon: 'fa-grip', color: '#EF4444', cost: '$30K-$60K', difficulty: 'Hard', roi: '3-6 months' },
        { name: 'Soundproof Windows', desc: 'STC 45 rated windows for ICU wing', reduction: 8, icon: 'fa-window-maximize', color: '#A855F7', cost: '$18K-$35K', difficulty: 'Moderate', roi: '4-8 months' },
        { name: 'HVAC Silencers', desc: 'Duct silencers on ventilation system', reduction: 3, icon: 'fa-fan', color: '#F59E0B', cost: '$5K-$10K', difficulty: 'Moderate', roi: '1-2 months' },
      ],
      residential: [
        { name: 'Double Glazing', desc: 'STC 40 rated double-pane windows', reduction: 8, icon: 'fa-window-maximize', color: '#06B6D4', cost: '$4K-$10K', difficulty: 'Moderate', roi: '6-12 months' },
        { name: 'Green Facade', desc: 'Climbing plants on exterior walls', reduction: 4, icon: 'fa-leaf', color: '#10B981', cost: '$2K-$5K', difficulty: 'Easy', roi: '1-2 years' },
        { name: 'Acoustic Fence', desc: '2.5m absorptive fence along property', reduction: 6, icon: 'fa-border-all', color: '#F59E0B', cost: '$3K-$8K', difficulty: 'Easy', roi: '3-6 months' },
        { name: 'Weatherstripping', desc: 'Seal gaps around doors and windows', reduction: 3, icon: 'fa-tape', color: '#A855F7', cost: '$200-$800', difficulty: 'Easy', roi: '1-2 months' },
      ],
      office: [
        { name: 'Acoustic Ceiling Tiles', desc: 'NRC 0.90 ceiling tiles for open plans', reduction: 6, icon: 'fa-square', color: '#06B6D4', cost: '$6K-$15K', difficulty: 'Moderate', roi: '2-4 months' },
        { name: 'Carpet Installation', desc: 'Sound-absorbing carpet tiles throughout', reduction: 4, icon: 'fa-border-all', color: '#10B981', cost: '$5K-$12K', difficulty: 'Easy', roi: '1-3 months' },
        { name: 'White Noise System', desc: 'Masking system for open office areas', reduction: 5, icon: 'fa-wave-square', color: '#A855F7', cost: '$3K-$8K', difficulty: 'Easy', roi: '1-2 months' },
        { name: 'Acoustic Partitions', desc: 'Height-adjustable desk screens', reduction: 3, icon: 'fa-divide', color: '#F59E0B', cost: '$2K-$6K', difficulty: 'Easy', roi: '1-3 months' },
      ],
      library: [
        { name: 'Acoustic Entrance', desc: 'Sound-lock vestibule at main entrance', reduction: 8, icon: 'fa-door-open', color: '#06B6D4', cost: '$10K-$20K', difficulty: 'Moderate', roi: '3-6 months' },
        { name: 'Bookshelf Barriers', desc: 'Tall bookshelves as sound diffusers', reduction: 5, icon: 'fa-book', color: '#10B981', cost: '$2K-$6K', difficulty: 'Easy', roi: '1-2 months' },
        { name: 'Carpet & Padding', desc: 'Thick carpet with acoustic underlay', reduction: 4, icon: 'fa-border-all', color: '#A855F7', cost: '$4K-$10K', difficulty: 'Easy', roi: '2-4 months' },
        { name: 'Acoustic Panels', desc: 'Fabric-wrapped panels for reading areas', reduction: 6, icon: 'fa-table-cells', color: '#F59E0B', cost: '$5K-$12K', difficulty: 'Moderate', roi: '2-3 months' },
      ],
    };
    return (recDB[buildingType] || recDB.residential).map(r => ({
      ...r,
      reduction: Math.round(r.reduction * (1 + (noise - 50) / 100) * 10) / 10,
    }));
  }

  let routeMapInstance = null;
  let routeLayers = [];

  const NYC_PRESETS = {
    'Central Park': [40.7829, -73.9654],
    'Times Square, NYC': [40.7580, -73.9855],
    'Grand Central Terminal': [40.7527, -73.9772],
    'Brooklyn Bridge': [40.7061, -73.9969],
    'Union Square': [40.7359, -73.9911],
    'Wall Street': [40.7074, -74.0113],
    'Madison Square Garden': [40.7505, -73.9934],
    'One World Trade Center': [40.7127, -74.0134],
    'current': null,
  };

  function initRouteMap() {
    const container = document.getElementById('routeMiniMap');
    if (!container || typeof L === 'undefined') return;
    if (routeMapInstance) { routeMapInstance.invalidateSize(); return; }
    routeMapInstance = L.map('routeMiniMap', {
      center: [state.lat || 40.7704, state.lng || -73.9760],
      zoom: 14, zoomControl: false, attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(routeMapInstance);
  }

  function clearRouteLayers() {
    routeLayers.forEach(l => routeMapInstance?.removeLayer(l));
    routeLayers = [];
  }

  function generateDynamicRoutes(startLat, startLng, endLat, endLng) {
    const dx = endLng - startLng;
    const dy = endLat - startLat;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(6, Math.round(dist * 150));
    const perKm = (dist * 111) / 3;
    const baseDist = Math.round(perKm * 10) / 10;

    function routeCoords(offsetFactor, noiseFactor) {
      const coords = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = startLat + dy * t + (noiseFactor || 0.001) * Math.sin(t * Math.PI * (offsetFactor || 1)) * dist * 0.5;
        const lng = startLng + dx * t + (noiseFactor || 0.001) * Math.cos(t * Math.PI * (offsetFactor || 1) * 0.7) * dist * 0.5;
        coords.push([lat, lng]);
      }
      return coords;
    }

    const routeTypes = {
      fastest: {
        coords: routeCoords(0.6, 0.0003),
        noise: Math.round(65 + rand(3, 8)), time: Math.round(baseDist / 14 * 60), dist: baseDist, score: 60, pct: 100, color: '#EF4444', label: 'Fastest Route',
      },
      balanced: {
        coords: routeCoords(1.2, 0.0006),
        noise: Math.round(52 + rand(3, 6)), time: Math.round(baseDist / 10 * 60), dist: Math.round(baseDist * 1.15 * 10) / 10, score: 78, pct: 72, color: '#F59E0B', label: 'Balanced Route',
      },
      quietest: {
        coords: routeCoords(2.0, 0.001),
        noise: Math.round(35 + rand(3, 6)), time: Math.round(baseDist / 7 * 60), dist: Math.round(baseDist * 1.4 * 10) / 10, score: 92, pct: 52, color: '#10B981', label: 'Quietest Route',
      },
    };
    return { routeTypes, startLat, startLng, endLat, endLng };
  }

  function recalculateRoutes() {
    if (!routeMapInstance) initRouteMap();
    if (!routeMapInstance) return;
    clearRouteLayers();

    const startVal = document.getElementById('routeStart').value;
    const endVal = document.getElementById('routeEnd').value;
    if (!endVal) { alert('Please select a destination'); return; }

    let startLat = state.lat;
    let startLng = state.lng;
    if (startVal !== 'current') {
      const c = NYC_PRESETS[startVal];
      if (c) { startLat = c[0]; startLng = c[1]; }
    }
    if (!startLat || !startLng) { startLat = 40.7580; startLng = -73.9855; }

    const endCoords = NYC_PRESETS[endVal];
    if (!endCoords) { alert('Unknown destination'); return; }

    const startName = startVal === 'current' ? (state.locationName || 'Current Location') : startVal;
    const endName = endVal;
    const startM = L.marker([startLat, startLng]).addTo(routeMapInstance)
      .bindPopup('<b>' + startName + '</b><br>Start');
    const endM = L.marker(endCoords).addTo(routeMapInstance)
      .bindPopup('<b>' + endName + '</b><br>Destination');
    routeLayers.push(startM, endM);

    const { routeTypes } = generateDynamicRoutes(startLat, startLng, endCoords[0], endCoords[1]);
    const allCoords = [];

    ['fastest', 'balanced', 'quietest'].forEach(type => {
      const route = routeTypes[type];
      const card = document.querySelector(`.route-card.${type}`);
      if (!card) return;
      card.querySelector('.route-detail:nth-child(1) span').textContent = route.time + ' min';
      card.querySelector('.route-detail:nth-child(2) span').textContent = route.dist + ' km';
      card.querySelector('.route-detail:nth-child(3) span').textContent = route.noise + ' dB avg';
      card.querySelector('.route-detail:nth-child(4) span').textContent = 'Noise Score: ' + route.score;
      card.querySelector('.route-bar').style.setProperty('--pct', route.pct + '%');

      const polyline = L.polyline(route.coords, {
        color: route.color, weight: 4, opacity: 0.8,
      }).addTo(routeMapInstance);
      polyline.bindPopup('<b>' + route.label + '</b><br>' + route.noise + ' dB · ' + route.dist + ' km · ' + route.time + ' min');
      routeLayers.push(polyline);
      route.coords.forEach(c => allCoords.push(c));
    });

    routeMapInstance.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });
  }

  const state = {
    currentSection: 'dashboard',
    currentNoise: 67,
    hourlyData: [],
    sourceData: [],
    weeklyData: [],
    hotspots: [],
    forecastPeriod: 'today',
    selectedRoute: 'balanced',
    buildingType: 'school',
    buildingFloors: '4–8',
    buildingProximity: 'Near (10–50m)',
    navMode: 'scroll',
    sliderIndex: 0,
    lat: 40.7128,
    lng: -74.0060,
    locationName: 'NYC Case Study',
    usingMic: false,
    micNoise: null,
    audioCtx: null,
    analyser: null,
    micStream: null,
    locationSet: false,
    micSamples: [],
    trendData: [],
    sourceData: [],
    recordingPhase: null,
    recordingStartTime: null,
    recordingSecond: 0,
    recordingStopping: false,
    micAnimFrame: null,
    lastFreqData: null,
    reports: [],
    currentUser: null,
    authMode: 'login',
    communityPosts: [],
  };

  let gaugeCanvas, gaugeValue;
  let sourceChartInstance, hourlyChartInstance, forecastChartInstance;
  let mapInstance;
  let updateInterval;
  let userMarker, userRouteMarker;
  const initializedSections = new Set();

  function init() {
    gaugeCanvas = document.getElementById('noiseGauge');
    gaugeValue = document.getElementById('gaugeValue');

    state.currentNoise = randInt(58, 72);
    state.hourlyData = generateHourlyData(state.currentNoise);
    state.sourceData = generateSourceDistribution();
    state.weeklyData = generateWeeklyData(state.currentNoise);
    state.hotspots = generateMapHotspots();

    initDarkToggle();
    initNavigation();
    initMobileToggle();
    initRecording();
    initRouteSwap();
    initRouteSelection();
    initRouteFind();
    initBuildingAdvisor();
    initForecastTabs();
    initLegacyToggle();
    initCommunity();
    initReports();
    initSensitiveZoneMonitor();

    renderTrendChart();
    renderForecast();
    renderBuildingAdvisor();

    setNavMode('slider');

    setTimeout(initMap, 500);
    setTimeout(locateUser, 1000);

    updateInterval = setInterval(() => {
      if (!state.usingMic) {
        state.currentNoise = generateNoiseProfile(state.currentNoise, 2);
        updateDashboardValues();
      }
    }, 5000);

    initCardResizeObserver();
  }

  function initDarkToggle() {
    const btn = document.getElementById('darkToggle');
    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      btn.classList.toggle('active');
      const icon = btn.querySelector('i');
      icon.className = document.body.classList.contains('dark') ? 'fas fa-sun' : 'fas fa-moon';
      btn.querySelector('span').textContent = document.body.classList.contains('dark') ? 'Light Mode' : 'Dark Mode';
      reRenderThemeDependent();
    });
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      btn.click();
    }
  }

  function setNavMode(mode) {
    const body = document.body;
    body.classList.remove('mode-slider');
    body.classList.add('mode-' + mode);

    if (state.navMode === 'slider') destroySliderMode();

    state.navMode = mode;

    if (mode === 'slider') initSliderMode();

    const activeNav = document.querySelector('.nav-item.active') || document.querySelector('.nav-item');
    if (activeNav) {
      const section = activeNav.dataset.section;
      navigateTo(section, true);
    }

    document.getElementById('sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay')?.remove();
  }

  function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(item.dataset.section);
        document.getElementById('sidebar').classList.remove('open');
        document.querySelector('.sidebar-overlay')?.remove();
      });
    });
  }

  function navigateTo(section, silent) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');
    state.currentSection = section;

    if (state.navMode === 'slider') {
      const allSections = document.querySelectorAll('.page-section');
      let idx = 0;
      allSections.forEach((s, i) => {
        if (s.id === 'page-' + section) idx = i;
      });
      goToSlider(idx);
    }

    if (section === 'map' && mapInstance) {
      setTimeout(() => mapInstance.invalidateSize(), 300);
    }
    if (section === 'routes') {
      setTimeout(() => {
        initRouteMap();
        recalculateRoutes();
      }, 200);
    }
  }

  function initSectionOnce(section) {
    if (initializedSections.has(section)) return;
    initializedSections.add(section);
  }

  function reRenderThemeDependent() {
    setTimeout(() => {
      if (document.getElementById('sourceChart')) renderSourceChart();
      if (document.getElementById('hourlyChart')) renderTrendChart();
      if (document.getElementById('forecastChart')) renderForecastChart();
      if (document.getElementById('noiseGauge')) drawGauge(document.getElementById('noiseGauge'), state.currentNoise);
    }, 50);
  }

  function initSliderMode() {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach((s, i) => {
      s.classList.remove('slider-active', 'slider-exit-left', 'slider-exit-right');
    });
    const activeNav = document.querySelector('.nav-item.active');
    let targetIdx = 0;
    if (activeNav) {
      const sectionId = activeNav.dataset.section;
      sections.forEach((s, i) => {
        if (s.id === 'page-' + sectionId) targetIdx = i;
      });
    }
    state.sliderIndex = targetIdx;
    if (sections.length > 0) sections[targetIdx].classList.add('slider-active');
    updateSliderControls();

    document.getElementById('sliderPrev').addEventListener('click', () => goToSlider(state.sliderIndex - 1));
    document.getElementById('sliderNext').addEventListener('click', () => goToSlider(state.sliderIndex + 1));

    document.addEventListener('keydown', sliderKeyHandler);
  }

  function destroySliderMode() {
    document.removeEventListener('keydown', sliderKeyHandler);
  }

  function sliderKeyHandler(e) {
    if (state.navMode !== 'slider') return;
    if (e.key === 'ArrowLeft') goToSlider(state.sliderIndex - 1);
    else if (e.key === 'ArrowRight') goToSlider(state.sliderIndex + 1);
  }

  function goToSlider(index) {
    const sections = document.querySelectorAll('.page-section');
    if (index < 0 || index >= sections.length) return;
    if (index === state.sliderIndex) return;

    const current = sections[state.sliderIndex];
    const next = sections[index];

    current.classList.remove('slider-active');
    next.classList.add('slider-active');

    state.sliderIndex = index;
    updateSliderControls();

    const id = next.id.replace('page-', '');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${id}"]`)?.classList.add('active');
    state.currentSection = id;

    if (id === 'map' && mapInstance) setTimeout(() => mapInstance.invalidateSize(), 200);
  }

  function updateSliderControls() {
    const sections = document.querySelectorAll('.page-section');
    const dots = document.getElementById('sliderDots');
    dots.innerHTML = '';
    sections.forEach((s, i) => {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === state.sliderIndex ? ' active' : '');
      dot.addEventListener('click', () => goToSlider(i));
      dots.appendChild(dot);
    });

    document.getElementById('sliderPrev').disabled = state.sliderIndex === 0;
    document.getElementById('sliderNext').disabled = state.sliderIndex === sections.length - 1;
  }

  function initMobileToggle() {
    document.getElementById('mobileToggle').addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('open');
      if (sidebar.classList.contains('open')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay show';
        overlay.addEventListener('click', () => {
          sidebar.classList.remove('open');
          overlay.remove();
        });
        document.body.appendChild(overlay);
      } else {
        document.querySelector('.sidebar-overlay')?.remove();
      }
    });
  }

  function initCardResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const card = entry.target;
        if (!document.contains(card)) return;

        if (card.contains(document.getElementById('sourceChart'))) {
          if (sourceChartInstance) { sourceChartInstance.resize(); }
        }
        if (card.contains(document.getElementById('hourlyChart'))) {
          if (hourlyChartInstance) { hourlyChartInstance.resize(); }
        }
        if (card.contains(document.getElementById('forecastChart'))) {
          if (forecastChartInstance) { forecastChartInstance.resize(); }
        }

        if (card.contains(document.getElementById('noiseGauge'))) {
          drawGauge(document.getElementById('noiseGauge'), state.currentNoise);
        }

        if (card.contains(document.getElementById('routeMiniMap')) && typeof routeMapInstance !== 'undefined' && routeMapInstance) {
          setTimeout(() => routeMapInstance.invalidateSize(), 100);
        }
        if (card.contains(document.getElementById('noiseMap')) && typeof mapInstance !== 'undefined' && mapInstance) {
          setTimeout(() => mapInstance.invalidateSize(), 100);
        }
      });
    });

    document.querySelectorAll('.card, .route-card, .zone-card').forEach(el => ro.observe(el));
  }

  function updateLocationUI() {
    const name = document.getElementById('locationName');
    const dash = document.getElementById('dashLocation');
    const mapLoc = document.getElementById('mapLocation');
    const fcLoc = document.getElementById('forecastLocation');
    const label = state.locationName;
    if (name) name.textContent = label;
    if (dash) dash.textContent = label;
    if (mapLoc) mapLoc.textContent = label;
    if (fcLoc) fcLoc.textContent = label;
  }

  function reverseGeocode(lat, lng) {
    const name = document.getElementById('locationName');
    const dash = document.getElementById('dashLocation');
    const mapLoc = document.getElementById('mapLocation');
    const fcLoc = document.getElementById('forecastLocation');
    const routeStart = document.getElementById('routeStart');
    const label = lat ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'your location';
    if (name) name.textContent = label;
    if (dash) dash.textContent = label;
    if (mapLoc) mapLoc.textContent = label;
    if (fcLoc) fcLoc.textContent = label;
    state.locationName = label;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`)
      .then(r => r.json())
      .then(data => {
        const display = data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : label;
        if (name) name.textContent = display;
        if (dash) dash.textContent = display;
        if (mapLoc) mapLoc.textContent = display;
        if (fcLoc) fcLoc.textContent = display;
        state.locationName = display;
      })
      .catch(() => {});
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setDefaultLocation();
      return;
    }

    const options = { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 };

    function success(pos) {
      state.lat = pos.coords.latitude;
      state.lng = pos.coords.longitude;
      state.locationSet = true;
      reverseGeocode(state.lat, state.lng);
      updateMapMarkers();
    }

    function error() {
      setDefaultLocation();
      const name = document.getElementById('locationName');
      if (name && name.textContent === 'NYC Case Study') {
        fetch('https://ipapi.co/json/')
          .then(r => r.json())
          .then(data => {
            if (data.latitude && data.longitude) {
              state.lat = data.latitude;
              state.lng = data.longitude;
              state.locationSet = true;
              reverseGeocode(state.lat, state.lng);
              updateMapMarkers();
            }
          })
          .catch(() => {});
      }
    }

    function setDefaultLocation() {
      state.lat = 40.7128;
      state.lng = -74.0060;
      state.locationName = 'NYC Case Study';
      updateLocationUI();
    }

    function updateMapMarkers() {
      if (mapInstance && userMarker) {
        userMarker.setLatLng([state.lat, state.lng]);
        mapInstance.setView([state.lat, state.lng], mapInstance.getZoom());
      } else if (mapInstance) {
        userMarker = L.circleMarker([state.lat, state.lng], {
          radius: 6, color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.8, weight: 2,
        }).addTo(mapInstance).bindPopup('<b>You are here</b>');
        mapInstance.setView([state.lat, state.lng], 13);
      }
      if (routeMapInstance && userRouteMarker) {
        userRouteMarker.setLatLng([state.lat, state.lng]);
      } else if (routeMapInstance) {
        userRouteMarker = L.marker([state.lat, state.lng]).addTo(routeMapInstance)
          .bindPopup('<b>Start: Your Location</b>');
        routeLayers.push(userRouteMarker);
      }
    }

    const watchId = navigator.geolocation.watchPosition(success, error, options);

    setTimeout(() => {
      if (!state.locationSet) {
        navigator.geolocation.clearWatch(watchId);
        navigator.geolocation.getCurrentPosition(success, error, { ...options, timeout: 5000 });
      }
    }, 12000);

    setTimeout(() => {
      if (!state.locationSet) setDefaultLocation();
    }, 20000);
  }

  function initRecording() {
    const btn = document.getElementById('recordBtn');
    if (!btn) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setLabel('Mic not available');
      return;
    }
    btn.addEventListener('click', function toggleRecord() {
      if (btn.dataset.recording === 'true') {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }

  function startRecording() {
    const btn = document.getElementById('recordBtn');
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        state.micStream = stream;
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = state.audioCtx.createMediaStreamSource(stream);
        state.analyser = state.audioCtx.createAnalyser();
        state.analyser.fftSize = 256;
        source.connect(state.analyser);
        state.usingMic = true;
        state.recordingPhase = 'recording';
        state.micSamples = [];
        state.trendData = [];
        state.sourceData = [];
        state.recordingStartTime = Date.now();
        state.recordingSecond = 0;
        state.recordingStopping = false;

        btn.dataset.recording = 'true';
        btn.classList.add('recording');
        btn.classList.remove('stopping');
        btn.querySelector('i').className = 'fas fa-stop';
        setLabel('Recording 0/15s');

        const timerEl = getOrCreateTimer();
        timerEl.textContent = '0s / 15s';

        state.micAnimFrame = requestAnimationFrame(function sample() {
          if (!state.usingMic || !state.analyser) {
            finalizeRecording();
            return;
          }
          const data = new Uint8Array(state.analyser.frequencyBinCount);
          state.analyser.getByteFrequencyData(data);
          state.lastFreqData = data;
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          const normalized = avg / 255;
          const db = clamp(Math.round(30 + normalized * 90), 20, 140);
          state.currentNoise = db;
          state.micSamples.push(db);
          gaugeValue.textContent = db;
          updateQuickStats(db);
          drawGauge(gaugeCanvas, db);

          const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
          if (elapsed > state.recordingSecond) {
            state.recordingSecond = elapsed;
            const sec = Math.min(elapsed, 15);
            setLabel('Recording ' + sec + '/15s');
            timerEl.textContent = sec + 's / 15s';
            if (sec % 3 === 0 || sec === 1) {
              state.trendData.push({ time: sec + 's', noise: db });
              if (state.trendData.length > 15) state.trendData.shift();
            }
            if (sec >= 15) {
              finalizeRecording();
              return;
            }
          }

          if (state.recordingStopping) {
            finalizeRecording();
            return;
          }

          state.micAnimFrame = requestAnimationFrame(sample);
        });
      })
      .catch(() => {
        setLabel('Mic denied');
        btn.dataset.recording = 'false';
      });
  }

  function stopRecording() {
    if (state.recordingStopping) return;
    state.recordingStopping = true;
    const btn = document.getElementById('recordBtn');
    btn.classList.remove('recording');
    btn.classList.add('stopping');
    btn.querySelector('i').className = 'fas fa-hourglass-half';
    const sec = Math.min(state.recordingSecond || 0, 15);
    setLabel('Finishing... ' + sec + '/15s');
  }

  function finalizeRecording() {
    const btn = document.getElementById('recordBtn');
    if (state.micAnimFrame) {
      cancelAnimationFrame(state.micAnimFrame);
      state.micAnimFrame = null;
    }
    if (state.micStream) {
      state.micStream.getTracks().forEach(t => t.stop());
      state.micStream = null;
    }
    if (state.audioCtx) {
      state.audioCtx.close().catch(() => {});
      state.audioCtx = null;
      state.analyser = null;
    }
    state.usingMic = false;
    state.recordingPhase = 'done';

    const collected = state.micSamples;
    const finalAvg = collected.length > 0
      ? Math.round(collected.reduce((a, b) => a + b, 0) / collected.length)
      : state.currentNoise;

    setLabel('Avg: ' + finalAvg + ' dB');
    const timerEl = document.querySelector('.record-timer');
    if (timerEl) timerEl.textContent = 'Final: ' + finalAvg + ' dB avg';

    btn.dataset.recording = 'false';
    btn.classList.remove('recording', 'stopping');
    btn.querySelector('i').className = 'fas fa-microphone';

    state.currentNoise = finalAvg;
    state.sourceData = state.lastFreqData ? generateSourceFromFreq(state.lastFreqData) : generateSourceDistribution();
    state.trendData = state.trendData.slice(-15);

    gaugeValue.textContent = finalAvg;
    drawGauge(gaugeCanvas, finalAvg);
    updateQuickStats(finalAvg);
    renderSourceChart();
    renderTrendChart();
    renderAlerts(finalAvg);
  }

  function setLabel(text) {
    const el = document.getElementById('recordLabel');
    if (el) el.textContent = text;
  }

  function getOrCreateTimer() {
    let el = document.querySelector('.record-timer');
    if (!el) {
      el = document.createElement('div');
      el.className = 'record-timer';
      const container = document.querySelector('.noise-gauge-card') || document.getElementById('recordBtn').parentNode;
      document.getElementById('recordBtn').after(el);
    }
    return el;
  }

  function generateSourceFromFreq(data) {
    const len = data.length;
    const bands = {
      traffic: { sum: 0, count: 0 },
      construction: { sum: 0, count: 0 },
      industrial: { sum: 0, count: 0 },
      railway: { sum: 0, count: 0 },
      aircraft: { sum: 0, count: 0 },
      events: { sum: 0, count: 0 },
      gatherings: { sum: 0, count: 0 },
    };
    const bandMap = ['traffic','traffic','construction','construction','industrial','railway','railway','aircraft','aircraft','events','events','gatherings','gatherings','traffic','industrial','events'];
    for (let i = 0; i < len; i++) {
      const idx = Math.floor((i / len) * bandMap.length);
      const key = bandMap[Math.min(idx, bandMap.length - 1)];
      bands[key].sum += data[i];
      bands[key].count++;
    }
    const labels = ['Traffic','Construction','Industrial','Railway','Aircraft','Events','Gatherings'];
    const colors = ['#06B6D4','#F59E0B','#EF4444','#A855F7','#EC4899','#10B981','#F97316'];
    const ids = ['traffic','construction','industrial','railway','aircraft','events','gatherings'];
    const values = ids.map(id => {
      const b = bands[id];
      return b.count > 0 ? Math.round((b.sum / b.count) / 2.55) : randInt(5, 20);
    });
    const total = values.reduce((a, b) => a + b, 0) || 1;
    return ids.map((id, i) => ({
      id, label: labels[i], color: colors[i],
      value: values[i], pct: Math.round((values[i] / total) * 100),
    }));
  }

  function updateQuickStats(db) {
    const peak = Math.max(db, parseInt(document.getElementById('statPeak').textContent) || db);
    const low = Math.min(db, parseInt(document.getElementById('statLow').textContent) || db);
    document.getElementById('statPeak').textContent = peak;
    document.getElementById('statLow').textContent = low;
    document.getElementById('statAvg').textContent = db;
    const riskIdx = getRiskIndex(db);
    document.querySelectorAll('.risk-ring-segment').forEach((seg, i) => {
      seg.classList.toggle('active', i <= riskIdx);
    });
    const risk = getRiskLevel(db);
    const colorMap = [COLORS.emerald, COLORS.amber, COLORS.orange, COLORS.red];
    const iconMap = ['fa-volume-low', 'fa-volume-low', 'fa-volume-high', 'fa-volume-high'];
    const descs = ['Safe levels', 'Caution in traffic areas', 'Health risk on exposure', 'Immediate action needed'];
    document.getElementById('riskStatus').innerHTML =
      '<div class="risk-icon"><i class="fas ' + iconMap[riskIdx] + '" style="color:' + colorMap[riskIdx] + '"></i></div>' +
      '<div class="risk-label" style="color:' + colorMap[riskIdx] + '">' + risk.label + '</div>' +
      '<div class="risk-desc">' + descs[riskIdx] + '</div>';
    document.getElementById('statAlerts').textContent = db > 70 ? Math.floor(db / 10) - 5 : db > 60 ? 2 : db > 50 ? 1 : 0;
  }

  function renderAlerts(db) {
    const list = document.getElementById('alertsList');
    if (!list) return;
    const alerts = [];
    if (db > 70) alerts.push({ type: 'danger', icon: 'fa-bullhorn', loc: 'Your Area', desc: 'High noise: ' + db + ' dB', time: 'now' });
    if (db > 60) alerts.push({ type: 'warning', icon: 'fa-road', loc: 'Nearby Street', desc: 'Traffic noise elevated', time: '1m ago' });
    alerts.push({ type: 'info', icon: 'fa-microchip', loc: 'Mic Sensor', desc: 'Real-time monitoring active', time: 'now' });
    if (db > 50 && db <= 60) alerts.push({ type: 'success', icon: 'fa-check-circle', loc: 'Your Area', desc: 'Noise within safe range: ' + db + ' dB', time: 'now' });
    list.innerHTML = alerts.map(a =>
      '<div class="alert-item ' + a.type + '">' +
        '<div class="alert-icon"><i class="fas ' + a.icon + '"></i></div>' +
        '<div class="alert-info"><span class="alert-location">' + a.loc + '</span><span class="alert-desc">' + a.desc + '</span></div>' +
        '<span class="alert-time">' + a.time + '</span>' +
      '</div>'
    ).join('');
  }

  function initRouteSwap() {
    document.getElementById('routeSwap').addEventListener('click', () => {
      const s = document.getElementById('routeStart');
      const e = document.getElementById('routeEnd');
      const sv = s.value;
      s.value = e.value || 'current';
      e.value = sv;
    });
  }

  function initRouteSelection() {
    document.querySelectorAll('.route-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.route-card').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.route-select-btn').forEach(b => b.textContent = 'Select');
        card.classList.add('active');
        card.querySelector('.route-select-btn').textContent = 'Selected';
      });
    });
  }

  function initRouteFind() {
    document.getElementById('routeFindBtn').addEventListener('click', recalculateRoutes);
  }

  function renderDashboard() {
    drawGauge(gaugeCanvas, state.currentNoise);
    updateDashboardValues();
    renderSourceChart();
    renderTrendChart();
  }

  function updateDashboardValues() {
    const noise = state.currentNoise;
    gaugeValue.textContent = Math.round(noise);
    drawGauge(gaugeCanvas, noise);

    const riskIdx = getRiskIndex(noise);
    document.querySelectorAll('.risk-ring-segment').forEach((seg, i) => {
      seg.classList.toggle('active', i <= riskIdx);
    });

    const risk = getRiskLevel(noise);
    const colorMap = [COLORS.emerald, COLORS.amber, COLORS.orange, COLORS.red];
    const iconMap = ['fa-volume-low', 'fa-volume-low', 'fa-volume-high', 'fa-volume-high'];
    const descs = [
      'Noise levels within safe limits',
      'Caution advised in high-traffic areas',
      'Prolonged exposure may cause health issues',
      'Immediate action recommended',
    ];

    document.getElementById('riskStatus').innerHTML = `
      <div class="risk-icon"><i class="fas ${iconMap[riskIdx]}" style="color:${colorMap[riskIdx]}"></i></div>
      <div class="risk-label" style="color:${colorMap[riskIdx]}">${risk.label}</div>
      <div class="risk-desc">${descs[riskIdx]}</div>
    `;

    const peak = Math.max(...state.hourlyData.map(d => d.noise));
    const low = Math.min(...state.hourlyData.map(d => d.noise));
    const avg = Math.round(state.hourlyData.reduce((a, d) => a + d.noise, 0) / state.hourlyData.length);
    document.getElementById('statPeak').textContent = peak;
    document.getElementById('statLow').textContent = low;
    document.getElementById('statAvg').textContent = avg;
  }

  function renderSourceChart() {
    const ctx = document.getElementById('sourceChart')?.getContext('2d');
    if (!ctx) return;
    if (sourceChartInstance) sourceChartInstance.destroy();

    const data = state.sourceData;
    sourceChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color + 'DD'),
          borderColor: data.map(d => d.color),
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...chartTooltip(),
            callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}%` },
          },
        },
      },
    });

    document.getElementById('sourceLegend').innerHTML = data.map(d =>
      `<span><span class="legend-color" style="background:${d.color}"></span> ${d.label} ${d.pct}%</span>`
    ).join('');
  }

  function renderTrendChart() {
    const ctx = document.getElementById('hourlyChart')?.getContext('2d');
    if (!ctx) return;
    if (hourlyChartInstance) hourlyChartInstance.destroy();
    const data = state.trendData && state.trendData.length > 0 ? state.trendData : state.hourlyData.slice(0, 15);
    hourlyChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((d, i) => (i + 1) + 's'),
        datasets: [{
          data: data.map(d => d.noise),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.15)',
          pointBackgroundColor: '#10b981',
          pointRadius: data.length > 1 ? 2 : 0,
          borderWidth: 2,
          fill: true,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...chartTooltip(), callbacks: { label: ctx => ctx.parsed.y + ' dB' } } },
        scales: {
          x: { grid: { color: getChartGrid(), drawBorder: false }, ticks: { color: getTextMuted(), font: { size: 8 }, maxTicksLimit: 10 } },
          y: { grid: { color: getChartGrid(), drawBorder: false }, ticks: { color: getTextMuted(), font: { size: 8 } }, min: 20, max: 100 },
        },
      },
    });
  }

  function renderForecastChart() {
    const ctx = document.getElementById('forecastChart')?.getContext('2d');
    if (!ctx) return;
    if (forecastChartInstance) forecastChartInstance.destroy();

    const hours = state.forecastPeriod === 'today' ? state.hourlyData
      : generateHourlyData(state.currentNoise + rand(-3, 3));

    const values = hours.map(h => h.noise);
    const getColor = (v) => {
      if (v <= 50) return { bg: 'rgba(16,185,129,0.5)', bd: COLORS.emerald };
      if (v <= 65) return { bg: 'rgba(245,158,11,0.5)', bd: COLORS.amber };
      if (v <= 80) return { bg: 'rgba(249,115,22,0.5)', bd: COLORS.orange };
      return { bg: 'rgba(239,68,68,0.5)', bd: COLORS.red };
    };

    forecastChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours.map(h => h.time),
        datasets: [{
          data: values,
          backgroundColor: values.map(v => getColor(v).bg),
          borderColor: values.map(v => getColor(v).bd),
          borderWidth: 1,
          borderRadius: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...chartTooltip(),
            callbacks: { label: ctx => `${ctx.parsed.y} dB` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: getTextMuted(), font: { size: 8 }, maxTicksLimit: 12 } },
          y: { grid: { color: getChartGrid(), drawBorder: false }, ticks: { color: getTextMuted(), font: { size: 9 } }, min: 20, max: 100 },
        },
      },
    });
  }

  function initForecastTabs() {
    document.querySelectorAll('.forecast-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.forecast-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.forecastPeriod = tab.dataset.period;
        renderForecast();
      });
    });
  }

  function renderForecast() {
    renderForecastTimeline();
    renderForecastChart();
    renderDailyCards();
  }

  function renderForecastTimeline() {
    const container = document.getElementById('forecastTimeline');
    if (!container) return;
    const hours = state.forecastPeriod === 'today' ? state.hourlyData
      : generateHourlyData(state.currentNoise + rand(-3, 3));

    container.innerHTML = hours.map(h => {
      const risk = getRiskLevel(h.noise);
      const pct = clamp(((h.noise - 20) / 100) * 100, 0, 100);
      return `<div class="forecast-hour">
        <span class="fh-time">${h.time}</span>
        <div class="fh-bar-wrap">
          <div class="fh-bar ${risk.id}" style="height:${pct}%"></div>
        </div>
        <span class="fh-label">${h.noise}</span>
      </div>`;
    }).join('');
  }

  function renderDailyCards() {
    const container = document.getElementById('dailyCards');
    if (!container) return;
    const data = state.weeklyData;

    container.innerHTML = data.map(d => {
      const avg = Math.round((d.low + d.high) / 2);
      const risk = getRiskLevel(avg);
      const pct = clamp(((avg - 20) / 100) * 100, 0, 100);
      return `<div class="daily-card" style="${d.today ? 'border:1px solid rgba(6,182,212,0.2);background:rgba(6,182,212,0.05)' : ''}">
        <span class="daily-name">${d.day}${d.today ? ' (Today)' : ''}</span>
        <div class="daily-range">
          <span class="daily-low">${d.low}</span>
          <div class="daily-range-bar">
            <div class="daily-range-fill ${risk.id}" style="width:${pct}%"></div>
          </div>
          <span class="daily-high">${d.high}</span>
        </div>
      </div>`;
    }).join('');
  }

  function initMap() {
    const container = document.getElementById('noiseMap');
    if (!container || typeof L === 'undefined') return;

    mapInstance = L.map('noiseMap', {
      center: [state.lat || 40.7128, state.lng || -74.0060],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance);

    state.hotspots.forEach(h => {
      const radius = 50 + h.intensity * 150;
      const color = h.intensity > 0.7 ? COLORS.red : h.intensity > 0.5 ? COLORS.orange : h.intensity > 0.3 ? COLORS.amber : COLORS.emerald;
      L.circle([h.lat, h.lng], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.12 + h.intensity * 0.25,
        weight: 1,
        opacity: 0.4,
      }).addTo(mapInstance).bindPopup(`<b>${h.name}</b><br>Noise: ${h.noise} dB`);

      L.circleMarker([h.lat, h.lng], {
        radius: 3 + h.intensity * 4,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 1,
      }).addTo(mapInstance);
    });

    const sensitiveZones = [
      { name: 'PS 321 School', lat: 40.718, lng: -73.995, type: 'school', iconColor: '#06B6D4', icon: 'fa-school' },
      { name: 'NYU Langone Hospital', lat: 40.742, lng: -73.974, type: 'hospital', iconColor: '#EF4444', icon: 'fa-hospital' },
      { name: 'NY Public Library', lat: 40.752, lng: -73.982, type: 'library', iconColor: '#F59E0B', icon: 'fa-book' },
      { name: 'Columbia University', lat: 40.807, lng: -73.962, type: 'school', iconColor: '#06B6D4', icon: 'fa-school' },
      { name: 'Mount Sinai Hospital', lat: 40.790, lng: -73.952, type: 'hospital', iconColor: '#EF4444', icon: 'fa-hospital' },
      { name: 'Brooklyn Public Library', lat: 40.672, lng: -73.968, type: 'library', iconColor: '#F59E0B', icon: 'fa-book' },
    ];

    sensitiveZones.forEach(z => {
      const markerIcon = L.divIcon({
        html: `<i class="fas ${z.icon}" style="color:${z.iconColor};font-size:18px;text-shadow:0 0 8px ${z.iconColor}44"></i>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([z.lat, z.lng], { icon: markerIcon })
        .addTo(mapInstance)
        .bindPopup(`<b>${z.name}</b><br>Protected Zone`);
    });

    document.querySelectorAll('.map-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('mapHotspots').textContent = state.hotspots.length;
    document.getElementById('mapMax').textContent = Math.max(...state.hotspots.map(h => h.noise)) + ' dB';
    document.getElementById('mapSensors').textContent = '156';

    if (state.lat && state.lng) {
      userMarker = L.circleMarker([state.lat, state.lng], {
        radius: 6, color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.8, weight: 2,
      }).addTo(mapInstance).bindPopup('<b>You are here</b>');
      mapInstance.setView([state.lat, state.lng], 13);
    }

    setTimeout(() => mapInstance.invalidateSize(), 300);
  }

  function initBuildingAdvisor() {
    ['buildingType', 'buildingFloors', 'buildingProximity'].forEach(id => {
      document.getElementById(id).addEventListener('change', renderBuildingAdvisor);
    });
  }

  function renderBuildingAdvisor() {
    const type = document.getElementById('buildingType').value;
    const floors = document.getElementById('buildingFloors').value;
    const proximity = document.getElementById('buildingProximity').value;
    const noise = calculateBuildingNoise(type, floors, proximity);

    document.getElementById('buildingCurrentNoise').textContent = Math.round(noise) + ' dB';

    const recs = generateRecommendations(type, noise);
    document.getElementById('recsList').innerHTML = recs.map(r =>
      `<div class="rec-item">
        <div class="rec-icon" style="background:${r.color}22;color:${r.color}">
          <i class="fas ${r.icon}"></i>
        </div>
        <div>
          <div class="rec-name">${r.name}</div>
          <div class="rec-desc">${r.desc}</div>
          <div class="rec-meta">
            <span><i class="fas fa-tag"></i> ${r.cost}</span>
            <span><i class="fas fa-wrench"></i> ${r.difficulty}</span>
            <span><i class="fas fa-chart-line"></i> ${r.roi}</span>
          </div>
        </div>
        <div class="rec-reduction">-${r.reduction} dB</div>
      </div>`
    ).join('');
  }

  function initLegacyToggle() {
    const btn = document.getElementById('legacyToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const wasLegacy = document.body.classList.contains('legacy');
      document.body.classList.toggle('legacy');
      btn.classList.toggle('active');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = wasLegacy ? 'fas fa-paint-roller' : 'fas fa-palette';
      }
      btn.querySelector('span').textContent = wasLegacy ? 'Legacy' : 'Caldera';

      if (document.body.classList.contains('legacy')) {
        document.getElementById('logoImage').src = 'BlueNoiseDNA.png';
      } else {
        document.getElementById('logoImage').src = 'NoiseDNA.png';
      }
      reRenderThemeDependent();
    });
  }

  const COUNTRIES = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan',
    'Brazil', 'India', 'China', 'Mexico', 'Spain', 'Italy', 'Netherlands', 'Sweden',
    'Norway', 'Denmark', 'Finland', 'South Korea', 'Singapore', 'New Zealand', 'Ireland',
    'Switzerland', 'Austria', 'Belgium', 'Portugal', 'Greece', 'Poland', 'Turkey',
    'Argentina', 'Chile', 'Colombia', 'Egypt', 'Nigeria', 'South Africa', 'Morocco',
    'Saudi Arabia', 'UAE', 'Israel', 'Russia', 'Ukraine', 'Thailand', 'Vietnam',
    'Philippines', 'Indonesia', 'Malaysia', 'Other',
  ];

  function initAuth(container) {
    const overlay = document.createElement('div');
    overlay.className = 'auth-modal-overlay';
    overlay.id = 'authOverlay';
    overlay.innerHTML = `
      <div class="auth-modal">
        <h2 id="authTitle">Sign In</h2>
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="authUsername" placeholder="Choose a username" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="authPassword" placeholder="Password" />
        </div>
        <div class="form-group" id="authCountryGroup" style="display:none">
          <label>Country</label>
          <select id="authCountry">
            ${COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <button class="auth-btn" id="authBtn">Sign In</button>
        <div class="auth-switch">
          <span id="authSwitchText">Don't have an account? </span>
          <a id="authSwitchLink">Sign Up</a>
        </div>
        <div class="auth-error" id="authError"></div>
      </div>
    `;
    container.appendChild(overlay);
  }

  function openAuth() {
    const overlay = document.getElementById('authOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authError').textContent = '';
    setAuthMode('login');
  }

  function closeAuth() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authBtn');
    const link = document.getElementById('authSwitchLink');
    const cg = document.getElementById('authCountryGroup');
    const st = document.getElementById('authSwitchText');
    if (mode === 'signup') {
      title.textContent = 'Sign Up';
      btn.textContent = 'Create Account';
      link.textContent = 'Sign In';
      st.textContent = 'Already have an account? ';
      cg.style.display = 'block';
    } else {
      title.textContent = 'Sign In';
      btn.textContent = 'Sign In';
      link.textContent = 'Sign Up';
      st.textContent = 'Don\'t have an account? ';
      cg.style.display = 'none';
    }
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem('noisedna_users') || '{}'); } catch { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem('noisedna_users', JSON.stringify(users));
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('noisedna_current_user') || 'null'); } catch { return null; }
  }

  function saveCurrentUser(user) {
    if (user) localStorage.setItem('noisedna_current_user', JSON.stringify(user));
    else localStorage.removeItem('noisedna_current_user');
  }

  function initAuthHandlers() {
    const overlay = document.getElementById('authOverlay');
    if (!overlay) return;

    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeAuth();
    });

    document.getElementById('authBtn').addEventListener('click', () => {
      const username = document.getElementById('authUsername').value.trim();
      const password = document.getElementById('authPassword').value;
      const err = document.getElementById('authError');

      if (!username || !password) {
        err.textContent = 'Please fill in all fields';
        return;
      }

      if (state.authMode === 'signup') {
        const country = document.getElementById('authCountry').value;
        const users = getUsers();
        if (users[username]) {
          err.textContent = 'Username already exists';
          return;
        }
        if (password.length < 4) {
          err.textContent = 'Password must be at least 4 characters';
          return;
        }
        users[username] = { username, password, country };
        saveUsers(users);
        const user = { username, country };
        saveCurrentUser(user);
        state.currentUser = user;
        closeAuth();
        renderUserBadge();
        renderCommunityPosts();
      } else {
        const users = getUsers();
        const u = users[username];
        if (!u || u.password !== password) {
          err.textContent = 'Invalid username or password';
          return;
        }
        const user = { username: u.username, country: u.country };
        saveCurrentUser(user);
        state.currentUser = user;
        closeAuth();
        renderUserBadge();
        renderCommunityPosts();
      }
    });

    document.getElementById('authSwitchLink').addEventListener('click', () => {
      setAuthMode(state.authMode === 'signup' ? 'login' : 'signup');
      document.getElementById('authError').textContent = '';
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAuth();
    });
  }

  function logoutUser() {
    saveCurrentUser(null);
    state.currentUser = null;
    renderUserBadge();
  }

  function renderUserBadge() {
    const container = document.getElementById('sidebarUserBadge');
    if (!container) return;
    const user = state.currentUser;
    if (user) {
      const flag = getCountryFlag(user.country);
      container.innerHTML = `
        <div class="user-badge">
          <span class="user-badge-avatar">${user.username.charAt(0).toUpperCase()}</span>
          <div class="user-badge-info">
            <div class="user-badge-name">${user.username}</div>
            <div class="user-badge-country">${flag} ${user.country}</div>
          </div>
          <button class="user-badge-logout" id="logoutBtn" title="Sign Out"><i class="fas fa-sign-out-alt"></i></button>
        </div>
      `;
      document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);
    } else {
      container.innerHTML = `
        <button class="auth-signin-btn" id="showAuthBtn">
          <i class="fas fa-user-plus"></i>
          <span>Sign In / Register</span>
        </button>
      `;
      document.getElementById('showAuthBtn')?.addEventListener('click', openAuth);
    }
  }

  function getCountryFlag(country) {
    const flags = {
      'United States': '🇺🇸', 'United Kingdom': '🇬🇧', 'Canada': '🇨🇦', 'Australia': '🇦🇺',
      'Germany': '🇩🇪', 'France': '🇫🇷', 'Japan': '🇯🇵', 'Brazil': '🇧🇷', 'India': '🇮🇳',
      'China': '🇨🇳', 'Mexico': '🇲🇽', 'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱',
      'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮', 'South Korea': '🇰🇷',
      'Singapore': '🇸🇬', 'New Zealand': '🇳🇿', 'Ireland': '🇮🇪', 'Switzerland': '🇨🇭',
      'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Portugal': '🇵🇹', 'Greece': '🇬🇷', 'Poland': '🇵🇱',
      'Turkey': '🇹🇷', 'Argentina': '🇦🇷', 'Chile': '🇨🇱', 'Colombia': '🇨🇴', 'Egypt': '🇪🇬',
      'Nigeria': '🇳🇬', 'South Africa': '🇿🇦', 'Morocco': '🇲🇦', 'Saudi Arabia': '🇸🇦',
      'UAE': '🇦🇪', 'Israel': '🇮🇱', 'Russia': '🇷🇺', 'Ukraine': '🇺🇦', 'Thailand': '🇹🇭',
      'Vietnam': '🇻🇳', 'Philippines': '🇵🇭', 'Indonesia': '🇮🇩', 'Malaysia': '🇲🇾',
    };
    return flags[country] || '🌍';
  }

  function initCommunity() {
    const container = document.getElementById('communityPosts');
    if (!container) return;

    state.currentUser = getCurrentUser();
    state.communityPosts = [
      { id: 1, user: 'QuietNYC', avatar: 'Q', country: 'United States', time: '2h ago', title: 'Best quiet spots in NYC', content: 'I\'ve been mapping the quietest corners of Manhattan. The Roof Garden at the Met and Greenacre Park consistently measure under 50 dB even at noon.', votes: 24, comments: 8 },
      { id: 2, user: 'BrooklynNoiseWatch', avatar: 'B', country: 'United States', time: '5h ago', title: 'Construction noise complaint — Atlantic Ave', content: 'Jackhammering since 6 AM at Atlantic Ave development site. Readings hitting 92 dB near the fence. Past the legal limit of 85 dB.', votes: 42, comments: 15 },
      { id: 3, user: 'GreenBarrierFan', avatar: 'G', country: 'Canada', time: '1d ago', title: 'Green barrier success story — Hudson Yards', content: 'Mixed vegetation barrier along the High Line extension has reduced street-level noise by 7 dB! Before: 74 dB, After: 67 dB.', votes: 31, comments: 12 },
      { id: 4, user: 'WeekendWarrior', avatar: 'W', country: 'United Kingdom', time: '2d ago', title: 'Weekend noise levels are surprisingly low', content: 'Sunday mornings between 6-9 AM average 48 dB across most residential zones. 15 dB lower than weekday averages.', votes: 18, comments: 6 },
      { id: 5, user: 'DataNoiseLab', avatar: 'D', country: 'Germany', time: '3d ago', title: 'Traffic diversion impact on noise — FDR Drive', content: 'After last month\'s FDR Drive lane closure, noise levels along the East River Promenade dropped by 9 dB during peak hours.', votes: 27, comments: 10 },
    ];

    initAuth(document.body);
    initAuthHandlers();
    renderUserBadge();
    renderCommunityPosts();

    container.addEventListener('click', e => {
      const btn = e.target.closest('.post-vote');
      if (!btn) return;
      const post = btn.closest('.post-card');
      const count = post.querySelector('.vote-count');
      let val = parseInt(count.textContent);
      if (btn.classList.contains('post-upvote')) {
        if (btn.classList.contains('upvoted')) { val--; btn.classList.remove('upvoted'); }
        else { val++; btn.classList.add('upvoted'); post.querySelector('.post-downvote')?.classList.remove('downvoted'); }
      } else {
        if (btn.classList.contains('downvoted')) { val++; btn.classList.remove('downvoted'); }
        else { val--; btn.classList.add('downvoted'); post.querySelector('.post-upvote')?.classList.remove('upvoted'); }
      }
      count.textContent = val;
    });
  }

  function renderCommunityPosts() {
    const container = document.getElementById('communityPosts');
    if (!container) return;
    const posts = state.communityPosts || [];
    const user = state.currentUser;
    const flag = user ? getCountryFlag(user.country) : '';

    container.innerHTML = posts.map(p => {
      const pFlag = getCountryFlag(p.country);
      return `<div class="card post-card retro-window" data-id="${p.id}">
        <div class="post-header">
          <span class="post-avatar" style="background:var(--accent);color:var(--text-on-accent)">${p.avatar}</span>
          <span class="post-user">${p.user}</span>
          <span class="post-country">${pFlag}</span>
          <span class="post-time">${p.time}</span>
        </div>
        <div class="post-content">
          <h4>${p.title}</h4>
          <p>${p.content}</p>
        </div>
        <div class="post-actions">
          <button class="post-vote post-upvote"><i class="fas fa-arrow-up"></i><span class="vote-count">${p.votes}</span></button>
          <button class="post-vote post-downvote"><i class="fas fa-arrow-down"></i></button>
          <span class="post-comments"><i class="fas fa-comment"></i> ${p.comments} comments</span>
        </div>
      </div>`;
    }).join('');
  }

  function initReports() {
    state.reports = [
      { id: 1, location: 'Times Square, NYC', type: 'noise', severity: 'high', desc: 'Extreme noise levels from street performers and construction — measured 98 dB near the TKTS booth.', time: '2h ago' },
      { id: 2, location: 'Central Park, NYC', type: 'temperature', severity: 'medium', desc: 'Heat island effect near the ballfields. Surface temp 108°F while ambient is 92°F.', time: '5h ago' },
      { id: 3, location: 'Lower Manhattan', type: 'airquality', severity: 'medium', desc: 'AQI reading 85 near the Holland Tunnel exit — moderate but spiking during rush hours.', time: '8h ago' },
      { id: 4, location: 'Brooklyn Bridge Walkway', type: 'vibration', severity: 'low', desc: 'Noticeable vibration during heavy pedestrian traffic. Within normal range.', time: '1d ago' },
    ];

    const form = document.getElementById('reportForm');
    const list = document.getElementById('reportsList');

    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const loc = document.getElementById('reportLocation').value;
        const type = document.getElementById('reportType').value;
        const desc = document.getElementById('reportDescription').value;
        const severity = document.getElementById('reportSeverity').value;
        if (!type || !loc || !desc) return;
        state.reports.unshift({
          id: Date.now(),
          location: loc,
          type: type,
          severity: severity,
          desc: desc,
          time: 'Just now',
        });
        renderReports();
        form.reset();
      });
    }

    renderReports();

    function renderReports() {
      if (!list) return;
      list.innerHTML = state.reports.map(r => `
        <div class="report-item severity-${r.severity}">
          <div class="report-item-header">
            <span class="report-type-badge ${r.type}"><i class="fas ${r.type === 'noise' ? 'fa-volume-up' : r.type === 'temperature' ? 'fa-temperature-high' : r.type === 'airquality' ? 'fa-wind' : r.type === 'vibration' ? 'fa-triangle-exclamation' : 'fa-circle'}"></i> ${r.type.charAt(0).toUpperCase() + r.type.slice(1)}</span>
            <span class="report-item-severity ${r.severity}">${r.severity.charAt(0).toUpperCase() + r.severity.slice(1)}</span>
            <span class="report-item-location"><i class="fas fa-location-dot"></i> ${r.location}</span>
          </div>
          <div class="report-item-desc">${r.desc}</div>
          <span class="report-item-time">Submitted ${r.time}</span>
        </div>
      `).join('');
    }
  }

  const SENSITIVE_ZONE_DATA = [
    { id: 'school-1', name: 'PS 321 School', type: 'school', lat: 40.718, lng: -73.995, baseNoise: 62 },
    { id: 'hospital-1', name: 'NYU Langone Hospital', type: 'hospital', lat: 40.742, lng: -73.974, baseNoise: 58 },
    { id: 'library-1', name: 'NY Public Library', type: 'library', lat: 40.752, lng: -73.982, baseNoise: 48 },
    { id: 'school-2', name: 'Columbia University', type: 'school', lat: 40.807, lng: -73.962, baseNoise: 60 },
    { id: 'hospital-2', name: 'Mount Sinai Hospital', type: 'hospital', lat: 40.790, lng: -73.952, baseNoise: 55 },
    { id: 'library-2', name: 'Brooklyn Public Library', type: 'library', lat: 40.672, lng: -73.968, baseNoise: 45 },
  ];

  function initSensitiveZoneMonitor() {
    renderSensitiveZones();
    setInterval(renderSensitiveZones, 30000);
  }

  function renderSensitiveZones() {
    const zones = SENSITIVE_ZONE_DATA;
    const hour = new Date().getHours();
    let timeFactor;
    if (hour >= 7 && hour < 10) timeFactor = 1.2;
    else if (hour >= 10 && hour < 16) timeFactor = 1.0;
    else if (hour >= 16 && hour < 20) timeFactor = 1.15;
    else if (hour >= 20 && hour < 23) timeFactor = 0.9;
    else timeFactor = 0.6;

    const typeMap = {
      'school': { cards: ['PS 321 School', 'Columbia University'], name: 'NYC Public Schools', icon: 'fa-school', color: '#06B6D4' },
      'hospital': { cards: ['NYU Langone Hospital', 'Mount Sinai Hospital'], name: 'NYC Hospitals', icon: 'fa-hospital', color: '#EF4444' },
      'library': { cards: ['NY Public Library', 'Brooklyn Public Library'], name: 'NYPL Branches', icon: 'fa-book', color: '#F59E0B' },
    };

    Object.keys(typeMap).forEach(type => {
      const t = typeMap[type];
      const zoneZones = zones.filter(z => t.cards.includes(z.name));
      const avgBase = zoneZones.length > 0 ? zoneZones.reduce((a, z) => a + z.baseNoise, 0) / zoneZones.length : 50;
      const noise = Math.round(avgBase * timeFactor * (0.9 + Math.random() * 0.2));
      const risk = getRiskLevel(noise);

      const riskLabels = { quiet: 'Low', moderate: 'Moderate', loud: 'High', dangerous: 'Critical' };
      const riskBadges = { quiet: 'low', moderate: 'moderate', loud: 'high', dangerous: 'high' };
      const riskClass = riskBadges[risk.id] || 'moderate';

      const zoneCard = document.querySelector(`.zone-card.${type}`);
      if (!zoneCard) return;
      zoneCard.querySelector('.z-val').textContent = noise + ' dB';
      zoneCard.querySelector('.z-val').className = 'z-val zone-' + (noise > 70 ? 'loud' : noise > 55 ? 'moderate' : 'quiet');
      const badge = zoneCard.querySelector('.z-badge');
      if (badge) {
        badge.textContent = riskLabels[risk.id] || 'Moderate';
        badge.className = 'z-badge ' + riskClass;
      }
    });
  }

  function setOrganisation(name) {
    const subtitle = document.getElementById('orgSubtitle');
    const sidebarOrg = document.getElementById('sidebarOrg');
    if (subtitle) subtitle.textContent = name;
    if (sidebarOrg) sidebarOrg.textContent = name;
  }

  function setLogoSize(size) {
    const img = document.getElementById('logoImage');
    if (!img) return;
    img.classList.remove('logo-sm', 'logo-lg');
    if (size === 'sm') img.classList.add('logo-sm');
    else if (size === 'lg') img.classList.add('logo-lg');
  }

  function setLogoSrc(url) {
    const img = document.getElementById('logoImage');
    if (img) img.src = url;
  }

  window.NoiseDNA = window.NoiseDNA || {};
  Object.assign(window.NoiseDNA, { setOrganisation, setLogoSize, setLogoSrc });

  document.addEventListener('DOMContentLoaded', init);

})();
