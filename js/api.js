;(function() {
  'use strict';

  const API_BASE = 'http://localhost:4000/api';
  let useBackend = false;

  async function checkBackend() {
    try {
      const res = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        useBackend = true;
        console.log('[NoiseDNA API] Backend connected');
      }
    } catch {}
  }

  async function tryFetch(url, fallback) {
    if (!useBackend) return fallback();
    try {
      const res = await fetch(API_BASE + url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return fallback();
    }
  }

  function apiCurrentNoise(fallback) {
    return tryFetch('/noise/current', fallback);
  }

  function apiHourly(base, fallback) {
    return tryFetch('/noise/hourly?base=' + base, fallback);
  }

  function apiForecast(base, fallback) {
    return tryFetch('/noise/forecast?base=' + base, fallback);
  }

  function apiSources(fallback) {
    return tryFetch('/noise/sources', fallback);
  }

  function apiHotspots(fallback) {
    return tryFetch('/noise/hotspots', fallback);
  }

  function apiBarrierSimulate(params, fallback) {
    return tryFetch('/barrier/simulate', () => {
      return fetch(API_BASE + '/barrier/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(3000),
      }).then(r => r.json()).catch(fallback);
    });
  }

  function apiPlannerSimulate(params, fallback) {
    return tryFetch('/planner/simulate', () => {
      return fetch(API_BASE + '/planner/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(3000),
      }).then(r => r.json()).catch(fallback);
    });
  }

  function apiFindRoutes(params, fallback) {
    return tryFetch('/routes/find', () => {
      return fetch(API_BASE + '/routes/find', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(3000),
      }).then(r => r.json()).catch(fallback);
    });
  }

  function apiRecommendations(params, fallback) {
    return tryFetch('/advisor/recommendations', () => {
      return fetch(API_BASE + '/advisor/recommendations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(3000),
      }).then(r => r.json()).catch(fallback);
    });
  }

  checkBackend();

  window.NoiseDNAAPI = {
    checkBackend, currentNoise: apiCurrentNoise, hourly: apiHourly,
    forecast: apiForecast, sources: apiSources, hotspots: apiHotspots,
    barrierSimulate: apiBarrierSimulate, plannerSimulate: apiPlannerSimulate,
    findRoutes: apiFindRoutes, recommendations: apiRecommendations,
  };
})();
