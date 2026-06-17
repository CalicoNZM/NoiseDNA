const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const COLORS = { cyan: '#06B6D4', emerald: '#10B981', amber: '#F59E0B', orange: '#F97316', red: '#EF4444', purple: '#A855F7', pink: '#EC4899' };

const RISK_LEVELS = [
  { id: 'quiet', max: 50, label: 'Quiet', color: COLORS.emerald, icon: 'fa-volume-low' },
  { id: 'moderate', max: 65, label: 'Moderate', color: COLORS.amber, icon: 'fa-volume-low' },
  { id: 'loud', max: 80, label: 'Loud', color: COLORS.orange, icon: 'fa-volume-high' },
  { id: 'dangerous', max: 140, label: 'Dangerous', color: COLORS.red, icon: 'fa-volume-high' },
];

function getRiskIndex(noise) {
  if (noise <= 50) return 0;
  if (noise <= 65) return 1;
  if (noise <= 80) return 2;
  return 3;
}

function generateHourlyData(baseNoise) {
  const data = [];
  for (let h = 0; h < 24; h++) {
    let n = baseNoise + Math.sin((h / 24) * Math.PI * 2) * 8;
    if (h >= 7 && h <= 9) n += rand(6, 12);
    if (h >= 16 && h <= 19) n += rand(8, 14);
    if (h >= 22 || h <= 5) n -= rand(6, 12);
    data.push({ hour: h, noise: clamp(Math.round(n * 10) / 10, 20, 140) });
  }
  return data;
}

function generateSourceDistribution() {
  const sources = ['traffic', 'construction', 'industrial', 'railway', 'aircraft', 'events', 'gatherings'];
  const labels = ['Traffic', 'Construction', 'Industrial', 'Railway', 'Aircraft', 'Events', 'Public Gatherings'];
  const colors = ['#06B6D4', '#F59E0B', '#EF4444', '#A855F7', '#EC4899', '#10B981', '#F97316'];
  const values = sources.map(() => Math.round(rand(5, 30)));
  const total = values.reduce((a, b) => a + b, 0);
  return sources.map((s, i) => ({
    id: s, label: labels[i], color: colors[i],
    value: values[i], pct: Math.round((values[i] / total) * 1000) / 10
  }));
}

function generateWeeklyData(baseNoise) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  return days.map((day, i) => {
    const isToday = i === today;
    const low = Math.round(baseNoise + rand(-8, -2) + (i >= 5 ? -rand(2, 5) : 0));
    const high = Math.round(baseNoise + rand(4, 10) + (i >= 5 ? -rand(3, 6) : 0));
    return { day, low: clamp(low, 20, 140), high: clamp(high, 20, 140), today: isToday };
  });
}

function generateHotspots() {
  const data = [];
  const zones = ['Downtown', 'Midtown', 'Upper East', 'Upper West', 'Harlem', 'Brooklyn Heights', 'Williamsburg', 'Astoria', 'Long Island City', 'Park Slope', 'Chelsea', 'SoHo', 'Greenwich Village', 'East Village', 'Financial District'];
  const types = ['traffic', 'construction', 'events', 'gatherings', 'railway'];
  for (let i = 0; i < 30; i++) {
    const noise = randInt(48, 95);
    const type = types[randInt(0, types.length - 1)];
    data.push({
      id: i,
      name: `${zones[i % zones.length]} ${['Junction', 'Square', 'Plaza', 'Station', 'Market', 'Crossing', 'Center', 'Hub'][randInt(0, 7)]}`,
      lat: 40.7128 + rand(-0.05, 0.05),
      lng: -74.0060 + rand(-0.05, 0.05),
      noise: Math.round(noise * 10) / 10,
      type,
      risk: RISK_LEVELS[getRiskIndex(noise)].id,
    });
  }
  return data;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', theme: 'Caldera' });
});

app.get('/api/noise/current', (req, res) => {
  const noise = randInt(58, 72);
  const riskIdx = getRiskIndex(noise);
  res.json({
    noise,
    risk: RISK_LEVELS[riskIdx],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/noise/hourly', (req, res) => {
  const base = parseInt(req.query.base) || randInt(58, 72);
  res.json({ data: generateHourlyData(base) });
});

app.get('/api/noise/forecast', (req, res) => {
  const base = parseInt(req.query.base) || randInt(58, 72);
  res.json({ data: generateWeeklyData(base) });
});

app.get('/api/noise/sources', (req, res) => {
  res.json({ data: generateSourceDistribution() });
});

app.get('/api/noise/hotspots', (req, res) => {
  res.json({ data: generateHotspots() });
});

app.get('/api/noise/zones', (req, res) => {
  const zones = [
    { id: 'schools', name: 'Schools', icon: 'fa-school', iconColor: '#10B981', noise: randInt(48, 62), description: 'Educational zones requiring low noise for optimal learning' },
    { id: 'hospitals', name: 'Hospitals', icon: 'fa-hospital', iconColor: '#06B6D4', noise: randInt(42, 55), description: 'Healthcare facilities needing quiet environments for patient recovery' },
    { id: 'libraries', name: 'Libraries', icon: 'fa-book', iconColor: '#A855F7', noise: randInt(38, 50), description: 'Quiet study and research spaces' },
  ];
  res.json({ data: zones.map(z => ({ ...z, risk: RISK_LEVELS[getRiskIndex(z.noise)].id })) });
});

app.post('/api/barrier/simulate', (req, res) => {
  const { type, height, width, density, distance, initialNoise } = req.body;
  let base = 3;
  if (type === 'trees') base = 3;
  else if (type === 'hedges') base = 5;
  else if (type === 'mixed') base = 6;
  else if (type === 'vertical') base = 4;

  const hf = Math.log2(Math.max(height, 1) + 1) * 1.5;
  const wf = Math.sqrt(width) * 1.2;
  const df = (density / 100) * 4;
  const distF = Math.log10(Math.max(distance, 1) + 1) * 2;
  const initF = ((initialNoise - 50) / 30) * 1.5;

  const reduction = Math.round((base + hf + wf + df + distF + initF) * 10) / 10;
  const finalNoise = clamp(Math.round((initialNoise - reduction) * 10) / 10, 20, 140);
  const actualReduction = Math.round((initialNoise - finalNoise) * 10) / 10;
  const pct = Math.round((actualReduction / initialNoise) * 1000) / 10;
  const loudness = actualReduction >= 15 ? '75% quieter' : actualReduction >= 10 ? '50% quieter' : actualReduction >= 5 ? '30% quieter' : '<10% quieter';
  const effectiveness = actualReduction >= 12 ? 'Very High' : actualReduction >= 8 ? 'High' : actualReduction >= 4 ? 'Moderate' : 'Low';

  res.json({ reduction: actualReduction, finalNoise, pct, loudness, effectiveness });
});

app.post('/api/planner/simulate', (req, res) => {
  const interventions = req.body;
  const tr = (interventions.trees / 1000) * 4;
  const wr = (interventions.walls / 20) * 8;
  const br = (interventions.bikes / 50) * 2;
  const tfr = (interventions.traffic / 40) * 6;
  const rr = (interventions.roofs / 100) * 3;
  const total = tr + wr + br + tfr + rr;
  const before = 78;
  const after = clamp(Math.round(before - total), 20, 140);
  const population = Math.round(50000 + (total / 20) * 400000);
  const cost = Math.round((0.5 + (interventions.trees / 1000) * 1.2 + (interventions.walls / 20) * 3 + (interventions.bikes / 50) * 0.5 + (interventions.traffic / 40) * 2 + (interventions.roofs / 100) * 1.5) * 10) / 10;

  res.json({
    before, after, reduction: Math.round(total * 10) / 10,
    population, cost, costPerDb: total > 0 ? Math.round((cost / total) * 100) / 100 : 0,
    contributions: [
      { label: 'Tree Planting', value: Math.round(tr * 10) / 10, color: '#10B981' },
      { label: 'Noise Barriers', value: Math.round(wr * 10) / 10, color: '#06B6D4' },
      { label: 'Bike Lanes', value: Math.round(br * 10) / 10, color: '#A855F7' },
      { label: 'Traffic Diversion', value: Math.round(tfr * 10) / 10, color: '#F59E0B' },
      { label: 'Green Roofs', value: Math.round(rr * 10) / 10, color: '#EC4899' },
    ],
  });
});

app.post('/api/routes/find', (req, res) => {
  const { start, end } = req.body;
  const routes = [
    { id: 'fastest', name: 'Fastest Route', time: '18 min', distance: '4.2 km', noise: 72, score: 72, traffic: 6 },
    { id: 'balanced', name: 'Balanced Route', time: '24 min', distance: '3.8 km', noise: 58, score: 58, traffic: 3 },
    { id: 'quietest', name: 'Quietest Route', time: '32 min', distance: '4.8 km', noise: 42, score: 42, traffic: 1 },
  ];
  res.json({ routes, start, end });
});

app.post('/api/advisor/recommendations', (req, res) => {
  const { buildingType, noise } = req.body;
  const recDB = {
    school: [
      { name: 'Acoustic Wall Panels', desc: 'Install NRC 0.85 panels in classrooms and corridors', reduction: 8, icon: 'fa-table-cells', color: '#06B6D4' },
      { name: 'Green Roof', desc: 'Extensive green roof with sedum for sound absorption', reduction: 6, icon: 'fa-leaf', color: '#10B981' },
      { name: 'Tree Barrier', desc: 'Double-row deciduous trees along property line', reduction: 5, icon: 'fa-tree', color: '#F59E0B' },
    ],
    hospital: [
      { name: 'Acoustic Wall Panels', desc: 'Hospital-grade soundproofing for patient rooms', reduction: 10, icon: 'fa-table-cells', color: '#06B6D4' },
      { name: 'Noise Barrier Wall', desc: '4m high barrier near emergency entrance', reduction: 15, icon: 'fa-grip', color: '#EF4444' },
      { name: 'Soundproof Windows', desc: 'STC 45 rated windows for ICU wing', reduction: 8, icon: 'fa-window-maximize', color: '#A855F7' },
    ],
    office: [
      { name: 'Acoustic Ceiling Tiles', desc: 'Suspended acoustic ceiling for open-plan offices', reduction: 6, icon: 'fa-square', color: '#06B6D4' },
      { name: 'Sound Masking System', desc: 'Adaptive sound masking for privacy', reduction: 4, icon: 'fa-waveform', color: '#10B981' },
      { name: 'Green Wall', desc: 'Living wall system on exterior facade', reduction: 5, icon: 'fa-seedling', color: '#F59E0B' },
    ],
    residential: [
      { name: 'Double Glazing', desc: 'STC 35 rated double-glazed windows', reduction: 8, icon: 'fa-window-maximize', color: '#06B6D4' },
      { name: 'Green Roof', desc: 'Extensive green roof system', reduction: 5, icon: 'fa-leaf', color: '#10B981' },
      { name: 'Garden Barrier', desc: 'Dense hedge planting along boundary', reduction: 4, icon: 'fa-tree', color: '#F59E0B' },
    ],
    library: [
      { name: 'Acoustic Panels', desc: 'Sound-absorbing panels for reading areas', reduction: 10, icon: 'fa-table-cells', color: '#06B6D4' },
      { name: 'Carpet Installation', desc: 'High-density acoustic carpeting', reduction: 4, icon: 'fa-fill', color: '#10B981' },
      { name: 'Window Sealing', desc: 'Professional acoustic window sealing', reduction: 6, icon: 'fa-window-maximize', color: '#A855F7' },
    ],
  };
  const recs = recDB[buildingType] || recDB.school;
  const adjusted = recs.map(r => ({
    ...r,
    reduction: Math.round(r.reduction * (noise / 65)),
  }));
  res.json({ recommendations: adjusted, buildingType, noise });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`NoiseDNA API running at http://localhost:${PORT}`);
});
