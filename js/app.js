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

  function generateSourceDistribution(baseNoise) {
    const hour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());
    let trafficRange, constrRange, eventsRange, indusRange, railRange, aircraftRange, gatherRange;

    if (hour >= 7 && hour <= 9) {
      trafficRange = [40, 50]; constrRange = [10, 18]; indusRange = [5, 10];
      railRange = [8, 15]; aircraftRange = [5, 8]; eventsRange = [2, 5]; gatherRange = [2, 5];
    } else if (hour >= 11 && hour <= 14) {
      trafficRange = [15, 25]; constrRange = [25, 35]; indusRange = [10, 18];
      railRange = [5, 10]; aircraftRange = [5, 10]; eventsRange = [5, 10]; gatherRange = [5, 10];
    } else if (hour >= 17 && hour <= 19) {
      trafficRange = [40, 50]; constrRange = [8, 15]; indusRange = [5, 10];
      railRange = [8, 12]; aircraftRange = [5, 8]; eventsRange = [5, 10]; gatherRange = [5, 8];
    } else if (hour >= 23 || hour < 5) {
      trafficRange = [18, 25]; constrRange = [2, 5]; indusRange = [15, 20];
      railRange = [3, 8]; aircraftRange = [2, 5]; eventsRange = [1, 3]; gatherRange = [1, 3];
    } else if (isWeekend && hour >= 20) {
      trafficRange = [15, 25]; constrRange = [2, 5]; indusRange = [5, 10];
      railRange = [3, 8]; aircraftRange = [2, 5]; eventsRange = [20, 30]; gatherRange = [15, 25];
    } else {
      trafficRange = [22, 32]; constrRange = [15, 25]; indusRange = [8, 15];
      railRange = [5, 12]; aircraftRange = [3, 8]; eventsRange = [3, 8]; gatherRange = [3, 8];
    }

    const ids = ['traffic','construction','industrial','railway','aircraft','events','gatherings'];
    const ranges = [trafficRange, constrRange, indusRange, railRange, aircraftRange, eventsRange, gatherRange];
    const sources = ids.map((id, i) => ({
      id, label: NOISE_SOURCE_LABELS[i].label, color: NOISE_SOURCE_LABELS[i].color,
      value: randInt(ranges[i][0], ranges[i][1]),
    }));
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

  const CASE_STUDIES = {
    'United States': {
      name: 'NYC Case Study', lat: 40.7128, lng: -74.0060, baseNoise: 67, population: 8400000,
      landmarks: {
        'Central Park': [40.7829, -73.9654],
        'Times Square, NYC': [40.7580, -73.9855],
        'Grand Central Terminal': [40.7527, -73.9772],
        'Brooklyn Bridge': [40.7061, -73.9969],
        'Union Square': [40.7359, -73.9911],
        'Wall Street': [40.7074, -74.0113],
        'Madison Square Garden': [40.7505, -73.9934],
        'One World Trade Center': [40.7127, -74.0134],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'PS 321 School', type: 'school', lat: 40.718, lng: -73.995, baseNoise: 62 },
        { id: 'hospital-1', name: 'NYU Langone Hospital', type: 'hospital', lat: 40.742, lng: -73.974, baseNoise: 58 },
        { id: 'library-1', name: 'NY Public Library', type: 'library', lat: 40.752, lng: -73.982, baseNoise: 48 },
        { id: 'school-2', name: 'Columbia University', type: 'school', lat: 40.807, lng: -73.962, baseNoise: 60 },
        { id: 'hospital-2', name: 'Mount Sinai Hospital', type: 'hospital', lat: 40.790, lng: -73.952, baseNoise: 55 },
        { id: 'library-2', name: 'Brooklyn Public Library', type: 'library', lat: 40.672, lng: -73.968, baseNoise: 45 },
      ],
      zoneGroups: {
        school: { cards: ['PS 321 School', 'Columbia University'], name: 'NYC Public Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['NYU Langone Hospital', 'Mount Sinai Hospital'], name: 'NYC Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['NY Public Library', 'Brooklyn Public Library'], name: 'NYPL Branches', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    Belgium: {
      name: 'Brussels Case Study', lat: 50.8503, lng: 4.3517, baseNoise: 58, population: 1200000,
      landmarks: {
        'Grand Place': [50.8467, 4.3525],
        'Atomium': [50.8949, 4.3416],
        'Cinquantenaire Park': [50.8400, 4.3950],
        'European Parliament': [50.8378, 4.3746],
        'Royal Palace': [50.8419, 4.3621],
        'Sablon': [50.8412, 4.3564],
        'Mont des Arts': [50.8431, 4.3578],
        'Place du Luxembourg': [50.8387, 4.3731],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'ULB Solbosch', type: 'school', lat: 50.8126, lng: 4.3821, baseNoise: 55 },
        { id: 'hospital-1', name: 'UZ Brussel', type: 'hospital', lat: 50.8846, lng: 4.3161, baseNoise: 52 },
        { id: 'library-1', name: 'Royal Library of Belgium', type: 'library', lat: 50.8428, lng: 4.3572, baseNoise: 42 },
        { id: 'school-2', name: 'Vrije Universiteit Brussel', type: 'school', lat: 50.8206, lng: 4.3961, baseNoise: 53 },
        { id: 'hospital-2', name: 'Saint-Luc Hospital', type: 'hospital', lat: 50.8537, lng: 4.3461, baseNoise: 50 },
        { id: 'library-2', name: 'Muntpunt Library', type: 'library', lat: 50.8456, lng: 4.3500, baseNoise: 40 },
      ],
      zoneGroups: {
        school: { cards: ['ULB Solbosch', 'Vrije Universiteit Brussel'], name: 'Brussels Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['UZ Brussel', 'Saint-Luc Hospital'], name: 'Brussels Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Royal Library of Belgium', 'Muntpunt Library'], name: 'Brussels Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    Malaysia: {
      name: 'Kuala Lumpur Case Study', lat: 3.1390, lng: 101.6869, baseNoise: 72, population: 1800000,
      landmarks: {
        'Petronas Towers': [3.1579, 101.7121],
        'Merdeka Square': [3.1481, 101.6940],
        'Bukit Bintang': [3.1466, 101.7108],
        'KL Tower': [3.1527, 101.7033],
        'Central Market': [3.1474, 101.6958],
        'KL Sentral': [3.1340, 101.6865],
        'Lake Gardens': [3.1426, 101.6894],
        'Batu Caves': [3.2374, 101.6839],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Malaya', type: 'school', lat: 3.1179, lng: 101.6557, baseNoise: 65 },
        { id: 'hospital-1', name: 'KL General Hospital', type: 'hospital', lat: 3.1735, lng: 101.6980, baseNoise: 62 },
        { id: 'library-1', name: 'KL Public Library', type: 'library', lat: 3.1500, lng: 101.6950, baseNoise: 52 },
        { id: 'school-2', name: 'Taylors University', type: 'school', lat: 3.0645, lng: 101.6141, baseNoise: 63 },
        { id: 'hospital-2', name: 'Pantai Hospital', type: 'hospital', lat: 3.1175, lng: 101.6771, baseNoise: 60 },
        { id: 'library-2', name: 'Perpustakaan Negara', type: 'library', lat: 3.1502, lng: 101.6986, baseNoise: 48 },
      ],
      zoneGroups: {
        school: { cards: ['University of Malaya', 'Taylors University'], name: 'KL Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['KL General Hospital', 'Pantai Hospital'], name: 'KL Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['KL Public Library', 'Perpustakaan Negara'], name: 'KL Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    Kenya: {
      name: 'Nairobi Case Study', lat: -1.2921, lng: 36.8219, baseNoise: 55, population: 4400000,
      landmarks: {
        'Nairobi National Park': [-1.3733, 36.8588],
        'Kenyatta International': [-1.2863, 36.8172],
        'Nairobi CBD': [-1.2864, 36.8236],
        'Westlands': [-1.2667, 36.8118],
        'Karen': [-1.3315, 36.7200],
        'Giraffe Centre': [-1.3818, 36.7445],
        'Bomas of Kenya': [-1.3740, 36.7470],
        'KICC': [-1.2869, 36.8219],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Nairobi', type: 'school', lat: -1.2794, lng: 36.8163, baseNoise: 50 },
        { id: 'hospital-1', name: 'Kenyatta National Hospital', type: 'hospital', lat: -1.2977, lng: 36.8036, baseNoise: 48 },
        { id: 'library-1', name: 'McMillan Memorial Library', type: 'library', lat: -1.2847, lng: 36.8225, baseNoise: 38 },
        { id: 'school-2', name: 'Strathmore University', type: 'school', lat: -1.3163, lng: 36.8085, baseNoise: 48 },
        { id: 'hospital-2', name: 'Aga Khan Hospital', type: 'hospital', lat: -1.2620, lng: 36.8150, baseNoise: 46 },
        { id: 'library-2', name: 'Nairobi National Library', type: 'library', lat: -1.2830, lng: 36.8200, baseNoise: 36 },
      ],
      zoneGroups: {
        school: { cards: ['University of Nairobi', 'Strathmore University'], name: 'Nairobi Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Kenyatta National Hospital', 'Aga Khan Hospital'], name: 'Nairobi Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['McMillan Memorial Library', 'Nairobi National Library'], name: 'Nairobi Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'United Kingdom': {
      name: 'London Case Study', lat: 51.5074, lng: -0.1278, baseNoise: 64, population: 8900000,
      landmarks: {
        'Buckingham Palace': [51.5014, -0.1419],
        'Big Ben': [51.5007, -0.1246],
        'London Eye': [51.5033, -0.1195],
        'Trafalgar Square': [51.5080, -0.1283],
        'Camden Town': [51.5387, -0.1422],
        'Greenwich': [51.4826, -0.0077],
        'Shoreditch': [51.5253, -0.0757],
        'Notting Hill': [51.5088, -0.2030],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'UCL', type: 'school', lat: 51.5246, lng: -0.1336, baseNoise: 58 },
        { id: 'hospital-1', name: "St Thomas Hospital", type: 'hospital', lat: 51.4988, lng: -0.1187, baseNoise: 55 },
        { id: 'library-1', name: 'British Library', type: 'library', lat: 51.5299, lng: -0.1276, baseNoise: 44 },
        { id: 'school-2', name: 'Imperial College', type: 'school', lat: 51.4988, lng: -0.1749, baseNoise: 56 },
        { id: 'hospital-2', name: "Guys Hospital", type: 'hospital', lat: 51.5013, lng: -0.0883, baseNoise: 53 },
        { id: 'library-2', name: 'Barbican Library', type: 'library', lat: 51.5199, lng: -0.0940, baseNoise: 42 },
      ],
      zoneGroups: {
        school: { cards: ['UCL', 'Imperial College'], name: 'London Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['St Thomas Hospital', 'Guys Hospital'], name: 'London Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['British Library', 'Barbican Library'], name: 'London Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    France: {
      name: 'Paris Case Study', lat: 48.8566, lng: 2.3522, baseNoise: 63, population: 2160000,
      landmarks: {
        'Eiffel Tower': [48.8584, 2.2945],
        'Louvre Museum': [48.8606, 2.3376],
        'Arc de Triomphe': [48.8738, 2.2950],
        'Notre-Dame': [48.8530, 2.3499],
        'Montmartre': [48.8867, 2.3431],
        'Champs-Elysees': [48.8698, 2.3075],
        'Le Marais': [48.8591, 2.3618],
        'Luxembourg Gardens': [48.8462, 2.3372],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Sorbonne University', type: 'school', lat: 48.8490, lng: 2.3430, baseNoise: 57 },
        { id: 'hospital-1', name: 'Hopital Pitie-Salpetriere', type: 'hospital', lat: 48.8379, lng: 2.3644, baseNoise: 54 },
        { id: 'library-1', name: 'Bibliotheque Nationale', type: 'library', lat: 48.8333, lng: 2.3756, baseNoise: 43 },
        { id: 'school-2', name: 'Ecole Polytechnique', type: 'school', lat: 48.7142, lng: 2.2101, baseNoise: 55 },
        { id: 'hospital-2', name: 'Hopital Necker', type: 'hospital', lat: 48.8492, lng: 2.3116, baseNoise: 52 },
        { id: 'library-2', name: 'Bibliotheque Sainte-Genevieve', type: 'library', lat: 48.8498, lng: 2.3455, baseNoise: 41 },
      ],
      zoneGroups: {
        school: { cards: ['Sorbonne University', 'Ecole Polytechnique'], name: 'Paris Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Hopital Pitie-Salpetriere', 'Hopital Necker'], name: 'Paris Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Bibliotheque Nationale', 'Bibliotheque Sainte-Genevieve'], name: 'Paris Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    Germany: {
      name: 'Berlin Case Study', lat: 52.5200, lng: 13.4050, baseNoise: 62, population: 3600000,
      landmarks: {
        'Brandenburg Gate': [52.5163, 13.3777],
        'Reichstag': [52.5186, 13.3762],
        'Alexanderplatz': [52.5219, 13.4132],
        'East Side Gallery': [52.5051, 13.4404],
        'Potsdamer Platz': [52.5092, 13.3760],
        'Tiergarten': [52.5145, 13.3698],
        'Kreuzberg': [52.4969, 13.3840],
        'Prenzlauer Berg': [52.5402, 13.4185],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Humboldt University', type: 'school', lat: 52.5186, lng: 13.3937, baseNoise: 56 },
        { id: 'hospital-1', name: 'Charite Hospital', type: 'hospital', lat: 52.5278, lng: 13.3769, baseNoise: 53 },
        { id: 'library-1', name: 'Staatsbibliothek', type: 'library', lat: 52.5072, lng: 13.3672, baseNoise: 42 },
        { id: 'school-2', name: 'TU Berlin', type: 'school', lat: 52.5122, lng: 13.3267, baseNoise: 54 },
        { id: 'hospital-2', name: 'Vivantes Hospital', type: 'hospital', lat: 52.5446, lng: 13.4110, baseNoise: 51 },
        { id: 'library-2', name: 'Berlin Public Library', type: 'library', lat: 52.5250, lng: 13.4040, baseNoise: 40 },
      ],
      zoneGroups: {
        school: { cards: ['Humboldt University', 'TU Berlin'], name: 'Berlin Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Charite Hospital', 'Vivantes Hospital'], name: 'Berlin Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Staatsbibliothek', 'Berlin Public Library'], name: 'Berlin Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    Japan: {
      name: 'Tokyo Case Study', lat: 35.6762, lng: 139.6503, baseNoise: 68, population: 13900000,
      landmarks: {
        'Shibuya Crossing': [35.6595, 139.7004],
        'Tokyo Tower': [35.6586, 139.7454],
        'Shinjuku': [35.6896, 139.7006],
        'Asakusa': [35.7148, 139.7967],
        'Ueno Park': [35.7140, 139.7739],
        'Ginza': [35.6717, 139.7662],
        'Akihabara': [35.7022, 139.7749],
        'Roppongi': [35.6605, 139.7292],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Tokyo', type: 'school', lat: 35.7132, lng: 139.7620, baseNoise: 62 },
        { id: 'hospital-1', name: 'Tokyo University Hospital', type: 'hospital', lat: 35.7140, lng: 139.7650, baseNoise: 59 },
        { id: 'library-1', name: 'National Diet Library', type: 'library', lat: 35.6778, lng: 139.7475, baseNoise: 48 },
        { id: 'school-2', name: 'Waseda University', type: 'school', lat: 35.7053, lng: 139.7204, baseNoise: 60 },
        { id: 'hospital-2', name: 'St Lukes Hospital', type: 'hospital', lat: 35.6676, lng: 139.7791, baseNoise: 57 },
        { id: 'library-2', name: 'Tokyo Metropolitan Library', type: 'library', lat: 35.6910, lng: 139.7200, baseNoise: 45 },
      ],
      zoneGroups: {
        school: { cards: ['University of Tokyo', 'Waseda University'], name: 'Tokyo Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Tokyo University Hospital', 'St Lukes Hospital'], name: 'Tokyo Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Diet Library', 'Tokyo Metropolitan Library'], name: 'Tokyo Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    Australia: {
      name: 'Sydney Case Study', lat: -33.8688, lng: 151.2093, baseNoise: 61, population: 5300000,
      landmarks: {
        'Sydney Opera House': [-33.8568, 151.2153],
        'Harbour Bridge': [-33.8523, 151.2108],
        'Bondi Beach': [-33.8915, 151.2767],
        'Darling Harbour': [-33.8730, 151.1986],
        'The Rocks': [-33.8597, 151.2091],
        'Circular Quay': [-33.8615, 151.2107],
        'Surry Hills': [-33.8820, 151.2100],
        'Paddington': [-33.8830, 151.2260],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Sydney', type: 'school', lat: -33.8883, lng: 151.1871, baseNoise: 55 },
        { id: 'hospital-1', name: 'Royal Prince Alfred', type: 'hospital', lat: -33.8951, lng: 151.1765, baseNoise: 52 },
        { id: 'library-1', name: 'State Library NSW', type: 'library', lat: -33.8662, lng: 151.2125, baseNoise: 42 },
        { id: 'school-2', name: 'UNSW Sydney', type: 'school', lat: -33.9170, lng: 151.2312, baseNoise: 54 },
        { id: 'hospital-2', name: 'St Vincents Hospital', type: 'hospital', lat: -33.8798, lng: 151.2263, baseNoise: 50 },
        { id: 'library-2', name: 'Green Square Library', type: 'library', lat: -33.9060, lng: 151.2010, baseNoise: 40 },
      ],
      zoneGroups: {
        school: { cards: ['University of Sydney', 'UNSW Sydney'], name: 'Sydney Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Royal Prince Alfred', 'St Vincents Hospital'], name: 'Sydney Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['State Library NSW', 'Green Square Library'], name: 'Sydney Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    Brazil: {
      name: 'Sao Paulo Case Study', lat: -23.5505, lng: -46.6333, baseNoise: 70, population: 12300000,
      landmarks: {
        'Paulista Avenue': [-23.5610, -46.6565],
        'Ibirapuera Park': [-23.5874, -46.6576],
        'Centro Historico': [-23.5483, -46.6359],
        'Morumbi': [-23.6033, -46.7078],
        'Pinheiros': [-23.5655, -46.6879],
        'Vila Madalena': [-23.5555, -46.6930],
        'Berini': [-23.5700, -46.6540],
        'Avenida Faria Lima': [-23.5667, -46.6883],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'USP', type: 'school', lat: -23.5622, lng: -46.7200, baseNoise: 64 },
        { id: 'hospital-1', name: 'Hospital das Clinicas', type: 'hospital', lat: -23.5583, lng: -46.6719, baseNoise: 61 },
        { id: 'library-1', name: 'Biblioteca Mario de Andrade', type: 'library', lat: -23.5475, lng: -46.6380, baseNoise: 50 },
        { id: 'school-2', name: 'UNESP', type: 'school', lat: -23.4446, lng: -46.5300, baseNoise: 62 },
        { id: 'hospital-2', name: 'Hospital Sirio-Libanes', type: 'hospital', lat: -23.5656, lng: -46.6525, baseNoise: 59 },
        { id: 'library-2', name: 'SP Public Library', type: 'library', lat: -23.5450, lng: -46.6350, baseNoise: 48 },
      ],
      zoneGroups: {
        school: { cards: ['USP', 'UNESP'], name: 'Sao Paulo Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Hospital das Clinicas', 'Hospital Sirio-Libanes'], name: 'SP Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Biblioteca Mario de Andrade', 'SP Public Library'], name: 'SP Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    India: {
      name: 'Mumbai Case Study', lat: 19.0760, lng: 72.8777, baseNoise: 75, population: 12400000,
      landmarks: {
        'Gateway of India': [18.9220, 72.8347],
        'Marine Drive': [18.9435, 72.8232],
        'Colaba': [18.9101, 72.8146],
        'Bandra Kurla Complex': [19.0621, 72.8535],
        'Andheri': [19.1191, 72.8464],
        'Powai': [19.1176, 72.9052],
        'Worli': [19.0005, 72.8161],
        'Juhu Beach': [19.0883, 72.8263],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'IIT Bombay', type: 'school', lat: 19.1334, lng: 72.9167, baseNoise: 68 },
        { id: 'hospital-1', name: 'KEM Hospital', type: 'hospital', lat: 19.0097, lng: 72.8414, baseNoise: 65 },
        { id: 'library-1', name: 'David Sassoon Library', type: 'library', lat: 18.9310, lng: 72.8315, baseNoise: 55 },
        { id: 'school-2', name: 'University of Mumbai', type: 'school', lat: 18.9330, lng: 72.8280, baseNoise: 66 },
        { id: 'hospital-2', name: 'Lilavati Hospital', type: 'hospital', lat: 19.0460, lng: 72.8289, baseNoise: 63 },
        { id: 'library-2', name: 'Mumbai Public Library', type: 'library', lat: 18.9350, lng: 72.8300, baseNoise: 52 },
      ],
      zoneGroups: {
        school: { cards: ['IIT Bombay', 'University of Mumbai'], name: 'Mumbai Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['KEM Hospital', 'Lilavati Hospital'], name: 'Mumbai Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['David Sassoon Library', 'Mumbai Public Library'], name: 'Mumbai Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    China: {
      name: 'Shanghai Case Study', lat: 31.2304, lng: 121.4737, baseNoise: 73, population: 24000000,
      landmarks: {
        'The Bund': [31.2360, 121.4906],
        'Oriental Pearl Tower': [31.2410, 121.4997],
        'Nanjing Road': [31.2370, 121.4730],
        'Peoples Square': [31.2319, 121.4723],
        'French Concession': [31.2100, 121.4520],
        'Lujiazui': [31.2405, 121.5006],
        'Jingan Temple': [31.2228, 121.4463],
        'Yu Garden': [31.2284, 121.4930],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Fudan University', type: 'school', lat: 31.2965, lng: 121.4990, baseNoise: 66 },
        { id: 'hospital-1', name: 'Shanghai General Hospital', type: 'hospital', lat: 31.2459, lng: 121.4772, baseNoise: 63 },
        { id: 'library-1', name: 'Shanghai Library', type: 'library', lat: 31.2106, lng: 121.4417, baseNoise: 52 },
        { id: 'school-2', name: 'Shanghai Jiao Tong University', type: 'school', lat: 31.2030, lng: 121.4297, baseNoise: 64 },
        { id: 'hospital-2', name: 'Huadong Hospital', type: 'hospital', lat: 31.2175, lng: 121.4519, baseNoise: 61 },
        { id: 'library-2', name: 'Shanghai Public Library', type: 'library', lat: 31.2200, lng: 121.4500, baseNoise: 50 },
      ],
      zoneGroups: {
        school: { cards: ['Fudan University', 'Shanghai Jiao Tong University'], name: 'Shanghai Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Shanghai General Hospital', 'Huadong Hospital'], name: 'Shanghai Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Shanghai Library', 'Shanghai Public Library'], name: 'Shanghai Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'South Korea': {
      name: 'Seoul Case Study', lat: 37.5665, lng: 126.9780, baseNoise: 69, population: 9700000,
      landmarks: {
        'Gyeongbokgung Palace': [37.5796, 126.9770],
        'N Seoul Tower': [37.5512, 126.9882],
        'Myeongdong': [37.5609, 126.9864],
        'Gangnam': [37.4965, 127.0285],
        'Hongdae': [37.5563, 126.9251],
        'Itaewon': [37.5343, 126.9917],
        'Bukchon Hanok': [37.5838, 126.9855],
        'Han River Park': [37.5280, 126.9345],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Seoul National University', type: 'school', lat: 37.4599, lng: 126.9519, baseNoise: 62 },
        { id: 'hospital-1', name: 'Seoul National University Hospital', type: 'hospital', lat: 37.5797, lng: 126.9986, baseNoise: 59 },
        { id: 'library-1', name: 'National Library of Korea', type: 'library', lat: 37.4976, lng: 127.0031, baseNoise: 48 },
        { id: 'school-2', name: 'Yonsei University', type: 'school', lat: 37.5649, lng: 126.9376, baseNoise: 60 },
        { id: 'hospital-2', name: 'Samsung Medical Center', type: 'hospital', lat: 37.4860, lng: 127.0841, baseNoise: 57 },
        { id: 'library-2', name: 'Seoul Metropolitan Library', type: 'library', lat: 37.5665, lng: 126.9786, baseNoise: 45 },
      ],
      zoneGroups: {
        school: { cards: ['Seoul National University', 'Yonsei University'], name: 'Seoul Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Seoul National University Hospital', 'Samsung Medical Center'], name: 'Seoul Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library of Korea', 'Seoul Metropolitan Library'], name: 'Seoul Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Canada': {
      name: 'Toronto Case Study',
      lat: 43.6532,
      lng: -79.3832,
      baseNoise: 64,
      population: 2700000,
      landmarks: {
        'CN Tower': [43.6426, -79.3871],
        'Rogers Centre': [43.6414, -79.3894],
        'Royal Ontario Museum': [43.6677, -79.3948],
        'Distillery District': [43.6503, -79.3598],
        'Kensington Market': [43.6542, -79.4015],
        'Yorkville': [43.6711, -79.3926],
        'Nathan Phillips Square': [43.6529, -79.3838],
        'St. Lawrence Market': [43.6492, -79.3722],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Toronto', type: 'school', lat: 43.6629, lng: -79.3957, baseNoise: 58 },
        { id: 'hospital-1', name: 'Toronto General Hospital', type: 'hospital', lat: 43.6583, lng: -79.3883, baseNoise: 55 },
        { id: 'library-1', name: 'Toronto Reference Library', type: 'library', lat: 43.6715, lng: -79.3872, baseNoise: 44 },
        { id: 'school-2', name: 'Toronto Metropolitan University', type: 'school', lat: 43.6579, lng: -79.3788, baseNoise: 60 },
        { id: 'hospital-2', name: 'SickKids Hospital', type: 'hospital', lat: 43.6569, lng: -79.3881, baseNoise: 53 },
        { id: 'library-2', name: 'Toronto City Hall Library', type: 'library', lat: 43.6530, lng: -79.3845, baseNoise: 42 },
      ],
      zoneGroups: {
        school: { cards: ['University of Toronto', 'Toronto Metropolitan University'], name: 'Toronto Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Toronto General Hospital', 'SickKids Hospital'], name: 'Toronto Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Toronto Reference Library', 'Toronto City Hall Library'], name: 'Toronto Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Italy': {
      name: 'Rome Case Study',
      lat: 41.9028,
      lng: 12.4964,
      baseNoise: 61,
      population: 2870000,
      landmarks: {
        'Colosseum': [41.8902, 12.4922],
        'Trevi Fountain': [41.9009, 12.4833],
        'Pantheon': [41.8986, 12.4769],
        'Spanish Steps': [41.9060, 12.4826],
        'Vatican City': [41.9029, 12.4534],
        'Piazza Navona': [41.8992, 12.4731],
        'Roman Forum': [41.8925, 12.4853],
        'Trastevere': [41.8865, 12.4681],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Sapienza University', type: 'school', lat: 41.9028, lng: 12.5147, baseNoise: 55 },
        { id: 'hospital-1', name: 'Policlinico Umberto I', type: 'hospital', lat: 41.9071, lng: 12.5112, baseNoise: 52 },
        { id: 'library-1', name: 'Biblioteca Nazionale Centrale', type: 'library', lat: 41.9045, lng: 12.5100, baseNoise: 42 },
        { id: 'school-2', name: 'Roma Tre University', type: 'school', lat: 41.8632, lng: 12.4799, baseNoise: 53 },
        { id: 'hospital-2', name: 'Gemelli Hospital', type: 'hospital', lat: 41.9180, lng: 12.4270, baseNoise: 50 },
        { id: 'library-2', name: 'Biblioteca Angelica', type: 'library', lat: 41.8947, lng: 12.4943, baseNoise: 40 },
      ],
      zoneGroups: {
        school: { cards: ['Sapienza University', 'Roma Tre University'], name: 'Rome Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Policlinico Umberto I', 'Gemelli Hospital'], name: 'Rome Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Biblioteca Nazionale Centrale', 'Biblioteca Angelica'], name: 'Rome Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Spain': {
      name: 'Madrid Case Study',
      lat: 40.4168,
      lng: -3.7038,
      baseNoise: 62,
      population: 3220000,
      landmarks: {
        'Royal Palace': [40.4180, -3.7140],
        'Plaza Mayor': [40.4153, -3.7074],
        'Prado Museum': [40.4138, -3.6921],
        'Retiro Park': [40.4150, -3.6833],
        'Gran Via': [40.4203, -3.7068],
        'Puerta del Sol': [40.4169, -3.7035],
        'Santiago Bernabeu': [40.4530, -3.6883],
        'Templo de Debod': [40.4238, -3.7176],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Complutense University', type: 'school', lat: 40.4476, lng: -3.7270, baseNoise: 56 },
        { id: 'hospital-1', name: 'Hospital Gregorio Maranon', type: 'hospital', lat: 40.4322, lng: -3.6815, baseNoise: 53 },
        { id: 'library-1', name: 'Biblioteca Nacional de Espana', type: 'library', lat: 40.4238, lng: -3.6895, baseNoise: 42 },
        { id: 'school-2', name: 'Technical University of Madrid', type: 'school', lat: 40.4444, lng: -3.7310, baseNoise: 54 },
        { id: 'hospital-2', name: 'Hospital La Paz', type: 'hospital', lat: 40.4792, lng: -3.6898, baseNoise: 51 },
        { id: 'library-2', name: 'Biblioteca Regional de Madrid', type: 'library', lat: 40.4280, lng: -3.6930, baseNoise: 40 },
      ],
      zoneGroups: {
        school: { cards: ['Complutense University', 'Technical University of Madrid'], name: 'Madrid Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Hospital Gregorio Maranon', 'Hospital La Paz'], name: 'Madrid Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Biblioteca Nacional de Espana', 'Biblioteca Regional de Madrid'], name: 'Madrid Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Netherlands': {
      name: 'Amsterdam Case Study',
      lat: 52.3676,
      lng: 4.9041,
      baseNoise: 59,
      population: 872000,
      landmarks: {
        'Rijksmuseum': [52.3600, 4.8852],
        'Anne Frank House': [52.3752, 4.8840],
        'Vondelpark': [52.3579, 4.8685],
        'Dam Square': [52.3731, 4.8933],
        'Jordaan': [52.3763, 4.8808],
        'Leidseplein': [52.3644, 4.8825],
        'Centraal Station': [52.3791, 4.9003],
        'Artis Zoo': [52.3665, 4.9165],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Amsterdam', type: 'school', lat: 52.3671, lng: 4.8937, baseNoise: 53 },
        { id: 'hospital-1', name: 'Amsterdam UMC', type: 'hospital', lat: 52.2930, lng: 4.9570, baseNoise: 50 },
        { id: 'library-1', name: 'Amsterdam Public Library (OBA)', type: 'library', lat: 52.3801, lng: 4.9060, baseNoise: 39 },
        { id: 'school-2', name: 'VU Amsterdam', type: 'school', lat: 52.3333, lng: 4.8658, baseNoise: 51 },
        { id: 'hospital-2', name: 'VUmc Hospital', type: 'hospital', lat: 52.3336, lng: 4.8616, baseNoise: 48 },
        { id: 'library-2', name: 'University of Amsterdam Library', type: 'library', lat: 52.3690, lng: 4.8930, baseNoise: 38 },
      ],
      zoneGroups: {
        school: { cards: ['University of Amsterdam', 'VU Amsterdam'], name: 'Amsterdam Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Amsterdam UMC', 'VUmc Hospital'], name: 'Amsterdam Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Amsterdam Public Library (OBA)', 'University of Amsterdam Library'], name: 'Amsterdam Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Mexico': {
      name: 'Mexico City Case Study',
      lat: 19.4326,
      lng: -99.1332,
      baseNoise: 72,
      population: 9200000,
      landmarks: {
        'Zocalo': [19.4326, -99.1332],
        'Chapultepec Castle': [19.4209, -99.1819],
        'Palacio de Bellas Artes': [19.4350, -99.1413],
        'Museo Frida Kahlo': [19.3552, -99.1631],
        'Teotihuacan': [19.6925, -98.8438],
        'Coyoacan': [19.3498, -99.1620],
        'Xochimilco': [19.2585, -99.1041],
        'Polanco': [19.4325, -99.1910],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'UNAM', type: 'school', lat: 19.3326, lng: -99.1867, baseNoise: 65 },
        { id: 'hospital-1', name: 'Hospital General de Mexico', type: 'hospital', lat: 19.4179, lng: -99.1451, baseNoise: 62 },
        { id: 'library-1', name: 'Biblioteca Vasconcelos', type: 'library', lat: 19.4240, lng: -99.1505, baseNoise: 50 },
        { id: 'school-2', name: 'IPN', type: 'school', lat: 19.4826, lng: -99.0647, baseNoise: 63 },
        { id: 'hospital-2', name: 'IMSS Hospital', type: 'hospital', lat: 19.4300, lng: -99.1500, baseNoise: 60 },
        { id: 'library-2', name: 'Biblioteca Nacional de Mexico', type: 'library', lat: 19.3190, lng: -99.1844, baseNoise: 48 },
      ],
      zoneGroups: {
        school: { cards: ['UNAM', 'IPN'], name: 'Mexico City Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Hospital General de Mexico', 'IMSS Hospital'], name: 'Mexico City Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Biblioteca Vasconcelos', 'Biblioteca Nacional de Mexico'], name: 'Mexico City Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Singapore': {
      name: 'Singapore Case Study',
      lat: 1.3521,
      lng: 103.8198,
      baseNoise: 67,
      population: 5700000,
      landmarks: {
        'Marina Bay Sands': [1.2834, 103.8607],
        'Gardens by the Bay': [1.2816, 103.8637],
        'Sentosa Island': [1.2482, 103.8302],
        'Chinatown': [1.2826, 103.8429],
        'Little India': [1.3064, 103.8497],
        'Orchard Road': [1.3041, 103.8318],
        'Clarke Quay': [1.2903, 103.8466],
        'Singapore Zoo': [1.4043, 103.7930],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'National University of Singapore', type: 'school', lat: 1.2966, lng: 103.7762, baseNoise: 60 },
        { id: 'hospital-1', name: 'Singapore General Hospital', type: 'hospital', lat: 1.2794, lng: 103.8346, baseNoise: 57 },
        { id: 'library-1', name: 'National Library Singapore', type: 'library', lat: 1.2982, lng: 103.8522, baseNoise: 46 },
        { id: 'school-2', name: 'Nanyang Technological University', type: 'school', lat: 1.3458, lng: 103.6830, baseNoise: 58 },
        { id: 'hospital-2', name: 'National University Hospital', type: 'hospital', lat: 1.2943, lng: 103.7837, baseNoise: 55 },
        { id: 'library-2', name: 'Lee Kong Chian Reference Library', type: 'library', lat: 1.2979, lng: 103.8525, baseNoise: 44 },
      ],
      zoneGroups: {
        school: { cards: ['National University of Singapore', 'Nanyang Technological University'], name: 'Singapore Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Singapore General Hospital', 'National University Hospital'], name: 'Singapore Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library Singapore', 'Lee Kong Chian Reference Library'], name: 'Singapore Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Thailand': {
      name: 'Bangkok Case Study',
      lat: 13.7563,
      lng: 100.5018,
      baseNoise: 74,
      population: 10500000,
      landmarks: {
        'Grand Palace': [13.7500, 100.4914],
        'Wat Arun': [13.7437, 100.4888],
        'Wat Phra Kaew': [13.7514, 100.4925],
        'Chatuchak Market': [13.7996, 100.5501],
        'Khao San Road': [13.7586, 100.4978],
        'Siam Square': [13.7454, 100.5341],
        'Asiatique': [13.7059, 100.5014],
        'Jim Thompson House': [13.7495, 100.5296],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Chulalongkorn University', type: 'school', lat: 13.7367, lng: 100.5280, baseNoise: 66 },
        { id: 'hospital-1', name: 'Siriraj Hospital', type: 'hospital', lat: 13.7587, lng: 100.4858, baseNoise: 63 },
        { id: 'library-1', name: 'Bangkok City Library', type: 'library', lat: 13.7530, lng: 100.5010, baseNoise: 50 },
        { id: 'school-2', name: 'Thammasat University', type: 'school', lat: 13.7556, lng: 100.4909, baseNoise: 64 },
        { id: 'hospital-2', name: 'Bumrungrad Hospital', type: 'hospital', lat: 13.7394, lng: 100.5500, baseNoise: 61 },
        { id: 'library-2', name: 'National Library of Thailand', type: 'library', lat: 13.7740, lng: 100.5190, baseNoise: 48 },
      ],
      zoneGroups: {
        school: { cards: ['Chulalongkorn University', 'Thammasat University'], name: 'Bangkok Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Siriraj Hospital', 'Bumrungrad Hospital'], name: 'Bangkok Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Bangkok City Library', 'National Library of Thailand'], name: 'Bangkok Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Turkey': {
      name: 'Istanbul Case Study',
      lat: 41.0082,
      lng: 28.9784,
      baseNoise: 68,
      population: 15000000,
      landmarks: {
        'Hagia Sophia': [41.0086, 28.9802],
        'Blue Mosque': [41.0054, 28.9768],
        'Topkapi Palace': [41.0115, 28.9833],
        'Grand Bazaar': [41.0107, 28.9680],
        'Galata Tower': [41.0255, 28.9741],
        'Taksim Square': [41.0370, 28.9849],
        'Dolmabahce Palace': [41.0380, 28.9989],
        'Bosphorus Bridge': [41.0479, 29.0349],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Istanbul University', type: 'school', lat: 41.0130, lng: 28.9566, baseNoise: 60 },
        { id: 'hospital-1', name: 'Istanbul University Hospital', type: 'hospital', lat: 41.0110, lng: 28.9590, baseNoise: 57 },
        { id: 'library-1', name: 'Istanbul Metropolitan Library', type: 'library', lat: 41.0100, lng: 28.9740, baseNoise: 46 },
        { id: 'school-2', name: 'Bogazici University', type: 'school', lat: 41.0830, lng: 29.0500, baseNoise: 58 },
        { id: 'hospital-2', name: 'Acibadem Hospital', type: 'hospital', lat: 41.0000, lng: 29.0270, baseNoise: 55 },
        { id: 'library-2', name: 'Beyazit Public Library', type: 'library', lat: 41.0095, lng: 28.9665, baseNoise: 44 },
      ],
      zoneGroups: {
        school: { cards: ['Istanbul University', 'Bogazici University'], name: 'Istanbul Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Istanbul University Hospital', 'Acibadem Hospital'], name: 'Istanbul Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Istanbul Metropolitan Library', 'Beyazit Public Library'], name: 'Istanbul Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'United Arab Emirates': {
      name: 'Dubai Case Study',
      lat: 25.2048,
      lng: 55.2708,
      baseNoise: 63,
      population: 3400000,
      landmarks: {
        'Burj Khalifa': [25.1972, 55.2744],
        'Palm Jumeirah': [25.1124, 55.1390],
        'Dubai Mall': [25.1986, 55.2796],
        'Burj Al Arab': [25.1412, 55.1852],
        'Dubai Marina': [25.0800, 55.1400],
        'Mall of the Emirates': [25.1186, 55.2008],
        'Gold Souk': [25.2875, 55.2977],
        'Dubai Creek': [25.2667, 55.2967],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'American University of Dubai', type: 'school', lat: 25.1060, lng: 55.1640, baseNoise: 55 },
        { id: 'hospital-1', name: 'Dubai Hospital', type: 'hospital', lat: 25.2740, lng: 55.3150, baseNoise: 54 },
        { id: 'library-1', name: 'Dubai Public Library', type: 'library', lat: 25.2700, lng: 55.3000, baseNoise: 43 },
        { id: 'school-2', name: 'University of Dubai', type: 'school', lat: 25.2210, lng: 55.3550, baseNoise: 53 },
        { id: 'hospital-2', name: 'Rashid Hospital', type: 'hospital', lat: 25.2420, lng: 55.3050, baseNoise: 52 },
        { id: 'library-2', name: 'Mohammed bin Rashid Library', type: 'library', lat: 25.2290, lng: 55.3390, baseNoise: 41 },
      ],
      zoneGroups: {
        school: { cards: ['American University of Dubai', 'University of Dubai'], name: 'Dubai Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Dubai Hospital', 'Rashid Hospital'], name: 'Dubai Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Dubai Public Library', 'Mohammed bin Rashid Library'], name: 'Dubai Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'South Africa': {
      name: 'Cape Town Case Study',
      lat: -33.9249,
      lng: 18.4241,
      baseNoise: 57,
      population: 4600000,
      landmarks: {
        'Table Mountain': [-33.9628, 18.4098],
        'V&A Waterfront': [-33.9036, 18.4218],
        'Robben Island': [-33.8076, 18.3712],
        'Cape of Good Hope': [-34.3568, 18.4768],
        'Boulders Beach': [-34.1974, 18.4514],
        'Kirstenbosch': [-33.9881, 18.4331],
        'Bo-Kaap': [-33.9215, 18.4138],
        'Camps Bay': [-33.9522, 18.3789],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Cape Town', type: 'school', lat: -33.9574, lng: 18.4608, baseNoise: 50 },
        { id: 'hospital-1', name: 'Groote Schuur Hospital', type: 'hospital', lat: -33.9415, lng: 18.4620, baseNoise: 48 },
        { id: 'library-1', name: 'Cape Town Central Library', type: 'library', lat: -33.9235, lng: 18.4230, baseNoise: 38 },
        { id: 'school-2', name: 'Cape Peninsula University of Technology', type: 'school', lat: -33.9340, lng: 18.4630, baseNoise: 48 },
        { id: 'hospital-2', name: 'Red Cross Childrens Hospital', type: 'hospital', lat: -33.9400, lng: 18.4620, baseNoise: 46 },
        { id: 'library-2', name: 'National Library of South Africa', type: 'library', lat: -33.9250, lng: 18.4230, baseNoise: 37 },
      ],
      zoneGroups: {
        school: { cards: ['University of Cape Town', 'Cape Peninsula University of Technology'], name: 'Cape Town Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Groote Schuur Hospital', 'Red Cross Childrens Hospital'], name: 'Cape Town Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Cape Town Central Library', 'National Library of South Africa'], name: 'Cape Town Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Nigeria': {
      name: 'Lagos Case Study',
      lat: 6.5244,
      lng: 3.3792,
      baseNoise: 75,
      population: 14000000,
      landmarks: {
        'Victoria Island': [6.4281, 3.4219],
        'Lekki': [6.4585, 3.6023],
        'Ikoyi': [6.4507, 3.4361],
        'Surulere': [6.5014, 3.3506],
        'Tarkwa Bay': [6.3900, 3.4100],
        'Third Mainland Bridge': [6.5041, 3.3889],
        'National Theatre': [6.4767, 3.3616],
        'Lagos Island': [6.4561, 3.3933],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Lagos', type: 'school', lat: 6.5190, lng: 3.3950, baseNoise: 67 },
        { id: 'hospital-1', name: 'Lagos University Teaching Hospital', type: 'hospital', lat: 6.5170, lng: 3.3910, baseNoise: 65 },
        { id: 'library-1', name: 'National Library of Nigeria', type: 'library', lat: 6.5170, lng: 3.3900, baseNoise: 52 },
        { id: 'school-2', name: 'Lagos State University', type: 'school', lat: 6.5440, lng: 3.2130, baseNoise: 65 },
        { id: 'hospital-2', name: 'St. Nicholas Hospital', type: 'hospital', lat: 6.4470, lng: 3.4310, baseNoise: 63 },
        { id: 'library-2', name: 'Lagos City Library', type: 'library', lat: 6.4550, lng: 3.3900, baseNoise: 50 },
      ],
      zoneGroups: {
        school: { cards: ['University of Lagos', 'Lagos State University'], name: 'Lagos Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Lagos University Teaching Hospital', 'St. Nicholas Hospital'], name: 'Lagos Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library of Nigeria', 'Lagos City Library'], name: 'Lagos Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Egypt': {
      name: 'Cairo Case Study',
      lat: 30.0444,
      lng: 31.2357,
      baseNoise: 73,
      population: 9500000,
      landmarks: {
        'Pyramids of Giza': [29.9792, 31.1342],
        'Great Sphinx': [29.9753, 31.1376],
        'Egyptian Museum': [30.0478, 31.2336],
        'Cairo Tower': [30.0458, 31.2240],
        'Khan El Khalili': [30.0474, 31.2627],
        'Al-Azhar Mosque': [30.0454, 31.2617],
        'Citadel of Saladin': [30.0296, 31.2599],
        'Nile Corniche': [30.0500, 31.2300],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Cairo University', type: 'school', lat: 30.0260, lng: 31.2100, baseNoise: 65 },
        { id: 'hospital-1', name: 'Cairo University Hospital', type: 'hospital', lat: 30.0230, lng: 31.2070, baseNoise: 63 },
        { id: 'library-1', name: 'Egyptian National Library', type: 'library', lat: 30.0420, lng: 31.2380, baseNoise: 50 },
        { id: 'school-2', name: 'American University in Cairo', type: 'school', lat: 30.0439, lng: 31.2358, baseNoise: 63 },
        { id: 'hospital-2', name: 'El Demerdash Hospital', type: 'hospital', lat: 30.0700, lng: 31.2500, baseNoise: 61 },
        { id: 'library-2', name: 'Cairo Public Library', type: 'library', lat: 30.0400, lng: 31.2340, baseNoise: 48 },
      ],
      zoneGroups: {
        school: { cards: ['Cairo University', 'American University in Cairo'], name: 'Cairo Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Cairo University Hospital', 'El Demerdash Hospital'], name: 'Cairo Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Egyptian National Library', 'Cairo Public Library'], name: 'Cairo Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Argentina': {
      name: 'Buenos Aires Case Study',
      lat: -34.6037,
      lng: -58.3816,
      baseNoise: 66,
      population: 3050000,
      landmarks: {
        'Obelisco': [-34.6037, -58.3816],
        'Casa Rosada': [-34.6149, -58.3689],
        'Recoleta Cemetery': [-34.5873, -58.3931],
        'La Boca': [-34.6375, -58.3543],
        'Puerto Madero': [-34.6083, -58.3620],
        'Palermo Soho': [-34.5833, -58.4236],
        'San Telmo': [-34.6225, -58.3721],
        'Teatro Colon': [-34.6012, -58.3834],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Buenos Aires', type: 'school', lat: -34.5999, lng: -58.3816, baseNoise: 58 },
        { id: 'hospital-1', name: 'Hospital de Clinicas', type: 'hospital', lat: -34.5970, lng: -58.3970, baseNoise: 56 },
        { id: 'library-1', name: 'Biblioteca Nacional Mariano Moreno', type: 'library', lat: -34.5858, lng: -58.3906, baseNoise: 45 },
        { id: 'school-2', name: 'Universidad Torcuato Di Tella', type: 'school', lat: -34.5780, lng: -58.4060, baseNoise: 56 },
        { id: 'hospital-2', name: 'Hospital Italiano', type: 'hospital', lat: -34.5800, lng: -58.4200, baseNoise: 54 },
        { id: 'library-2', name: 'Biblioteca Publica de Buenos Aires', type: 'library', lat: -34.6030, lng: -58.3820, baseNoise: 43 },
      ],
      zoneGroups: {
        school: { cards: ['University of Buenos Aires', 'Universidad Torcuato Di Tella'], name: 'Buenos Aires Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Hospital de Clinicas', 'Hospital Italiano'], name: 'Buenos Aires Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Biblioteca Nacional Mariano Moreno', 'Biblioteca Publica de Buenos Aires'], name: 'Buenos Aires Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Sweden': {
      name: 'Stockholm Case Study',
      lat: 59.3293,
      lng: 18.0686,
      baseNoise: 56,
      population: 975000,
      landmarks: {
        'Gamla Stan': [59.3250, 18.0715],
        'Vasa Museum': [59.3281, 18.0915],
        'Royal Palace': [59.3268, 18.0722],
        'Skansen': [59.3250, 18.1017],
        'Djurgarden': [59.3243, 18.1090],
        'Sodermalm': [59.3171, 18.0636],
        'Kungstradgarden': [59.3315, 18.0688],
        'Stockholm City Hall': [59.3273, 18.0546],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Stockholm University', type: 'school', lat: 59.3648, lng: 18.0598, baseNoise: 49 },
        { id: 'hospital-1', name: 'Karolinska University Hospital', type: 'hospital', lat: 59.3520, lng: 18.0230, baseNoise: 48 },
        { id: 'library-1', name: 'Stockholm Public Library', type: 'library', lat: 59.3430, lng: 18.0540, baseNoise: 37 },
        { id: 'school-2', name: 'KTH Royal Institute', type: 'school', lat: 59.3465, lng: 18.0698, baseNoise: 48 },
        { id: 'hospital-2', name: 'Sodersjukhuset', type: 'hospital', lat: 59.3130, lng: 18.0870, baseNoise: 46 },
        { id: 'library-2', name: 'Royal Library of Sweden', type: 'library', lat: 59.3420, lng: 18.0720, baseNoise: 36 },
      ],
      zoneGroups: {
        school: { cards: ['Stockholm University', 'KTH Royal Institute'], name: 'Stockholm Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Karolinska University Hospital', 'Sodersjukhuset'], name: 'Stockholm Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Stockholm Public Library', 'Royal Library of Sweden'], name: 'Stockholm Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Norway': {
      name: 'Oslo Case Study',
      lat: 59.9139,
      lng: 10.7522,
      baseNoise: 55,
      population: 700000,
      landmarks: {
        'Vigeland Park': [59.9272, 10.6996],
        'Opera House': [59.9076, 10.7533],
        'Viking Ship Museum': [59.9047, 10.6837],
        'Akershus Fortress': [59.9072, 10.7372],
        'Karl Johans Gate': [59.9143, 10.7408],
        'Holmenkollen': [59.9633, 10.6639],
        'Aker Brygge': [59.9113, 10.7263],
        'Munch Museum': [59.9193, 10.7563],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Oslo', type: 'school', lat: 59.9343, lng: 10.7160, baseNoise: 48 },
        { id: 'hospital-1', name: 'Oslo University Hospital', type: 'hospital', lat: 59.9350, lng: 10.7100, baseNoise: 46 },
        { id: 'library-1', name: 'Oslo Public Library', type: 'library', lat: 59.9120, lng: 10.7360, baseNoise: 36 },
        { id: 'school-2', name: 'Oslo Metropolitan University', type: 'school', lat: 59.9190, lng: 10.7410, baseNoise: 46 },
        { id: 'hospital-2', name: 'Ulleval Hospital', type: 'hospital', lat: 59.9380, lng: 10.7400, baseNoise: 44 },
        { id: 'library-2', name: 'National Library of Norway', type: 'library', lat: 59.9130, lng: 10.7380, baseNoise: 35 },
      ],
      zoneGroups: {
        school: { cards: ['University of Oslo', 'Oslo Metropolitan University'], name: 'Oslo Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Oslo University Hospital', 'Ulleval Hospital'], name: 'Oslo Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Oslo Public Library', 'National Library of Norway'], name: 'Oslo Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Denmark': {
      name: 'Copenhagen Case Study',
      lat: 55.6761,
      lng: 12.5683,
      baseNoise: 57,
      population: 800000,
      landmarks: {
        'Tivoli Gardens': [55.6736, 12.5650],
        'Nyhavn': [55.6799, 12.5898],
        'Little Mermaid': [55.6929, 12.5992],
        'Amalienborg': [55.6842, 12.5936],
        'Christiansborg': [55.6761, 12.5800],
        'Christiania': [55.6745, 12.5970],
        'Stroget': [55.6775, 12.5775],
        'Rosenborg Castle': [55.6863, 12.5778],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Copenhagen', type: 'school', lat: 55.6788, lng: 12.5732, baseNoise: 50 },
        { id: 'hospital-1', name: 'Rigshospitalet', type: 'hospital', lat: 55.6980, lng: 12.5670, baseNoise: 48 },
        { id: 'library-1', name: 'Royal Danish Library', type: 'library', lat: 55.6736, lng: 12.5826, baseNoise: 37 },
        { id: 'school-2', name: 'Copenhagen Business School', type: 'school', lat: 55.6690, lng: 12.5400, baseNoise: 48 },
        { id: 'hospital-2', name: 'Bispebjerg Hospital', type: 'hospital', lat: 55.7100, lng: 12.5370, baseNoise: 46 },
        { id: 'library-2', name: 'Copenhagen Main Library', type: 'library', lat: 55.6765, lng: 12.5670, baseNoise: 36 },
      ],
      zoneGroups: {
        school: { cards: ['University of Copenhagen', 'Copenhagen Business School'], name: 'Copenhagen Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Rigshospitalet', 'Bispebjerg Hospital'], name: 'Copenhagen Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Royal Danish Library', 'Copenhagen Main Library'], name: 'Copenhagen Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Finland': {
      name: 'Helsinki Case Study',
      lat: 60.1699,
      lng: 24.9384,
      baseNoise: 55,
      population: 650000,
      landmarks: {
        'Senate Square': [60.1695, 24.9531],
        'Uspenski Cathedral': [60.1731, 24.9595],
        'Suomenlinna': [60.1480, 24.9870],
        'Esplanadi': [60.1676, 24.9471],
        'Temppeliaukio Church': [60.1727, 24.9255],
        'Market Square': [60.1671, 24.9520],
        'Linnanmaki': [60.1875, 24.9410],
        'Helsinki Cathedral': [60.1703, 24.9523],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Helsinki', type: 'school', lat: 60.1704, lng: 24.9477, baseNoise: 48 },
        { id: 'hospital-1', name: 'Helsinki University Hospital', type: 'hospital', lat: 60.1750, lng: 24.9100, baseNoise: 46 },
        { id: 'library-1', name: 'Helsinki Central Library Oodi', type: 'library', lat: 60.1738, lng: 24.9391, baseNoise: 36 },
        { id: 'school-2', name: 'Aalto University', type: 'school', lat: 60.1852, lng: 24.8267, baseNoise: 46 },
        { id: 'hospital-2', name: 'Meilahti Hospital', type: 'hospital', lat: 60.1760, lng: 24.9050, baseNoise: 44 },
        { id: 'library-2', name: 'National Library of Finland', type: 'library', lat: 60.1700, lng: 24.9500, baseNoise: 35 },
      ],
      zoneGroups: {
        school: { cards: ['University of Helsinki', 'Aalto University'], name: 'Helsinki Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Helsinki University Hospital', 'Meilahti Hospital'], name: 'Helsinki Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Helsinki Central Library Oodi', 'National Library of Finland'], name: 'Helsinki Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Poland': {
      name: 'Warsaw Case Study',
      lat: 52.2297,
      lng: 21.0122,
      baseNoise: 60,
      population: 1790000,
      landmarks: {
        'Old Town Market': [52.2498, 21.0122],
        'Palace of Culture': [52.2318, 21.0068],
        'Royal Castle': [52.2477, 21.0140],
        'Lazienki Park': [52.2159, 21.0356],
        'Wilanow Palace': [52.1654, 21.0877],
        'Praga District': [52.2550, 21.0400],
        'Nowy Swiat': [52.2340, 21.0200],
        'Copernicus Science Centre': [52.2415, 21.0312],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Warsaw', type: 'school', lat: 52.2404, lng: 21.0196, baseNoise: 53 },
        { id: 'hospital-1', name: 'Wolski Hospital', type: 'hospital', lat: 52.2650, lng: 20.9620, baseNoise: 51 },
        { id: 'library-1', name: 'National Library of Poland', type: 'library', lat: 52.2140, lng: 21.0070, baseNoise: 40 },
        { id: 'school-2', name: 'Warsaw University of Technology', type: 'school', lat: 52.2248, lng: 21.0107, baseNoise: 51 },
        { id: 'hospital-2', name: 'Infant Jesus Hospital', type: 'hospital', lat: 52.2230, lng: 21.0200, baseNoise: 49 },
        { id: 'library-2', name: 'Warsaw Public Library', type: 'library', lat: 52.2280, lng: 21.0100, baseNoise: 39 },
      ],
      zoneGroups: {
        school: { cards: ['University of Warsaw', 'Warsaw University of Technology'], name: 'Warsaw Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Wolski Hospital', 'Infant Jesus Hospital'], name: 'Warsaw Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library of Poland', 'Warsaw Public Library'], name: 'Warsaw Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Portugal': {
      name: 'Lisbon Case Study',
      lat: 38.7223,
      lng: -9.1393,
      baseNoise: 58,
      population: 505000,
      landmarks: {
        'Belem Tower': [38.6916, -9.2160],
        'Jeronimos Monastery': [38.6979, -9.2068],
        'Alfama': [38.7110, -9.1300],
        'Commerce Square': [38.7076, -9.1367],
        'Rossio Square': [38.7134, -9.1394],
        'Bairro Alto': [38.7135, -9.1440],
        'LX Factory': [38.7005, -9.1770],
        'Parque das Nacoes': [38.7670, -9.0930],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Lisbon', type: 'school', lat: 38.7520, lng: -9.1540, baseNoise: 51 },
        { id: 'hospital-1', name: 'Santa Maria Hospital', type: 'hospital', lat: 38.7520, lng: -9.1530, baseNoise: 49 },
        { id: 'library-1', name: 'National Library of Portugal', type: 'library', lat: 38.7520, lng: -9.1570, baseNoise: 38 },
        { id: 'school-2', name: 'NOVA University Lisbon', type: 'school', lat: 38.7370, lng: -9.1390, baseNoise: 49 },
        { id: 'hospital-2', name: 'Hospital da Luz', type: 'hospital', lat: 38.7350, lng: -9.1560, baseNoise: 47 },
        { id: 'library-2', name: 'Lisbon Public Library', type: 'library', lat: 38.7100, lng: -9.1370, baseNoise: 37 },
      ],
      zoneGroups: {
        school: { cards: ['University of Lisbon', 'NOVA University Lisbon'], name: 'Lisbon Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Santa Maria Hospital', 'Hospital da Luz'], name: 'Lisbon Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library of Portugal', 'Lisbon Public Library'], name: 'Lisbon Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Greece': {
      name: 'Athens Case Study',
      lat: 37.9838,
      lng: 23.7275,
      baseNoise: 62,
      population: 3150000,
      landmarks: {
        'Parthenon': [37.9715, 23.7267],
        'Acropolis Museum': [37.9685, 23.7284],
        'Plaka': [37.9733, 23.7272],
        'Syntagma Square': [37.9755, 23.7350],
        'Monastiraki': [37.9765, 23.7258],
        'National Garden': [37.9730, 23.7375],
        'Lycabettus Hill': [37.9816, 23.7440],
        'Ancient Agora': [37.9754, 23.7218],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'National and Kapodistrian University of Athens', type: 'school', lat: 37.9670, lng: 23.7700, baseNoise: 55 },
        { id: 'hospital-1', name: 'Evangelismos Hospital', type: 'hospital', lat: 37.9770, lng: 23.7570, baseNoise: 53 },
        { id: 'library-1', name: 'National Library of Greece', type: 'library', lat: 37.9720, lng: 23.7400, baseNoise: 42 },
        { id: 'school-2', name: 'National Technical University of Athens', type: 'school', lat: 37.9780, lng: 23.7760, baseNoise: 53 },
        { id: 'hospital-2', name: 'Laiko Hospital', type: 'hospital', lat: 37.9670, lng: 23.7640, baseNoise: 51 },
        { id: 'library-2', name: 'Athens City Library', type: 'library', lat: 37.9760, lng: 23.7320, baseNoise: 40 },
      ],
      zoneGroups: {
        school: { cards: ['National and Kapodistrian University of Athens', 'National Technical University of Athens'], name: 'Athens Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Evangelismos Hospital', 'Laiko Hospital'], name: 'Athens Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library of Greece', 'Athens City Library'], name: 'Athens Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Russia': {
      name: 'Moscow Case Study',
      lat: 55.7558,
      lng: 37.6173,
      baseNoise: 69,
      population: 12500000,
      landmarks: {
        'Red Square': [55.7541, 37.6215],
        'Kremlin': [55.7517, 37.6178],
        "St. Basil's Cathedral": [55.7525, 37.6231],
        'Bolshoi Theatre': [55.7600, 37.6185],
        'Gorky Park': [55.7293, 37.6000],
        'Arbat Street': [55.7500, 37.6000],
        'Sparrow Hills': [55.7050, 37.5370],
        'Tretyakov Gallery': [55.7410, 37.6200],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Moscow State University', type: 'school', lat: 55.7037, lng: 37.5285, baseNoise: 62 },
        { id: 'hospital-1', name: 'Sechenov University Hospital', type: 'hospital', lat: 55.7300, lng: 37.5830, baseNoise: 60 },
        { id: 'library-1', name: 'Russian State Library', type: 'library', lat: 55.7512, lng: 37.6106, baseNoise: 48 },
        { id: 'school-2', name: 'Moscow Institute of Physics and Technology', type: 'school', lat: 55.9280, lng: 37.5200, baseNoise: 60 },
        { id: 'hospital-2', name: 'Botkin Hospital', type: 'hospital', lat: 55.8000, lng: 37.5680, baseNoise: 58 },
        { id: 'library-2', name: 'Moscow Public Library', type: 'library', lat: 55.7500, lng: 37.6150, baseNoise: 46 },
      ],
      zoneGroups: {
        school: { cards: ['Moscow State University', 'Moscow Institute of Physics and Technology'], name: 'Moscow Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Sechenov University Hospital', 'Botkin Hospital'], name: 'Moscow Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Russian State Library', 'Moscow Public Library'], name: 'Moscow Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Ireland': {
      name: 'Dublin Case Study',
      lat: 53.3498,
      lng: -6.2603,
      baseNoise: 57,
      population: 1200000,
      landmarks: {
        'Guinness Storehouse': [53.3418, -6.2869],
        'Temple Bar': [53.3460, -6.2629],
        "St. Stephen's Green": [53.3378, -6.2590],
        'Dublin Castle': [53.3430, -6.2670],
        'Christ Church Cathedral': [53.3435, -6.2714],
        'Phoenix Park': [53.3583, -6.3300],
        "Ha'penny Bridge": [53.3465, -6.2631],
        "St. Patrick's Cathedral": [53.3394, -6.2714],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Trinity College Dublin', type: 'school', lat: 53.3434, lng: -6.2546, baseNoise: 50 },
        { id: 'hospital-1', name: "St. James's Hospital", type: 'hospital', lat: 53.3380, lng: -6.2860, baseNoise: 48 },
        { id: 'library-1', name: 'National Library of Ireland', type: 'library', lat: 53.3410, lng: -6.2530, baseNoise: 37 },
        { id: 'school-2', name: 'University College Dublin', type: 'school', lat: 53.3190, lng: -6.2200, baseNoise: 49 },
        { id: 'hospital-2', name: 'Mater Hospital', type: 'hospital', lat: 53.3550, lng: -6.2620, baseNoise: 46 },
        { id: 'library-2', name: 'Dublin City Library', type: 'library', lat: 53.3470, lng: -6.2645, baseNoise: 36 },
      ],
      zoneGroups: {
        school: { cards: ['Trinity College Dublin', 'University College Dublin'], name: 'Dublin Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ["St. James's Hospital", 'Mater Hospital'], name: 'Dublin Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library of Ireland', 'Dublin City Library'], name: 'Dublin Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Switzerland': {
      name: 'Zurich Case Study',
      lat: 47.3769,
      lng: 8.5417,
      baseNoise: 56,
      population: 415000,
      landmarks: {
        'Bahnhofstrasse': [47.3748, 8.5396],
        'Lake Zurich': [47.3630, 8.5440],
        'Old Town (Altstadt)': [47.3710, 8.5430],
        'Grossmunster': [47.3703, 8.5437],
        'Kunsthaus Zurich': [47.3700, 8.5480],
        'Zurich Opera House': [47.3649, 8.5461],
        'ETH Zurich': [47.3762, 8.5477],
        'Niederdorf': [47.3730, 8.5430],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'ETH Zurich', type: 'school', lat: 47.3762, lng: 8.5477, baseNoise: 49 },
        { id: 'hospital-1', name: 'University Hospital Zurich', type: 'hospital', lat: 47.3960, lng: 8.5540, baseNoise: 48 },
        { id: 'library-1', name: 'Zurich Central Library', type: 'library', lat: 47.3690, lng: 8.5450, baseNoise: 36 },
        { id: 'school-2', name: 'University of Zurich', type: 'school', lat: 47.3747, lng: 8.5482, baseNoise: 48 },
        { id: 'hospital-2', name: 'Triemli Hospital', type: 'hospital', lat: 47.3780, lng: 8.5010, baseNoise: 46 },
        { id: 'library-2', name: 'ETH Library', type: 'library', lat: 47.3765, lng: 8.5470, baseNoise: 35 },
      ],
      zoneGroups: {
        school: { cards: ['ETH Zurich', 'University of Zurich'], name: 'Zurich Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['University Hospital Zurich', 'Triemli Hospital'], name: 'Zurich Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Zurich Central Library', 'ETH Library'], name: 'Zurich Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'New Zealand': {
      name: 'Auckland Case Study',
      lat: -36.8485,
      lng: 174.7633,
      baseNoise: 56,
      population: 1600000,
      landmarks: {
        'Sky Tower': [-36.8484, 174.7621],
        'Viaduct Harbour': [-36.8410, 174.7610],
        'Auckland Domain': [-36.8620, 174.7740],
        'Mission Bay': [-36.8510, 174.8300],
        'Ponsonby': [-36.8550, 174.7450],
        'Devonport': [-36.8300, 174.7960],
        'Waiheke Island': [-36.8000, 175.0950],
        'Mount Eden': [-36.8750, 174.7640],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Auckland', type: 'school', lat: -36.8503, lng: 174.7698, baseNoise: 49 },
        { id: 'hospital-1', name: 'Auckland City Hospital', type: 'hospital', lat: -36.8580, lng: 174.7680, baseNoise: 47 },
        { id: 'library-1', name: 'Auckland Central Library', type: 'library', lat: -36.8500, lng: 174.7660, baseNoise: 36 },
        { id: 'school-2', name: 'Auckland University of Technology', type: 'school', lat: -36.8540, lng: 174.7670, baseNoise: 47 },
        { id: 'hospital-2', name: 'Middlemore Hospital', type: 'hospital', lat: -36.9630, lng: 174.8390, baseNoise: 45 },
        { id: 'library-2', name: 'University of Auckland Library', type: 'library', lat: -36.8510, lng: 174.7700, baseNoise: 35 },
      ],
      zoneGroups: {
        school: { cards: ['University of Auckland', 'Auckland University of Technology'], name: 'Auckland Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Auckland City Hospital', 'Middlemore Hospital'], name: 'Auckland Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Auckland Central Library', 'University of Auckland Library'], name: 'Auckland Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Colombia': {
      name: 'Bogota Case Study',
      lat: 4.7110,
      lng: -74.0721,
      baseNoise: 68,
      population: 8000000,
      landmarks: {
        'La Candelaria': [4.5954, -74.0735],
        'Monserrate': [4.6052, -74.0524],
        'Plaza Bolivar': [4.5980, -74.0750],
        'Museo del Oro': [4.5960, -74.0730],
        'Usaquen': [4.7690, -74.0290],
        'Parque 93': [4.6830, -74.0490],
        'Zona Rosa': [4.6720, -74.0550],
        'Simon Bolivar Park': [4.6570, -74.0880],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'National University of Colombia', type: 'school', lat: 4.6380, lng: -74.0840, baseNoise: 61 },
        { id: 'hospital-1', name: 'Hospital San Ignacio', type: 'hospital', lat: 4.6110, lng: -74.0620, baseNoise: 59 },
        { id: 'library-1', name: 'Luis Angel Arango Library', type: 'library', lat: 4.5970, lng: -74.0740, baseNoise: 48 },
        { id: 'school-2', name: 'Universidad de los Andes', type: 'school', lat: 4.6010, lng: -74.0590, baseNoise: 59 },
        { id: 'hospital-2', name: 'Hospital Santa Fe', type: 'hospital', lat: 4.6720, lng: -74.0480, baseNoise: 57 },
        { id: 'library-2', name: 'Bogota Public Library', type: 'library', lat: 4.6400, lng: -74.0780, baseNoise: 46 },
      ],
      zoneGroups: {
        school: { cards: ['National University of Colombia', 'Universidad de los Andes'], name: 'Bogota Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Hospital San Ignacio', 'Hospital Santa Fe'], name: 'Bogota Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Luis Angel Arango Library', 'Bogota Public Library'], name: 'Bogota Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Chile': {
      name: 'Santiago Case Study',
      lat: -33.4489,
      lng: -70.6693,
      baseNoise: 63,
      population: 6200000,
      landmarks: {
        'Plaza de Armas': [-33.4377, -70.6515],
        'La Moneda': [-33.4446, -70.6571],
        'Cerro San Cristobal': [-33.4250, -70.6320],
        'Bellavista': [-33.4350, -70.6360],
        'Barrio Lastarria': [-33.4420, -70.6420],
        'Providencia': [-33.4250, -70.6090],
        'Las Condes': [-33.4180, -70.5850],
        'Mercado Central': [-33.4350, -70.6530],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Chile', type: 'school', lat: -33.4451, lng: -70.6610, baseNoise: 56 },
        { id: 'hospital-1', name: 'Hospital Clinico UC', type: 'hospital', lat: -33.4430, lng: -70.6340, baseNoise: 54 },
        { id: 'library-1', name: 'National Library of Chile', type: 'library', lat: -33.4430, lng: -70.6450, baseNoise: 43 },
        { id: 'school-2', name: 'Pontifical Catholic University of Chile', type: 'school', lat: -33.4410, lng: -70.6370, baseNoise: 54 },
        { id: 'hospital-2', name: 'Hospital del Salvador', type: 'hospital', lat: -33.4280, lng: -70.6160, baseNoise: 52 },
        { id: 'library-2', name: 'Santiago Public Library', type: 'library', lat: -33.4380, lng: -70.6500, baseNoise: 41 },
      ],
      zoneGroups: {
        school: { cards: ['University of Chile', 'Pontifical Catholic University of Chile'], name: 'Santiago Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Hospital Clinico UC', 'Hospital del Salvador'], name: 'Santiago Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library of Chile', 'Santiago Public Library'], name: 'Santiago Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Israel': {
      name: 'Tel Aviv Case Study',
      lat: 32.0853,
      lng: 34.7818,
      baseNoise: 64,
      population: 460000,
      landmarks: {
        'Jaffa Old City': [32.0500, 34.7540],
        'Rothschild Boulevard': [32.0650, 34.7770],
        'Carmel Market': [32.0690, 34.7710],
        'Tel Aviv Port': [32.1000, 34.7800],
        'Sarona Market': [32.0800, 34.7900],
        'Neve Tzedek': [32.0640, 34.7650],
        'Azrieli Center': [32.0740, 34.7920],
        'Yarkon Park': [32.0950, 34.7980],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Tel Aviv University', type: 'school', lat: 32.1115, lng: 34.8043, baseNoise: 57 },
        { id: 'hospital-1', name: 'Ichilov Hospital', type: 'hospital', lat: 32.0820, lng: 34.7840, baseNoise: 55 },
        { id: 'library-1', name: 'Beit Ariela Library', type: 'library', lat: 32.0700, lng: 34.7730, baseNoise: 43 },
        { id: 'school-2', name: 'Shenkar College', type: 'school', lat: 32.0720, lng: 34.7850, baseNoise: 55 },
        { id: 'hospital-2', name: 'Assuta Hospital', type: 'hospital', lat: 32.0860, lng: 34.7880, baseNoise: 53 },
        { id: 'library-2', name: 'Tel Aviv Central Library', type: 'library', lat: 32.0750, lng: 34.7800, baseNoise: 41 },
      ],
      zoneGroups: {
        school: { cards: ['Tel Aviv University', 'Shenkar College'], name: 'Tel Aviv Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Ichilov Hospital', 'Assuta Hospital'], name: 'Tel Aviv Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Beit Ariela Library', 'Tel Aviv Central Library'], name: 'Tel Aviv Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Austria': {
      name: 'Vienna Case Study',
      lat: 48.2082,
      lng: 16.3738,
      baseNoise: 58,
      population: 1900000,
      landmarks: {
        "St. Stephen's Cathedral": [48.2085, 16.3731],
        'Schonbrunn Palace': [48.1848, 16.3122],
        'Hofburg Palace': [48.2067, 16.3664],
        'Belvedere Palace': [48.1916, 16.3809],
        'Prater': [48.2163, 16.3959],
        'Naschmarkt': [48.1977, 16.3608],
        'Rathaus': [48.2108, 16.3576],
        'Vienna State Opera': [48.2022, 16.3686],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Vienna', type: 'school', lat: 48.2128, lng: 16.3596, baseNoise: 51 },
        { id: 'hospital-1', name: 'Vienna General Hospital (AKH)', type: 'hospital', lat: 48.2180, lng: 16.3480, baseNoise: 50 },
        { id: 'library-1', name: 'Austrian National Library', type: 'library', lat: 48.2058, lng: 16.3657, baseNoise: 39 },
        { id: 'school-2', name: 'TU Wien', type: 'school', lat: 48.1992, lng: 16.3670, baseNoise: 50 },
        { id: 'hospital-2', name: 'Hanusch Hospital', type: 'hospital', lat: 48.1820, lng: 16.3260, baseNoise: 48 },
        { id: 'library-2', name: 'Vienna Public Library', type: 'library', lat: 48.2120, lng: 16.3540, baseNoise: 38 },
      ],
      zoneGroups: {
        school: { cards: ['University of Vienna', 'TU Wien'], name: 'Vienna Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Vienna General Hospital (AKH)', 'Hanusch Hospital'], name: 'Vienna Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Austrian National Library', 'Vienna Public Library'], name: 'Vienna Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Indonesia': {
      name: 'Jakarta Case Study',
      lat: -6.2088,
      lng: 106.8456,
      baseNoise: 75,
      population: 10500000,
      landmarks: {
        'National Monument (Monas)': [-6.1754, 106.8272],
        'Kota Tua': [-6.1363, 106.8162],
        'Grand Indonesia': [-6.1944, 106.8209],
        'Ancol Dreamland': [-6.1220, 106.8450],
        'Ragunan Zoo': [-6.3050, 106.8200],
        'Taman Mini': [-6.3014, 106.8915],
        'Pantai Indah Kapuk': [-6.1130, 106.7570],
        'Senayan': [-6.2240, 106.8050],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of Indonesia', type: 'school', lat: -6.3637, lng: 106.8285, baseNoise: 67 },
        { id: 'hospital-1', name: 'RSCM National Hospital', type: 'hospital', lat: -6.1980, lng: 106.8450, baseNoise: 65 },
        { id: 'library-1', name: 'National Library of Indonesia', type: 'library', lat: -6.2250, lng: 106.8490, baseNoise: 52 },
        { id: 'school-2', name: 'Binus University', type: 'school', lat: -6.1980, lng: 106.7830, baseNoise: 65 },
        { id: 'hospital-2', name: 'Medistra Hospital', type: 'hospital', lat: -6.2260, lng: 106.8110, baseNoise: 63 },
        { id: 'library-2', name: 'Jakarta Public Library', type: 'library', lat: -6.1900, lng: 106.8330, baseNoise: 50 },
      ],
      zoneGroups: {
        school: { cards: ['University of Indonesia', 'Binus University'], name: 'Jakarta Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['RSCM National Hospital', 'Medistra Hospital'], name: 'Jakarta Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library of Indonesia', 'Jakarta Public Library'], name: 'Jakarta Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Vietnam': {
      name: 'Ho Chi Minh City Case Study',
      lat: 10.8231,
      lng: 106.6297,
      baseNoise: 74,
      population: 9000000,
      landmarks: {
        'Ben Thanh Market': [10.7727, 106.6984],
        'Notre Dame Cathedral': [10.7796, 106.6993],
        'War Remnants Museum': [10.7796, 106.6919],
        'Bitexco Tower': [10.7719, 106.7040],
        'Nguyen Hue Street': [10.7720, 106.7040],
        'Cu Chi Tunnels': [11.0526, 106.5169],
        'Saigon Zoo': [10.7870, 106.7040],
        'District 1 Center': [10.7760, 106.7010],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Vietnam National University HCMC', type: 'school', lat: 10.8699, lng: 106.8019, baseNoise: 66 },
        { id: 'hospital-1', name: 'Cho Ray Hospital', type: 'hospital', lat: 10.7580, lng: 106.6610, baseNoise: 64 },
        { id: 'library-1', name: 'HCMC General Library', type: 'library', lat: 10.7740, lng: 106.6970, baseNoise: 50 },
        { id: 'school-2', name: 'RMIT University Saigon', type: 'school', lat: 10.7320, lng: 106.6990, baseNoise: 64 },
        { id: 'hospital-2', name: 'FV Hospital', type: 'hospital', lat: 10.7380, lng: 106.6990, baseNoise: 62 },
        { id: 'library-2', name: 'Binh Thanh Library', type: 'library', lat: 10.7960, lng: 106.7010, baseNoise: 48 },
      ],
      zoneGroups: {
        school: { cards: ['Vietnam National University HCMC', 'RMIT University Saigon'], name: 'HCMC Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Cho Ray Hospital', 'FV Hospital'], name: 'HCMC Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['HCMC General Library', 'Binh Thanh Library'], name: 'HCMC Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Philippines': {
      name: 'Manila Case Study',
      lat: 14.5995,
      lng: 120.9842,
      baseNoise: 74,
      population: 1800000,
      landmarks: {
        'Intramuros': [14.5900, 120.9740],
        'Rizal Park': [14.5837, 120.9789],
        'Fort Santiago': [14.5945, 120.9703],
        'Makati CBD': [14.5547, 121.0244],
        'Bonifacio Global City': [14.5480, 121.0530],
        'Malacanang Palace': [14.5940, 120.9960],
        'Binondo': [14.6000, 120.9750],
        'Manila Baywalk': [14.5600, 120.9700],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'University of the Philippines Manila', type: 'school', lat: 14.5780, lng: 120.9860, baseNoise: 66 },
        { id: 'hospital-1', name: 'Philippine General Hospital', type: 'hospital', lat: 14.5780, lng: 120.9850, baseNoise: 64 },
        { id: 'library-1', name: 'National Library of the Philippines', type: 'library', lat: 14.5780, lng: 120.9810, baseNoise: 52 },
        { id: 'school-2', name: 'De La Salle University', type: 'school', lat: 14.5660, lng: 120.9930, baseNoise: 64 },
        { id: 'hospital-2', name: 'Manila Doctors Hospital', type: 'hospital', lat: 14.5720, lng: 120.9870, baseNoise: 62 },
        { id: 'library-2', name: 'Manila Public Library', type: 'library', lat: 14.5900, lng: 120.9770, baseNoise: 50 },
      ],
      zoneGroups: {
        school: { cards: ['University of the Philippines Manila', 'De La Salle University'], name: 'Manila Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Philippine General Hospital', 'Manila Doctors Hospital'], name: 'Manila Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['National Library of the Philippines', 'Manila Public Library'], name: 'Manila Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Saudi Arabia': {
      name: 'Riyadh Case Study',
      lat: 24.7136,
      lng: 46.6753,
      baseNoise: 62,
      population: 7700000,
      landmarks: {
        'Kingdom Centre': [24.7110, 46.6740],
        'Al Faisal Tower': [24.6860, 46.6850],
        'National Museum': [24.6460, 46.7120],
        'Masmak Fortress': [24.6310, 46.7140],
        'King Abdullah Park': [24.6430, 46.7040],
        'Al Batha Market': [24.6350, 46.7100],
        'Diplomatic Quarter': [24.6690, 46.6590],
        'Riyadh Front': [24.7930, 46.6510],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'King Saud University', type: 'school', lat: 24.7211, lng: 46.6481, baseNoise: 55 },
        { id: 'hospital-1', name: 'King Faisal Specialist Hospital', type: 'hospital', lat: 24.6880, lng: 46.6720, baseNoise: 53 },
        { id: 'library-1', name: 'King Fahad National Library', type: 'library', lat: 24.7000, lng: 46.6800, baseNoise: 42 },
        { id: 'school-2', name: 'Princess Noura University', type: 'school', lat: 24.8430, lng: 46.7470, baseNoise: 53 },
        { id: 'hospital-2', name: 'King Khalid University Hospital', type: 'hospital', lat: 24.7220, lng: 46.6440, baseNoise: 51 },
        { id: 'library-2', name: 'Riyadh Public Library', type: 'library', lat: 24.6400, lng: 46.7100, baseNoise: 40 },
      ],
      zoneGroups: {
        school: { cards: ['King Saud University', 'Princess Noura University'], name: 'Riyadh Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['King Faisal Specialist Hospital', 'King Khalid University Hospital'], name: 'Riyadh Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['King Fahad National Library', 'Riyadh Public Library'], name: 'Riyadh Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Morocco': {
      name: 'Casablanca Case Study',
      lat: 33.5731,
      lng: -7.5898,
      baseNoise: 63,
      population: 3700000,
      landmarks: {
        'Hassan II Mosque': [33.6088, -7.6329],
        'Old Medina': [33.5720, -7.6200],
        'Corniche': [33.5940, -7.6490],
        'Place Mohammed V': [33.5750, -7.6030],
        'Ain Diab': [33.5850, -7.6550],
        'Morocco Mall': [33.5900, -7.6500],
        'Central Market': [33.5710, -7.6100],
        'Sqala Garden': [33.5670, -7.6170],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Hassan II University', type: 'school', lat: 33.5000, lng: -7.6300, baseNoise: 56 },
        { id: 'hospital-1', name: 'CHU Ibn Rochd', type: 'hospital', lat: 33.5800, lng: -7.6200, baseNoise: 54 },
        { id: 'library-1', name: 'Bibliotheque Nationale', type: 'library', lat: 33.5700, lng: -7.6050, baseNoise: 43 },
        { id: 'school-2', name: 'Universite Internationale', type: 'school', lat: 33.5200, lng: -7.6600, baseNoise: 54 },
        { id: 'hospital-2', name: 'Clinique Agdal', type: 'hospital', lat: 33.5650, lng: -7.6150, baseNoise: 52 },
        { id: 'library-2', name: 'Casablanca Public Library', type: 'library', lat: 33.5750, lng: -7.6080, baseNoise: 41 },
      ],
      zoneGroups: {
        school: { cards: ['Hassan II University', 'Universite Internationale'], name: 'Casablanca Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['CHU Ibn Rochd', 'Clinique Agdal'], name: 'Casablanca Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Bibliotheque Nationale', 'Casablanca Public Library'], name: 'Casablanca Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
    'Ukraine': {
      name: 'Kyiv Case Study',
      lat: 50.4501,
      lng: 30.5234,
      baseNoise: 60,
      population: 2900000,
      landmarks: {
        'Kyiv Pechersk Lavra': [50.4349, 30.5583],
        'Saint Sophia Cathedral': [50.4547, 30.5138],
        'Maidan Nezalezhnosti': [50.4501, 30.5237],
        'Khreshchatyk Street': [50.4470, 30.5190],
        'Golden Gate': [50.4487, 30.5131],
        'Andriyivskyi Descent': [50.4620, 30.5140],
        'Mariinskyi Palace': [50.4470, 30.5410],
        'Kyiv Zoo': [50.4550, 30.4650],
      },
      sensitiveZones: [
        { id: 'school-1', name: 'Taras Shevchenko University', type: 'school', lat: 50.4430, lng: 30.5050, baseNoise: 54 },
        { id: 'hospital-1', name: 'Kyiv City Hospital', type: 'hospital', lat: 50.4520, lng: 30.4900, baseNoise: 51 },
        { id: 'library-1', name: 'Vernadsky National Library', type: 'library', lat: 50.3750, lng: 30.4800, baseNoise: 42 },
        { id: 'school-2', name: 'Kyiv Polytechnic Institute', type: 'school', lat: 50.4490, lng: 30.4560, baseNoise: 52 },
        { id: 'hospital-2', name: 'Feofaniya Hospital', type: 'hospital', lat: 50.4000, lng: 30.5000, baseNoise: 49 },
        { id: 'library-2', name: 'Kyiv Public Library', type: 'library', lat: 50.4500, lng: 30.5200, baseNoise: 40 },
      ],
      zoneGroups: {
        school: { cards: ['Taras Shevchenko University', 'Kyiv Polytechnic Institute'], name: 'Kyiv Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['Kyiv City Hospital', 'Feofaniya Hospital'], name: 'Kyiv Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Vernadsky National Library', 'Kyiv Public Library'], name: 'Kyiv Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    },
  };

  function getCaseStudy(country) {
    if (!country || country === 'Other') return CASE_STUDIES['United States'];
    return CASE_STUDIES[country] || {
      name: country + ' Case Study',
      lat: 0, lng: 0, baseNoise: 60, population: 1000000,
      landmarks: { 'City Center': [0, 0], 'Central Station': [0.01, 0.01] },
      sensitiveZones: [
        { id: 'school-1', name: 'Local School', type: 'school', lat: 0.005, lng: 0.005, baseNoise: 55 },
        { id: 'hospital-1', name: 'General Hospital', type: 'hospital', lat: -0.005, lng: 0.005, baseNoise: 52 },
        { id: 'library-1', name: 'Public Library', type: 'library', lat: 0, lng: 0.01, baseNoise: 42 },
        { id: 'school-2', name: 'University Campus', type: 'school', lat: -0.01, lng: -0.01, baseNoise: 53 },
        { id: 'hospital-2', name: 'City Hospital', type: 'hospital', lat: 0.01, lng: -0.01, baseNoise: 50 },
        { id: 'library-2', name: 'City Library', type: 'library', lat: -0.005, lng: -0.005, baseNoise: 40 },
      ],
      zoneGroups: {
        school: { cards: ['Local School', 'University Campus'], name: 'Schools', icon: 'fa-school', color: '#06B6D4' },
        hospital: { cards: ['General Hospital', 'City Hospital'], name: 'Hospitals', icon: 'fa-hospital', color: '#EF4444' },
        library: { cards: ['Public Library', 'City Library'], name: 'Libraries', icon: 'fa-book', color: '#F59E0B' },
      },
    };
  }

  function generateMapHotspots(caseStudy) {
    const cs = caseStudy || CASE_STUDIES['United States'];
    const center = [cs.lat, cs.lng];
    const landmarkNames = cs.landmarks ? Object.keys(cs.landmarks) : [];
    const zones = [
      { name: landmarkNames[0] || 'Downtown', latOff: 0.003, lngOff: -0.002, intensity: 0.9 },
      { name: landmarkNames[1] || 'City Center', latOff: 0.002, lngOff: 0.004, intensity: 1.0 },
      { name: landmarkNames[2] || 'Park', latOff: 0.01, lngOff: -0.003, intensity: 0.2 },
      { name: landmarkNames[3] || 'District', latOff: -0.006, lngOff: 0, intensity: 0.85 },
      { name: landmarkNames[4] || 'Suburb', latOff: 0.005, lngOff: 0.002, intensity: 0.8 },
      { name: landmarkNames[5] || 'East Side', latOff: 0.015, lngOff: 0, intensity: 0.4 },
      { name: landmarkNames[6] || 'Bridge Area', latOff: -0.004, lngOff: 0.007, intensity: 0.7 },
      { name: landmarkNames[7] || 'Waterfront', latOff: 0.004, lngOff: -0.006, intensity: 0.75 },
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

  function distToLine(lat, lng, lat1, lng1, lat2, lng2) {
    const A = lat - lat1;
    const B = lng - lng1;
    const C = lat2 - lat1;
    const D = lng2 - lng1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const t = lenSq !== 0 ? clamp(dot / lenSq, 0, 1) : 0;
    const projLat = lat1 + t * C;
    const projLng = lng1 + t * D;
    return Math.sqrt((lat - projLat) * (lat - projLat) + (lng - projLng) * (lng - projLng));
  }

  const votingState = {};

  const defaultRecommendations = [
    { problem: 'Traffic Noise', solution: 'Install acoustic barriers', impact: 'High' },
    { problem: 'Echo / Reverberation', solution: 'Add sound-absorbing panels', impact: 'Medium' },
  ];

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
    const prox = { 'Direct (0-10m)': 20, 'Near (10-50m)': 10, 'Moderate (50-200m)': 3, 'Far (200m+)': -5 }[proximity] || 10;
    const flr = { '1-3': 0, '4-8': 2, '9-15': 5, '16+': 8 }[floors] || 0;
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

  const state = {
    currentSection: 'dashboard',
    currentNoise: 67,
    hourlyData: [],
    sourceData: [],
    weeklyData: [],
    hotspots: [],
    forecastPeriod: 'today',
    buildingType: 'school',
    buildingFloors: '4-8',
    buildingProximity: 'Near (10-50m)',
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
    caseStudy: null,
    baseNoise: 67,
  };

  let gaugeCanvas, gaugeValue;
  let hourlyChartInstance, forecastChartInstance;
  let mapInstance;
  let updateInterval;
  let userMarker, zoneLayer;
  const initializedSections = new Set();
  let currentSensitiveZones = [];



  function applyCaseStudy(cs) {
    state.caseStudy = cs;
    state.lat = cs.lat;
    state.lng = cs.lng;
    state.locationName = cs.name;
    state.baseNoise = cs.baseNoise;
    state.currentNoise = generateNoiseProfile(cs.baseNoise, 3);
    state.hourlyData = generateHourlyData(cs.baseNoise);
    state.weeklyData = generateWeeklyData(cs.baseNoise);
    state.hotspots = generateMapHotspots(cs);
    currentSensitiveZones = JSON.parse(JSON.stringify(cs.sensitiveZones || []));
    state.zoneGroups = cs.zoneGroups || {};

    const name = document.getElementById('locationName');
    const dash = document.getElementById('dashLocation');
    const mapLoc = document.getElementById('mapLocation');
    const fcLoc = document.getElementById('forecastLocation');
    const sidebarOrg = document.getElementById('sidebarOrg');
    const orgSubtitle = document.getElementById('orgSubtitle');
    const label = cs.name;
    if (name) name.textContent = label;
    if (dash) dash.textContent = label;
    if (mapLoc) mapLoc.textContent = label;
    if (fcLoc) fcLoc.textContent = label;
    if (sidebarOrg) sidebarOrg.textContent = label;
    if (orgSubtitle) orgSubtitle.textContent = 'Noise Intelligence for ' + cs.name;

    if (mapInstance) {
      mapInstance.setView([cs.lat, cs.lng], 13);
    }

    if (document.getElementById('noiseMap')) {
      if (mapInstance) {
        const layersToRemove = [];
        mapInstance.eachLayer(layer => {
          if (layer.options && typeof layer.getLatLng === 'function') {
            if (layer.options.radius || layer.options.fillColor) {
              layersToRemove.push(layer);
            }
          }
        });
        layersToRemove.forEach(l => mapInstance.removeLayer(l));

        state.hotspots.forEach(h => {
          const radius = 50 + h.intensity * 150;
          const color = h.intensity > 0.7 ? COLORS.red : h.intensity > 0.5 ? COLORS.orange : h.intensity > 0.3 ? COLORS.amber : COLORS.emerald;
          L.circle([h.lat, h.lng], {
            radius, color, fillColor: color, fillOpacity: 0.12 + h.intensity * 0.25, weight: 1, opacity: 0.4,
          }).addTo(mapInstance).bindPopup('<b>' + h.name + '</b><br>Noise: ' + h.noise + ' dB');

          L.circleMarker([h.lat, h.lng], {
            radius: 3 + h.intensity * 4, color, fillColor: color, fillOpacity: 0.8, weight: 1,
          }).addTo(mapInstance);
        });
      }
      const hotEl = document.getElementById('mapHotspots');
      if (hotEl) hotEl.textContent = state.hotspots.length;
      const maxEl = document.getElementById('mapMax');
      if (maxEl) maxEl.textContent = Math.max(...state.hotspots.map(h => h.noise)) + ' dB';
    }

    renderSensitiveZones();
    renderDashboard();
    renderForecast();
  }

  function init() {
    gaugeCanvas = document.getElementById('noiseGauge');
    gaugeValue = document.getElementById('gaugeValue');

    const savedUser = getCurrentUser();
    state.currentUser = savedUser;
    if (savedUser && savedUser.country) {
      const cs = getCaseStudy(savedUser.country);
      state.caseStudy = cs;
      state.lat = cs.lat;
      state.lng = cs.lng;
      state.locationName = cs.name;
      state.baseNoise = cs.baseNoise;
      state.currentNoise = generateNoiseProfile(cs.baseNoise, 3);
      state.hourlyData = generateHourlyData(cs.baseNoise);
      state.weeklyData = generateWeeklyData(cs.baseNoise);
      state.hotspots = generateMapHotspots(cs);
      currentSensitiveZones = JSON.parse(JSON.stringify(cs.sensitiveZones || []));
      state.zoneGroups = cs.zoneGroups || {};
    } else {
      const defaultCs = CASE_STUDIES['United States'];
      state.caseStudy = defaultCs;
      state.currentNoise = generateNoiseProfile(defaultCs.baseNoise, 3);
      state.hourlyData = generateHourlyData(defaultCs.baseNoise);
      state.sourceData = generateSourceDistribution(defaultCs.baseNoise);
      state.weeklyData = generateWeeklyData(defaultCs.baseNoise);
      state.hotspots = generateMapHotspots(defaultCs);
      currentSensitiveZones = JSON.parse(JSON.stringify(defaultCs.sensitiveZones || []));
      state.zoneGroups = defaultCs.zoneGroups || {};
    }

    initDarkToggle();
    initNavigation();
    initMobileToggle();
    initRecording();
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
      renderSensors();
    }, 5000);

    initClippy();
    initLayoutPresets();
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

    if (section === 'dashboard') {
      renderSensors();
    }
    if (section === 'map' && mapInstance) {
      setTimeout(() => mapInstance.invalidateSize(), 300);
    }
  }

  function initSectionOnce(section) {
    if (initializedSections.has(section)) return;
    initializedSections.add(section);
  }

  function reRenderThemeDependent() {
    setTimeout(() => {
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

        if (card.contains(document.getElementById('hourlyChart'))) {
          if (hourlyChartInstance) { hourlyChartInstance.resize(); }
        }
        if (card.contains(document.getElementById('forecastChart'))) {
          if (forecastChartInstance) { forecastChartInstance.resize(); }
        }

        if (card.contains(document.getElementById('noiseGauge'))) {
          drawGauge(document.getElementById('noiseGauge'), state.currentNoise);
        }

        if (card.contains(document.getElementById('noiseMap')) && typeof mapInstance !== 'undefined' && mapInstance) {
          setTimeout(() => mapInstance.invalidateSize(), 100);
        }
      });
    });

    document.querySelectorAll('.card, .zone-card').forEach(el => ro.observe(el));
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
      return;
    }

    const options = { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 };

    function success(pos) {
      state.lat = pos.coords.latitude;
      state.lng = pos.coords.longitude;
      state.locationSet = true;
      state.hourlyData = generateHourlyData(state.currentNoise || state.baseNoise);
      state.weeklyData = generateWeeklyData(state.currentNoise || state.baseNoise);
      currentSensitiveZones = generateLocalProtectiveZones();
      reverseGeocode(state.lat, state.lng);
      updateMapMarkers();
      renderSensitiveZones();
      renderForecast();
    }

    function error() {
      const name = document.getElementById('locationName');
      if (name && name.textContent === (state.locationName || 'NYC Case Study')) {
        fetch('https://ipapi.co/json/')
          .then(r => r.json())
          .then(data => {
            if (data.latitude && data.longitude) {
              state.lat = data.latitude;
              state.lng = data.longitude;
              state.locationSet = true;
              state.hourlyData = generateHourlyData(state.currentNoise || state.baseNoise);
              state.weeklyData = generateWeeklyData(state.currentNoise || state.baseNoise);
              currentSensitiveZones = generateLocalProtectiveZones();
              reverseGeocode(state.lat, state.lng);
              updateMapMarkers();
              renderSensitiveZones();
              renderForecast();
            }
          })
          .catch(() => {});
      }
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
      updateMapZones();
    }

    const watchId = navigator.geolocation.watchPosition(success, error, options);

    setTimeout(() => {
      if (!state.locationSet) {
        navigator.geolocation.clearWatch(watchId);
        navigator.geolocation.getCurrentPosition(success, error, { ...options, timeout: 5000 });
      }
    }, 12000);

    setTimeout(() => {
      if (!state.locationSet) {
        const cs = state.caseStudy || CASE_STUDIES['United States'];
        state.lat = cs.lat;
        state.lng = cs.lng;
        state.locationName = cs.name;
        updateLocationUI();
      }
    }, 20000);
  }

  function initRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setLabel('Mic not available');
      return;
    }
    setTimeout(startRecording, 1000);
  }

  function startRecording() {
    if (state.recordingStopping) return;
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
        state.recordingStartTime = Date.now();
        state.recordingSecond = 0;
        state.recordingStopping = false;
        state.lastAvg = 0;

        const btn = document.getElementById('recordBtn');
        if (btn) {
          btn.dataset.recording = 'true';
          btn.classList.add('recording');
          btn.classList.remove('stopping');
          btn.querySelector('i').className = 'fas fa-stop';
        }
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

          state.trendData.push({ time: (state.trendData.length + 1) + 'f', noise: db });
          if (state.trendData.length > 250) state.trendData = state.trendData.slice(-250);

          if (gaugeValue) gaugeValue.textContent = db;
          updateQuickStats(db);
          drawGauge(gaugeCanvas, db);

          const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
          if (elapsed > state.recordingSecond) {
            state.recordingSecond = elapsed;
            const sec = Math.min(elapsed, 15);
            setLabel('Recording ' + sec + '/15s');
            timerEl.textContent = sec + 's / 15s';
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
        setLabel('Mic denied — using simulation');
        startSimulatedRecording();
      });
  }

  function stopRecording() {
    if (state.recordingStopping) return;
    state.recordingStopping = true;
    const btn = document.getElementById('recordBtn');
    if (btn) {
      btn.classList.remove('recording');
      btn.classList.add('stopping');
      btn.querySelector('i').className = 'fas fa-hourglass-half';
    }
    setLabel('Finishing...');
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

    state.currentNoise = finalAvg;
    state.trendData = state.trendData.slice(-250);

    gaugeValue.textContent = finalAvg;
    drawGauge(gaugeCanvas, finalAvg);
    updateQuickStats(finalAvg);
    renderTrendChart();
    renderSensors();

    setLabel('Avg: ' + finalAvg + ' dB — pause 5s');
    const timerEl = document.querySelector('.record-timer');
    if (timerEl) timerEl.textContent = 'Pause: 5s';

    if (btn) {
      btn.dataset.recording = 'false';
      btn.classList.remove('recording', 'stopping');
      btn.querySelector('i').className = 'fas fa-microphone';
    }

    let pauseCount = 5;
    const pauseTimer = document.querySelector('.record-timer');
    const pauseInterval = setInterval(() => {
      pauseCount--;
      if (pauseTimer) pauseTimer.textContent = 'Pause: ' + pauseCount + 's';
      setLabel('Pause ' + pauseCount + '/5s');
      if (pauseCount <= 0) {
        clearInterval(pauseInterval);
        startRecording();
      }
    }, 1000);
  }

  function startSimulatedRecording() {
    state.recordingPhase = 'recording';
    state.micSamples = [];
    state.trendData = [];
    state.recordingStartTime = Date.now();
    state.recordingSecond = 0;
    state.recordingStopping = false;
    state.lastAvg = 0;
    state.usingMic = false;

    setLabel('Recording 0/15s');
    const timerEl = getOrCreateTimer();
    timerEl.textContent = '0s / 15s';

    const btn = document.getElementById('recordBtn');
    if (btn) {
      btn.dataset.recording = 'true';
      btn.classList.add('recording');
    }

    const cs = state.caseStudy || CASE_STUDIES['United States'];
    const base = cs.baseNoise || 67;

    state.micAnimFrame = requestAnimationFrame(function simSample() {
      if (state.recordingStopping) {
        finalizeRecording();
        return;
      }
      const db = clamp(Math.round(base + rand(-10, 10)), 20, 140);
      state.currentNoise = db;
      state.micSamples.push(db);

      state.trendData.push({ time: (state.trendData.length + 1) + 'f', noise: db });
      if (state.trendData.length > 250) state.trendData = state.trendData.slice(-250);

      if (gaugeValue) gaugeValue.textContent = db;
      updateQuickStats(db);
      drawGauge(gaugeCanvas, db);

      const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
      if (elapsed > state.recordingSecond) {
        state.recordingSecond = elapsed;
        const sec = Math.min(elapsed, 15);
        setLabel('Recording ' + sec + '/15s');
        timerEl.textContent = sec + 's / 15s';
        if (sec >= 15) {
          finalizeRecording();
          return;
        }
      }

      state.micAnimFrame = requestAnimationFrame(simSample);
    });
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

  let micSamplesPeak = -Infinity;
  let micSamplesLow = Infinity;
  let micSamplesSum = 0;
  let micSamplesCount = 0;
  let micAlertsCount = 0;

  function updateQuickStats(db) {
    if (state.usingMic) {
      if (db > micSamplesPeak) micSamplesPeak = db;
      if (db < micSamplesLow) micSamplesLow = db;
      micSamplesSum += db;
      micSamplesCount++;
      if (db > 70) micAlertsCount++;

      const peakEl = document.getElementById('statPeak');
      const lowEl = document.getElementById('statLow');
      const avgEl = document.getElementById('statAvg');
      const alertEl = document.getElementById('statAlerts');
      if (peakEl) peakEl.textContent = micSamplesPeak;
      if (lowEl) lowEl.textContent = micSamplesLow;
      if (avgEl) avgEl.textContent = Math.round(micSamplesSum / micSamplesCount);

      const statAlertsParent = alertEl?.closest('.stat-item');
      if (statAlertsParent) {
        const label = statAlertsParent.querySelector('.stat-label');
        if (label) label.textContent = 'Sample Count';
      }
      if (alertEl) alertEl.textContent = micSamplesCount;
    } else {
      micSamplesPeak = -Infinity;
      micSamplesLow = Infinity;
      micSamplesSum = 0;
      micSamplesCount = 0;
      micAlertsCount = 0;

      const hour = new Date().getHours();
      const nearHours = state.hourlyData.filter(d => Math.abs(d.hour - hour) <= 1);
      const peak = nearHours.length > 0 ? Math.max(...nearHours.map(d => d.noise)) : 0;
      const low = nearHours.length > 0 ? Math.min(...nearHours.map(d => d.noise)) : 0;
      const avg = state.hourlyData.length > 0
        ? Math.round(state.hourlyData.reduce((a, d) => a + d.noise, 0) / state.hourlyData.length)
        : 0;
      const alerts = state.hourlyData.filter(d => d.noise > 70).length;

      const peakEl = document.getElementById('statPeak');
      const lowEl = document.getElementById('statLow');
      const avgEl = document.getElementById('statAvg');
      const alertEl = document.getElementById('statAlerts');
      if (peakEl) peakEl.textContent = peak || '--';
      if (lowEl) lowEl.textContent = low || '--';
      if (avgEl) avgEl.textContent = avg || '--';

      const statAlertsParent = alertEl?.closest('.stat-item');
      if (statAlertsParent) {
        const label = statAlertsParent.querySelector('.stat-label');
        if (label) label.textContent = 'Active Alerts';
      }
      if (alertEl) alertEl.textContent = alerts || 0;
    }

    const riskIdx = getRiskIndex(db);
    document.querySelectorAll('.risk-ring-segment').forEach((seg, i) => {
      seg.classList.toggle('active', i <= riskIdx);
    });
    const risk = getRiskLevel(db);
    const colorMap = [COLORS.emerald, COLORS.amber, COLORS.orange, COLORS.red];
    const iconMap = ['fa-volume-low', 'fa-volume-low', 'fa-volume-high', 'fa-volume-high'];
    const descs = ['Safe levels', 'Caution in traffic areas', 'Health risk on exposure', 'Immediate action needed'];
    const riskEl = document.getElementById('riskStatus');
    if (riskEl) {
      riskEl.innerHTML = '<div class="risk-icon"><i class="fas ' + iconMap[riskIdx] + '" style="color:' + colorMap[riskIdx] + '"></i></div><div class="risk-label" style="color:' + colorMap[riskIdx] + '">' + risk.label + '</div><div class="risk-desc">' + descs[riskIdx] + '</div>';
    }
  }

  function renderDashboard() {
    drawGauge(gaugeCanvas, state.currentNoise);
    updateDashboardValues();
    renderTrendChart();
    renderSensors();
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

    const riskEl = document.getElementById('riskStatus');
    if (riskEl) {
      riskEl.innerHTML = '<div class="risk-icon"><i class="fas ' + iconMap[riskIdx] + '" style="color:' + colorMap[riskIdx] + '"></i></div><div class="risk-label" style="color:' + colorMap[riskIdx] + '">' + risk.label + '</div><div class="risk-desc">' + descs[riskIdx] + '</div>';
    }

    updateQuickStats(noise);

    const cs = state.caseStudy || CASE_STUDIES['United States'];
    const popScale = Math.min(cs.population / 8400000, 2);
    const trees = Math.round(1240 * popScale);
    const people = Math.round(2840 * popScale);
    const allStatValues = document.querySelectorAll('.stat-item .stat-value');
    if (allStatValues.length >= 8) {
      allStatValues[6].textContent = trees.toLocaleString();
      allStatValues[7].textContent = people.toLocaleString();
    }
    const allStatLabels = document.querySelectorAll('.stat-item .stat-label');
    if (allStatLabels.length >= 8) {
      allStatLabels[6].textContent = 'Trees Planted';
      allStatLabels[7].textContent = 'People Protected';
    }
  }

  function renderTrendChart() {
    const ctx = document.getElementById('hourlyChart')?.getContext('2d');
    if (!ctx) return;
    if (hourlyChartInstance) hourlyChartInstance.destroy();

    let data;
    let labels;

    if (state.usingMic && state.trendData.length > 0) {
      data = state.trendData;
      labels = data.map((d, i) => {
        if (i % 30 === 0) return (i / 60).toFixed(1) + 's';
        return '';
      });
    } else {
      const displayData = state.trendData && state.trendData.length > 0 ? state.trendData : state.hourlyData.slice(0, 15);
      data = displayData;
      labels = data.map((d, i) => {
        if (d.time) return d.time;
        return (i + 1) + 's';
      });
    }

    hourlyChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: data.map(d => d.noise),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.15)',
          pointBackgroundColor: '#10b981',
          pointRadius: 0,
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

    const baseNoise = state.currentNoise || state.baseNoise || 67;
    let hours;
    if (state.forecastPeriod === 'today') {
      hours = state.hourlyData;
    } else {
      if (!state._forecastCache || state._forecastBase !== baseNoise) {
        state._forecastCache = generateHourlyData(baseNoise + rand(-3, 3));
        state._forecastBase = baseNoise;
      }
      hours = state._forecastCache;
    }

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
    const baseNoise = state.currentNoise || state.baseNoise || 67;
    let hours;
    if (state.forecastPeriod === 'today') {
      hours = state.hourlyData;
    } else {
      if (!state._forecastCache || state._forecastBase !== baseNoise) {
        state._forecastCache = generateHourlyData(baseNoise + rand(-3, 3));
        state._forecastBase = baseNoise;
      }
      hours = state._forecastCache;
    }

    container.innerHTML = hours.map(h => {
      const risk = getRiskLevel(h.noise);
      const pct = clamp(((h.noise - 20) / 100) * 100, 0, 100);
      return `<div class="forecast-hour">
        <span class="fh-time">${h.time}</span>
        <div class="fh-bar-wrap">
          <div class="fh-bar">
            <div class="bar-fill ${risk.id}" style="height:${pct}%"></div>
          </div>
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
          <div class="daily-range-fill ${risk.id}" style="width:${pct}%"></div>
        </div>
        <span class="daily-low">${d.low}</span>
        <span class="daily-high">${d.high}</span>
      </div>`;
    }).join('');
  }

  function initMap() {
    const container = document.getElementById('noiseMap');
    if (!container || typeof L === 'undefined') return;

    const cs = state.caseStudy || CASE_STUDIES['United States'];

    mapInstance = L.map('noiseMap', {
      center: [state.lat || cs.lat, state.lng || cs.lng],
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
        radius, color, fillColor: color, fillOpacity: 0.12 + h.intensity * 0.25, weight: 1, opacity: 0.4,
      }).addTo(mapInstance).bindPopup(`<b>${h.name}</b><br>Noise: ${h.noise} dB`);

      L.circleMarker([h.lat, h.lng], {
        radius: 3 + h.intensity * 4, color, fillColor: color, fillOpacity: 0.8, weight: 1,
      }).addTo(mapInstance);
    });

    zoneLayer = L.layerGroup().addTo(mapInstance);
    const sz = currentSensitiveZones.length > 0 ? currentSensitiveZones : cs.sensitiveZones || [];
    addZoneMarkers(sz);

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

  function addZoneMarkers(zones) {
    if (!zoneLayer || !mapInstance) return;
    zoneLayer.clearLayers();
    zones.forEach(z => {
      const icons = { school: { icon: 'fa-school', color: '#06B6D4' }, hospital: { icon: 'fa-hospital', color: '#EF4444' }, library: { icon: 'fa-book', color: '#F59E0B' } };
      const zi = icons[z.type] || { icon: 'fa-building', color: '#10B981' };
      const markerIcon = L.divIcon({
        html: `<i class="fas ${zi.icon}" style="color:${zi.color};font-size:18px;text-shadow:0 0 8px ${zi.color}44"></i>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([z.lat, z.lng], { icon: markerIcon })
        .addTo(zoneLayer)
        .bindPopup(`<b>${z.name}</b><br>Protected Zone`);
    });
  }

  function updateMapZones() {
    if (zoneLayer && currentSensitiveZones.length > 0) {
      addZoneMarkers(currentSensitiveZones);
    }
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
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
    'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
    'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize',
    'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil',
    'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
    'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad',
    'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Côte d\'Ivoire',
    'Croatia', 'Cuba', 'Cyprus', 'Czech Republic (Czechia)',
    'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'DR Congo',
    'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
    'Eswatini', 'Ethiopia',
    'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala',
    'Guinea', 'Guinea-Bissau', 'Guyana',
    'Haiti', 'Honduras', 'Hungary',
    'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
    'Jamaica', 'Japan', 'Jordan',
    'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
    'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
    'Lithuania', 'Luxembourg',
    'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
    'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
    'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
    'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
    'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
    'Oman',
    'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
    'Philippines', 'Poland', 'Portugal',
    'Qatar',
    'Romania', 'Russia', 'Rwanda',
    'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
    'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia',
    'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
    'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
    'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
    'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
    'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
    'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
    'Uruguay', 'Uzbekistan',
    'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
    'Yemen',
    'Zambia', 'Zimbabwe',
    'Other',
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
        const cs = getCaseStudy(country);
        applyCaseStudy(cs);
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
        const cs = getCaseStudy(u.country);
        applyCaseStudy(cs);
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
    const defaultCs = CASE_STUDIES['United States'];
    applyCaseStudy(defaultCs);
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
      'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Andorra': '🇦🇩',
      'Angola': '🇦🇴', 'Argentina': '🇦🇷', 'Armenia': '🇦🇲', 'Australia': '🇦🇺',
      'Austria': '🇦🇹', 'Azerbaijan': '🇦🇿',
      'Bahamas': '🇧🇸', 'Bahrain': '🇧🇭', 'Bangladesh': '🇧🇩', 'Barbados': '🇧🇧',
      'Belarus': '🇧🇾', 'Belgium': '🇧🇪', 'Belize': '🇧🇿', 'Benin': '🇧🇯',
      'Bolivia': '🇧🇴', 'Bosnia and Herzegovina': '🇧🇦', 'Botswana': '🇧🇼',
      'Brazil': '🇧🇷', 'Brunei': '🇧🇳', 'Bulgaria': '🇧🇬', 'Burkina Faso': '🇧🇫',
      'Burundi': '🇧🇮',
      'Cabo Verde': '🇨🇻', 'Cambodia': '🇰🇭', 'Cameroon': '🇨🇲', 'Canada': '🇨🇦',
      'Chad': '🇹🇩', 'Chile': '🇨🇱', 'China': '🇨🇳', 'Colombia': '🇨🇴', 'Comoros': '🇰🇲',
      'Congo': '🇨🇬', 'Costa Rica': '🇨🇷', "Côte d'Ivoire": '🇨🇮', 'Croatia': '🇭🇷', 'Cuba': '🇨🇺', 'Cyprus': '🇨🇾',
      'Czech Republic (Czechia)': '🇨🇿',
      'Denmark': '🇩🇰', 'Djibouti': '🇩🇯', 'Dominica': '🇩🇲', 'Dominican Republic': '🇩🇴',
      'DR Congo': '🇨🇩',
      'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'El Salvador': '🇸🇻', 'Equatorial Guinea': '🇬🇶',
      'Eritrea': '🇪🇷', 'Estonia': '🇪🇪', 'Eswatini': '🇸🇿', 'Ethiopia': '🇪🇹',
      'Fiji': '🇫🇯', 'Finland': '🇫🇮', 'France': '🇫🇷',
      'Gabon': '🇬🇦', 'Gambia': '🇬🇲', 'Georgia': '🇬🇪', 'Germany': '🇩🇪', 'Ghana': '🇬🇭',
      'Greece': '🇬🇷', 'Grenada': '🇬🇩', 'Guatemala': '🇬🇹', 'Guinea': '🇬🇳',
      'Guinea-Bissau': '🇬🇼', 'Guyana': '🇬🇾',
      'Haiti': '🇭🇹', 'Honduras': '🇭🇳', 'Hungary': '🇭🇺',
      'Iceland': '🇮🇸', 'India': '🇮🇳', 'Indonesia': '🇮🇩', 'Iran': '🇮🇷', 'Iraq': '🇮🇶',
      'Ireland': '🇮🇪', 'Israel': '🇮🇱', 'Italy': '🇮🇹',
      'Jamaica': '🇯🇲', 'Japan': '🇯🇵', 'Jordan': '🇯🇴',
      'Kazakhstan': '🇰🇿', 'Kenya': '🇰🇪', 'Kiribati': '🇰🇮', 'Kuwait': '🇰🇼',
      'Kyrgyzstan': '🇰🇬',
      'Laos': '🇱🇦', 'Latvia': '🇱🇻', 'Lebanon': '🇱🇧', 'Lesotho': '🇱🇸', 'Liberia': '🇱🇷',
      'Libya': '🇱🇾', 'Liechtenstein': '🇱🇮', 'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺',
      'Madagascar': '🇲🇬', 'Malawi': '🇲🇼', 'Malaysia': '🇲🇾', 'Maldives': '🇲🇻',
      'Mali': '🇲🇱', 'Malta': '🇲🇹', 'Marshall Islands': '🇲🇭', 'Mauritania': '🇲🇷',
      'Mauritius': '🇲🇺', 'Mexico': '🇲🇽', 'Micronesia': '🇫🇲', 'Moldova': '🇲🇩',
      'Monaco': '🇲🇨', 'Mongolia': '🇲🇳', 'Montenegro': '🇲🇪', 'Morocco': '🇲🇦',
      'Mozambique': '🇲🇿', 'Myanmar': '🇲🇲',
      'Namibia': '🇳🇦', 'Nauru': '🇳🇷', 'Nepal': '🇳🇵', 'Netherlands': '🇳🇱',
      'New Zealand': '🇳🇿', 'Nicaragua': '🇳🇮', 'Niger': '🇳🇪', 'Nigeria': '🇳🇬',
      'North Korea': '🇰🇵', 'North Macedonia': '🇲🇰', 'Norway': '🇳🇴',
      'Oman': '🇴🇲',
      'Pakistan': '🇵🇰', 'Palau': '🇵🇼', 'Palestine': '🇵🇸', 'Panama': '🇵🇦',
      'Papua New Guinea': '🇵🇬', 'Paraguay': '🇵🇾', 'Peru': '🇵🇪', 'Philippines': '🇵🇭',
      'Poland': '🇵🇱', 'Portugal': '🇵🇹',
      'Qatar': '🇶🇦',
      'Romania': '🇷🇴', 'Russia': '🇷🇺', 'Rwanda': '🇷🇼',
      'Saint Kitts and Nevis': '🇰🇳', 'Saint Lucia': '🇱🇨',
      'Saint Vincent and the Grenadines': '🇻🇨', 'Samoa': '🇼🇸', 'San Marino': '🇸🇲',
      'Sao Tome and Principe': '🇸🇹', 'Saudi Arabia': '🇸🇦', 'Senegal': '🇸🇳',
      'Serbia': '🇷🇸', 'Seychelles': '🇸🇨', 'Sierra Leone': '🇸🇱', 'Singapore': '🇸🇬',
      'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'Solomon Islands': '🇸🇧', 'Somalia': '🇸🇴',
      'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'South Sudan': '🇸🇸', 'Spain': '🇪🇸',
      'Sri Lanka': '🇱🇰', 'Sudan': '🇸🇩', 'Suriname': '🇸🇷', 'Sweden': '🇸🇪',
      'Switzerland': '🇨🇭', 'Syria': '🇸🇾',
      'Tajikistan': '🇹🇯', 'Tanzania': '🇹🇿', 'Thailand': '🇹🇭', 'Timor-Leste': '🇹🇱',
      'Togo': '🇹🇬', 'Tonga': '🇹🇴', 'Trinidad and Tobago': '🇹🇹', 'Tunisia': '🇹🇳',
      'Turkey': '🇹🇷', 'Turkmenistan': '🇹🇲', 'Tuvalu': '🇹🇻',
      'Uganda': '🇺🇬', 'Ukraine': '🇺🇦', 'United Arab Emirates': '🇦🇪',
      'United Kingdom': '🇬🇧', 'United States': '🇺🇸', 'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿',
      'Vanuatu': '🇻🇺', 'Vatican City': '🇻🇦', 'Venezuela': '🇻🇪', 'Vietnam': '🇻🇳',
      'Yemen': '🇾🇪',
      'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼',
    };
    return flags[country] || '🌍';
  }

  function initCommunity() {
    const container = document.getElementById('communityPosts');
    if (!container) return;

    state.currentUser = getCurrentUser();

    const storedPosts = loadCommunityPosts();
    const seedPosts = [
      { id: 'seed-1', user: 'QuietNYC', country: 'United States', time: '2h ago', title: 'Best quiet spots in NYC', content: 'I have been mapping the quietest corners of Manhattan. The Roof Garden at the Met and Greenacre Park consistently measure under 50 dB even at noon.', votes: 24, comments: 8 },
      { id: 'seed-2', user: 'BrooklynNoiseWatch', country: 'United States', time: '5h ago', title: 'Construction noise complaint', content: 'Jackhammering since 6 AM at Atlantic Ave development site. Readings hitting 92 dB near the fence.', votes: 42, comments: 15 },
      { id: 'seed-3', user: 'GreenBarrierFan', country: 'Canada', time: '1d ago', title: 'Green barrier success story', content: 'Mixed vegetation barrier along the High Line extension has reduced street-level noise by 7 dB!', votes: 31, comments: 12 },
      { id: 'seed-4', user: 'WeekendWarrior', country: 'United Kingdom', time: '2d ago', title: 'Weekend noise levels are surprisingly low', content: 'Sunday mornings between 6-9 AM average 48 dB across most residential zones.', votes: 18, comments: 6 },
      { id: 'seed-5', user: 'DataNoiseLab', country: 'Germany', time: '3d ago', title: 'Traffic diversion impact on noise', content: 'After the FDR Drive lane closure, noise levels along the East River Promenade dropped by 9 dB during peak hours.', votes: 27, comments: 10 },
    ];

    const allPosts = [...seedPosts, ...storedPosts];
    allPosts.sort((a, b) => {
      const timeOrder = { 'now': 0, 'Just now': 0, '1m ago': 1, '2h ago': 2, '5h ago': 3, '1d ago': 4, '2d ago': 5, '3d ago': 6 };
      return (timeOrder[a.time] || 99) - (timeOrder[b.time] || 99);
    });
    state.communityPosts = allPosts;

    const newPostHtml = `
      <div class="card new-post-card">
        <div class="card-header"><span>New Post</span></div>
        <div class="new-post-form">
          <div class="form-group" style="display:flex;gap:10px;margin-bottom:8px">
            <input type="text" id="postUsername" class="form-input" placeholder="Your name" style="flex:1" value="${state.currentUser ? state.currentUser.username : 'Guest'}" />
            <span style="padding:8px 0;color:var(--text-muted);font-size:13px">${state.currentUser ? getCountryFlag(state.currentUser.country) + ' ' + state.currentUser.country : '🌍'}</span>
          </div>
          <div class="form-group">
            <input type="text" id="postTitle" class="form-input" placeholder="Post title..." />
          </div>
          <div class="form-group">
            <textarea id="postContent" class="form-input form-textarea" rows="3" placeholder="Share your noise experience..."></textarea>
          </div>
          <button class="report-submit-btn" id="postSubmitBtn"><i class="fas fa-paper-plane"></i> Post</button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('afterbegin', newPostHtml);

    document.getElementById('postSubmitBtn')?.addEventListener('click', () => {
      const username = document.getElementById('postUsername').value.trim() || 'Guest';
      const title = document.getElementById('postTitle').value.trim();
      const content = document.getElementById('postContent').value.trim();
      if (!title || !content) return;

      const userCountry = state.currentUser ? state.currentUser.country : '';
      let detectedCountry = userCountry;
      if (!detectedCountry && typeof Intl !== 'undefined') {
        try {
          const locale = Intl.DateTimeFormat().resolvedOptions().locale;
          detectedCountry = locale.split('-')[1] || '';
        } catch(e) {}
      }

      const newPost = {
        id: 'post-' + Date.now(),
        user: username,
        country: userCountry || detectedCountry || 'United States',
        time: 'Just now',
        title: title,
        content: content,
        votes: 0,
        comments: 0,
      };
      state.communityPosts.unshift(newPost);
      saveCommunityPost(newPost);
      document.getElementById('postTitle').value = '';
      document.getElementById('postContent').value = '';
      renderCommunityPosts();
    });

    initAuth(document.body);
    initAuthHandlers();
    createCustomSelect(
      document.getElementById('authCountry').parentNode,
      'authCountry',
      COUNTRIES.map(c => ({ value: c, label: c })),
      'Afghanistan'
    );
    renderUserBadge();
    renderCommunityPosts();

    container.addEventListener('click', e => {
      const btn = e.target.closest('.post-vote');
      if (!btn) return;
      const post = btn.closest('.post-card');
      const postId = post.dataset.id;
      const countEl = post.querySelector('.vote-count');
      let val = parseInt(countEl.textContent);

      if (btn.classList.contains('post-upvote')) {
        if (votingState[postId] === 'up') {
          val--;
          delete votingState[postId];
        } else {
          if (votingState[postId] === 'down') val++;
          val++;
          votingState[postId] = 'up';
        }
      } else {
        if (votingState[postId] === 'down') {
          val++;
          delete votingState[postId];
        } else {
          if (votingState[postId] === 'up') val--;
          val--;
          votingState[postId] = 'down';
        }
      }
      countEl.textContent = val;
    });
  }

  function loadCommunityPosts() {
    try {
      return JSON.parse(localStorage.getItem('noisedna_community_posts') || '[]');
    } catch { return []; }
  }

  function saveCommunityPost(post) {
    try {
      const posts = loadCommunityPosts();
      posts.unshift(post);
      localStorage.setItem('noisedna_community_posts', JSON.stringify(posts));
    } catch(e) {}
  }

  function renderCommunityPosts() {
    const container = document.getElementById('communityPosts');
    if (!container) return;
    const posts = state.communityPosts || [];
    const existingForm = container.querySelector('.new-post-card');
    let postsHtml = '';

    posts.forEach(p => {
      const pFlag = getCountryFlag(p.country || '');
      const avatar = p.user ? p.user.charAt(0).toUpperCase() : 'G';
      postsHtml += `<div class="card post-card retro-window" data-id="${p.id}">
        <div class="post-header">
          <span class="post-avatar" style="background:var(--accent);color:var(--text-on-accent)">${avatar}</span>
          <span class="post-user">${p.user}</span>
          <span class="post-country">${pFlag} ${p.country || ''}</span>
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
    });

    const formHtml = existingForm ? existingForm.outerHTML : '';
    container.innerHTML = formHtml + postsHtml;

    if (formHtml) {
      document.getElementById('postSubmitBtn')?.addEventListener('click', () => {
        const username = document.getElementById('postUsername').value.trim() || 'Guest';
        const title = document.getElementById('postTitle').value.trim();
        const content = document.getElementById('postContent').value.trim();
        if (!title || !content) return;
        const userCountry = state.currentUser ? state.currentUser.country : '';
        const newPost = {
          id: 'post-' + Date.now(),
          user: username,
          country: userCountry || 'United States',
          time: 'Just now',
          title: title,
          content: content,
          votes: 0,
          comments: 0,
        };
        state.communityPosts.unshift(newPost);
        saveCommunityPost(newPost);
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
        renderCommunityPosts();
      });
    }

    container.querySelectorAll('.post-vote').forEach(btn => {
      btn.addEventListener('click', function(e) {
        const post = this.closest('.post-card');
        const postId = post.dataset.id;
        const countEl = post.querySelector('.vote-count');
        let val = parseInt(countEl.textContent);

        if (this.classList.contains('post-upvote')) {
          if (votingState[postId] === 'up') {
            val--;
            delete votingState[postId];
          } else {
            if (votingState[postId] === 'down') val++;
            val++;
            votingState[postId] = 'up';
          }
        } else {
          if (votingState[postId] === 'down') {
            val++;
            delete votingState[postId];
          } else {
            if (votingState[postId] === 'up') val--;
            val--;
            votingState[postId] = 'down';
          }
        }
        countEl.textContent = val;
      });
    });
  }

  function getGlobalReports() {
    try {
      return JSON.parse(localStorage.getItem('noisedna_global_reports') || '[]');
    } catch { return []; }
  }

  function saveGlobalReport(report) {
    try {
      const reports = getGlobalReports();
      reports.unshift(report);
      localStorage.setItem('noisedna_global_reports', JSON.stringify(reports));
    } catch(e) {}
  }

  function createCustomSelect(container, selectId, options, selectedValue) {
    const select = container.querySelector('#' + selectId);
    if (!select) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'custom-select-value';
    const initSelected = options.find(o => o.value === selectedValue);
    const initFlag = initSelected && typeof getCountryFlag === 'function' ? getCountryFlag(initSelected.value) : '';
    valueSpan.innerHTML = initSelected ? (initFlag + ' ' + initSelected.label) : 'Select...';

    const arrow = document.createElement('span');
    arrow.className = 'custom-select-arrow';
    arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';

    trigger.appendChild(valueSpan);
    trigger.appendChild(arrow);

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';

    const searchDiv = document.createElement('div');
    searchDiv.className = 'custom-select-search';
    searchDiv.innerHTML = '<i class="fas fa-search"></i><input type="text" class="custom-select-input" placeholder="Search..." />';
    dropdown.appendChild(searchDiv);

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'custom-select-options';
    dropdown.appendChild(optionsDiv);

    wrapper.appendChild(trigger);
    wrapper.appendChild(dropdown);
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.style.display = 'none';

    function renderOptions(filter) {
      const q = (filter || '').toLowerCase();
      optionsDiv.innerHTML = '';
      const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
      filtered.forEach(o => {
        const el = document.createElement('div');
        el.className = 'custom-select-option' + (o.value === select.value ? ' selected' : '');
        const flag = typeof getCountryFlag === 'function' ? getCountryFlag(o.value) : '';
        el.innerHTML = flag + ' ' + o.label;
        el.dataset.value = o.value;
        el.addEventListener('click', () => {
          select.value = o.value;
          valueSpan.innerHTML = flag + ' ' + o.label;
          wrapper.classList.remove('open');
          select.dispatchEvent(new Event('change', { bubbles: true }));
          renderOptions('');
        });
        optionsDiv.appendChild(el);
      });
    }

    const searchInput = searchDiv.querySelector('input');
    searchInput.addEventListener('input', () => renderOptions(searchInput.value));

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      wrapper.classList.toggle('open');
      if (wrapper.classList.contains('open')) {
        searchInput.value = '';
        renderOptions('');
        searchInput.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
      }
    });

    renderOptions('');

    return wrapper;
  }

  function initReports() {
    const form = document.getElementById('reportForm');
    const list = document.getElementById('reportsList');

    if (!form) return;

    const countryGroup = document.createElement('div');
    countryGroup.className = 'form-group';
    const selectedCountry = state.currentUser ? state.currentUser.country : '';
    countryGroup.innerHTML = `
      <label for="reportCountry">Country</label>
      <select class="form-select" id="reportCountry">
        ${COUNTRIES.map(c => `<option value="${c}" ${selectedCountry === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    `;

    const cityGroup = document.createElement('div');
    cityGroup.className = 'form-group';
    cityGroup.innerHTML = `
      <label for="reportCity">City</label>
      <input type="text" class="form-input" id="reportCity" placeholder="e.g. Central Station" />
    `;

    const locationGroup = document.getElementById('reportLocation').parentNode;
    locationGroup.parentNode.insertBefore(countryGroup, locationGroup);
    locationGroup.parentNode.insertBefore(cityGroup, locationGroup);

    document.getElementById('reportLocation').placeholder = 'e.g. Central Station';

    createCustomSelect(
      document.getElementById('reportCountry').parentNode,
      'reportCountry',
      COUNTRIES.map(c => ({ value: c, label: c })),
      selectedCountry
    );

    form.addEventListener('submit', e => {
      e.preventDefault();
      const loc = document.getElementById('reportLocation').value;
      const city = document.getElementById('reportCity').value;
      const country = document.getElementById('reportCountry').value;
      const type = document.getElementById('reportType').value;
      const desc = document.getElementById('reportDescription').value;
      const severity = document.getElementById('reportSeverity').value;
      if (!type || !loc || !desc) return;
      const username = state.currentUser ? state.currentUser.username : 'Anonymous';
      const report = {
        id: Date.now(),
        location: loc,
        city: city || 'Unknown',
        country: country,
        type: type,
        severity: severity,
        desc: desc,
        time: 'Just now',
        username: username,
      };
      saveGlobalReport(report);
      renderReports();
      form.reset();
    });

    renderReports();
  }

  function renderReports() {
    const list = document.getElementById('reportsList');
    if (!list) return;

    const reports = getGlobalReports();
    reports.sort((a, b) => b.id - a.id);

    list.innerHTML = reports.length === 0
      ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No reports yet. Be the first to submit one!</div>'
      : reports.map(r => {
        const countryFlag = getCountryFlag(r.country || '');
        return `<div class="report-item severity-${r.severity}">
          <div class="report-item-header">
            <span class="report-type-badge ${r.type}"><i class="fas ${r.type === 'noise' ? 'fa-volume-up' : r.type === 'temperature' ? 'fa-temperature-high' : r.type === 'airquality' ? 'fa-wind' : r.type === 'vibration' ? 'fa-triangle-exclamation' : 'fa-circle'}"></i> ${r.type.charAt(0).toUpperCase() + r.type.slice(1)}</span>
            <span class="report-item-severity ${r.severity}">${r.severity.charAt(0).toUpperCase() + r.severity.slice(1)}</span>
            <span class="report-item-location"><i class="fas fa-location-dot"></i> ${r.location}${r.city ? ', ' + r.city : ''}</span>
            <span class="report-item-country">${countryFlag} ${r.country || ''}</span>
          </div>
          <div class="report-item-desc">${r.desc}</div>
          <div class="report-item-meta">
            <span class="report-item-time">Submitted ${r.time}</span>
            <span class="report-item-user"><i class="fas fa-user"></i> ${r.username || 'Anonymous'}</span>
          </div>
        </div>`;
      }).join('');
  }

  const DEFAULT_SENSITIVE_ZONES = [
    { id: 'school-1', name: 'PS 321 School', type: 'school', lat: 40.718, lng: -73.995, baseNoise: 62 },
    { id: 'hospital-1', name: 'NYU Langone Hospital', type: 'hospital', lat: 40.742, lng: -73.974, baseNoise: 58 },
    { id: 'library-1', name: 'NY Public Library', type: 'library', lat: 40.752, lng: -73.982, baseNoise: 48 },
    { id: 'school-2', name: 'Columbia University', type: 'school', lat: 40.807, lng: -73.962, baseNoise: 60 },
    { id: 'hospital-2', name: 'Mount Sinai Hospital', type: 'hospital', lat: 40.790, lng: -73.952, baseNoise: 55 },
    { id: 'library-2', name: 'Brooklyn Public Library', type: 'library', lat: 40.672, lng: -73.968, baseNoise: 45 },
  ];

  function generateLocalProtectiveZones() {
    const lat = state.lat || 40.7128;
    const lng = state.lng || -74.0060;
    const zones = [];

    const types = [
      { id: 'school', name: 'Elementary School', icon: 'fa-school', baseNoise: 52 },
      { id: 'hospital', name: 'Community Clinic', icon: 'fa-hospital', baseNoise: 48 },
      { id: 'library', name: 'Public Library', icon: 'fa-book', baseNoise: 40 },
      { id: 'park', name: 'Neighborhood Park', icon: 'fa-tree', baseNoise: 38 },
      { id: 'daycare', name: 'Childcare Center', icon: 'fa-child', baseNoise: 50 },
      { id: 'school', name: 'High School', icon: 'fa-school', baseNoise: 55 },
      { id: 'hospital', name: 'Urgent Care', icon: 'fa-hospital', baseNoise: 50 },
      { id: 'library', name: 'Community Reading Room', icon: 'fa-book', baseNoise: 38 },
      { id: 'park', name: 'Botanical Garden', icon: 'fa-tree', baseNoise: 35 },
      { id: 'daycare', name: 'Preschool', icon: 'fa-child', baseNoise: 48 },
    ];

    types.forEach((t, i) => {
      const angle = (i / types.length) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 0.003 + Math.random() * 0.012;
      zones.push({
        id: t.id + '-' + (i + 1),
        name: t.name,
        type: t.id,
        lat: lat + Math.cos(angle) * dist,
        lng: lng + Math.sin(angle) * dist,
        baseNoise: t.baseNoise,
      });
    });

    return zones;
  }

  function initSensitiveZoneMonitor() {
    currentSensitiveZones = generateLocalProtectiveZones();
    renderSensitiveZones();
    setInterval(renderSensitiveZones, 30000);
  }

  function renderSensitiveZones() {
    const zones = currentSensitiveZones.length > 0 ? currentSensitiveZones : DEFAULT_SENSITIVE_ZONES;
    const hour = new Date().getHours();
    let timeFactor;
    if (hour >= 7 && hour < 10) timeFactor = 1.2;
    else if (hour >= 10 && hour < 16) timeFactor = 1.0;
    else if (hour >= 16 && hour < 20) timeFactor = 1.15;
    else if (hour >= 20 && hour < 23) timeFactor = 0.9;
    else timeFactor = 0.6;

    const locName = state.locationName || state.caseStudy?.name || 'Local';
    const cityShort = locName.split(' ')[0] || 'Local';

    const typeMap = {
      school: { name: 'Schools & Universities', icon: 'fa-school', color: '#06B6D4' },
      hospital: { name: 'Hospitals & Clinics', icon: 'fa-hospital', color: '#EF4444' },
      library: { name: 'Libraries', icon: 'fa-book', color: '#F59E0B' },
      park: { name: 'Parks & Gardens', icon: 'fa-tree', color: '#10B981' },
      daycare: { name: 'Daycare Centers', icon: 'fa-child', color: '#F59E0B' },
    };

    Object.keys(typeMap).forEach(type => {
      const t = typeMap[type];
      const zoneZones = zones.filter(z => z.type === type);
      const avgBase = zoneZones.length > 0 ? zoneZones.reduce((a, z) => a + z.baseNoise, 0) / zoneZones.length : 50;
      const noise = Math.round(avgBase * timeFactor * (0.9 + Math.random() * 0.2));
      const risk = getRiskLevel(noise);

      const riskLabels = { quiet: 'Low', moderate: 'Moderate', loud: 'High', dangerous: 'Critical' };
      const riskBadges = { quiet: 'low', moderate: 'moderate', loud: 'high', dangerous: 'high' };
      const riskClass = riskBadges[risk.id] || 'moderate';

      const zoneCard = document.querySelector(`.zone-card.${type}`);
      if (!zoneCard) return;
      const headerSpan = zoneCard.querySelector('.zone-header span');
      if (headerSpan) headerSpan.textContent = cityShort + ' ' + t.name;

      const valEl = zoneCard.querySelector('.z-val');
      if (valEl) {
        valEl.textContent = noise + ' dB';
        valEl.className = 'z-val zone-' + (noise > 70 ? 'loud' : noise > 55 ? 'moderate' : 'quiet');
      }
      const badge = zoneCard.querySelector('.z-badge');
      if (badge) {
        badge.textContent = riskLabels[risk.id] || 'Moderate';
        badge.className = 'z-badge ' + riskClass;
      }
    });
  }

  function renderSensors() {
    const container = document.getElementById('sensorsList');
    if (!container) return;

    const cs = state.caseStudy || CASE_STUDIES['United States'];
    const base = state.currentNoise || cs.baseNoise || 67;

    if (!state._sensors) {
      const sensorNames = [
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
        'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
      ];
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const lat = state.lat || cs.lat;
      const lng = state.lng || cs.lng;
      const count = randInt(4, 7);
      state._sensors = [];
      for (let i = 0; i < count; i++) {
        const dist = randInt(30, 500);
        const dir = directions[randInt(0, directions.length - 1)];
        const noise = clamp(Math.round(base + rand(-8, 8)), 20, 140);
        state._sensors.push({
          name: 'Sensor ' + sensorNames[i],
          distance: dist, direction: dir,
          noise: noise,
          status: noise > 75 ? 'warning' : noise > 60 ? 'moderate' : 'good',
        });
      }
      state._sensors.sort((a, b) => a.distance - b.distance);
    }

    const sensors = state._sensors.map(s => {
      const drift = rand(-2, 2);
      const newNoise = clamp(s.noise + drift, 20, 140);
      s.noise = newNoise;
      s.status = newNoise > 75 ? 'warning' : newNoise > 60 ? 'moderate' : 'good';
      return s;
    });

    container.innerHTML = '<div class="sensor-header"><i class="fas fa-satellite-dish"></i> ' + sensors.length + ' sensors within 500m</div>' +
      sensors.map(s => {
        const icons = { good: 'fa-check-circle', moderate: 'fa-exclamation-circle', warning: 'fa-bell' };
        const colors = { good: '#10b981', moderate: '#F59E0B', warning: '#EF4444' };
        return '<div class="sensor-item ' + s.status + '">' +
          '<div class="sensor-icon"><i class="fas ' + icons[s.status] + '" style="color:' + colors[s.status] + '"></i></div>' +
          '<div class="sensor-info">' +
            '<span class="sensor-name">' + s.name + '</span>' +
            '<span class="sensor-loc">' + s.distance + 'm ' + s.direction + '</span>' +
          '</div>' +
          '<div class="sensor-reading" style="color:' + colors[s.status] + '">' + s.noise + ' dB</div>' +
        '</div>';
      }).join('');
  }

  function initClippy() {
    const message = document.getElementById('clippyMessage');
    const btn = document.getElementById('clippyTipBtn');
    if (!message || !btn) return;

    const tips = [
      'Welcome to NoiseDNA! I\'m <strong>Clippy</strong>, your assistant 🤖',
      'The dashboard shows real-time noise at <strong>your location</strong>',
      'Auto-record captures 15s of noise, then pauses 5s — on loop!',
      'Nearby sensors show noise readings from devices around you',
      'Use the Live Map to see noise hotspots in your area',
      'The Forecast tab predicts noise trends for the day ahead',
      'Building Advisor helps design noise-resilient buildings',
      'Sensitive Zones track noise at schools, hospitals & parks near you',
      'Share your noise data in the Community tab!',
      'Reports let you submit noise observations with country data',
      'Dark Mode reduces eye strain — toggle it in the sidebar',
      'Your location powers all noise estimates — everything is local 🌍',
    ];

    let tipIndex = 0;

    message.innerHTML = tips[0];

    btn.addEventListener('click', () => {
      tipIndex = (tipIndex + 1) % tips.length;
      message.innerHTML = tips[tipIndex];
      btn.innerHTML = '<i class="fas fa-lightbulb"></i> Next Tip';
    });
  }

  function initLayoutPresets() {
    const buttons = document.querySelectorAll('.layout-btn');
    if (!buttons.length) return;
    const grid = document.querySelector('.dashboard-grid');
    if (grid) grid.classList.add('layout-default');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (!grid) return;
        const layout = btn.dataset.layout;
        ['layout-default', 'layout-compact', 'layout-detailed', 'layout-map'].forEach(cls => {
          grid.classList.remove(cls);
        });
        grid.classList.add('layout-' + layout);
      });
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
