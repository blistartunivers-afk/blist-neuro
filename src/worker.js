/**
 * BLIST Brain Worker - Runs simulation off-main-thread
 * Communicates via postMessage (Structured Clone / Transferable)
 */
import { Brain } from './brain.js';

let brain = null;
let running = false;
let timer = null;
let stimOverride = null;

// Config
const BATCH_MS = 50; // Send UI update every 50ms (20 FPS)
const STEPS_PER_BATCH = BATCH_MS; // 1 step = 1ms

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'init': {
      running = false;
      clearTimeout(timer);
      stimOverride = null;
      const config = payload || {};
      brain = new Brain(config);
      // Try load saved state from IndexedDB (via main thread)
      // Main thread will send 'setState' if exists
      self.postMessage({ type: 'ready', payload: { N: brain.N, N_exc: brain.N_exc } });
      break;
    }
    
    case 'start': {
      if (!brain || running) break;
      running = true;
      simulationLoop();
      break;
    }
    
    case 'pause': {
      running = false;
      clearTimeout(timer);
      break;
    }
    
    case 'step': {
      // Single step (debug)
      if (!brain) break;
      const result = brain.step({ stimOverride: payload?.stimOverride || stimOverride });
      self.postMessage({ type: 'batch', payload: formatBatch(result) }, [result.spikes.buffer]);
      break;
    }
    
    case 'injectStimulus': {
      if (!brain) break;
      // Return stim override object for next steps
      const stim = brain.injectStimulus(payload.exc, payload.inh, payload.duration);
      stimOverride = stim;
      self.postMessage({ type: 'stimInjected', payload: stim });
      break;
    }
    
    case 'getState': {
      if (!brain) break;
      const state = brain.getState();
      // getState() returns ordinary arrays; structured clone preserves them.
      self.postMessage({ type: 'state', payload: state });
      break;
    }
    
    case 'setState': {
      if (!brain) break;
      brain.setState(payload);
      self.postMessage({ type: 'stateLoaded', payload: { t: brain.t } });
      break;
    }
    
    case 'reset': {
      if (!brain) break;
      stimOverride = null;
      brain._resetState();
      self.postMessage({ type: 'resetDone', payload: { t: 0 } });
      break;
    }
  }
};

function formatBatch(result) {
  return {
    t: result.t,
    rate: result.rate,
    spikes: result.spikes, // Uint16Array
    rateHistory: brain.getRateHistory()
  };
}

function simulationLoop() {
  if (!running || !brain) return;
  const batchStart = performance.now();
  let lastResult = null;
  const spikes = [];
  try {
    for (let i = 0; i < STEPS_PER_BATCH; i++) {
      lastResult = brain.step(stimOverride ? { stimOverride } : {});
      spikes.push(...lastResult.spikes);
      if (stimOverride && stimOverride.durationRemaining <= 0) stimOverride = null;
    }
    if (lastResult) {
      lastResult.spikes = new Uint16Array(spikes);
      self.postMessage({ type: 'batch', payload: formatBatch(lastResult) }, [lastResult.spikes.buffer]);
    }
  } catch (error) {
    running = false;
    self.postMessage({ type: 'error', payload: error.message });
    return;
  }
  // Always yield, even when slower than real time, so pause/reset are processed.
  timer = setTimeout(simulationLoop, Math.max(0, BATCH_MS - (performance.now() - batchStart)));
}

// Handle errors
self.onerror = (err) => {
  console.error('[Worker] Error:', err);
  self.postMessage({ type: 'error', payload: err.message });
};

console.log('[Worker] Loaded and ready.');
