/**
 * BLIST Brain Worker - Runs simulation off-main-thread
 * Communicates via postMessage (Structured Clone / Transferable)
 */
import { Brain } from './brain.js';

let brain = null;
let running = false;
let animationFrameId = null;

// Config
const BATCH_MS = 50; // Send UI update every 50ms (20 FPS)
const STEPS_PER_BATCH = BATCH_MS; // 1 step = 1ms

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'init': {
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
      break;
    }
    
    case 'step': {
      // Single step (debug)
      if (!brain) break;
      const result = brain.step(payload?.stimOverride);
      self.postMessage({ type: 'batch', payload: formatBatch(result) }, [result.spikes.buffer]);
      break;
    }
    
    case 'injectStimulus': {
      if (!brain) break;
      // Return stim override object for next steps
      const stim = brain.injectStimulus(payload.exc, payload.inh, payload.duration);
      self.postMessage({ type: 'stimInjected', payload: stim });
      break;
    }
    
    case 'getState': {
      if (!brain) break;
      const state = brain.getState();
      // Transfer large arrays
      self.postMessage({ type: 'state', payload: state }, [
        state.S.buffer, state.x_std.buffer, state.v.buffer, state.u.buffer,
        state.I_NMDA.buffer, state.I_AMPA.buffer, state.I_GABA.buffer
      ]);
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

async function simulationLoop() {
  if (!running || !brain) return;
  
  let stimOverride = null;
  
  while (running) {
    const batchStart = performance.now();
    let lastResult = null;
    
    // Run BATCH_MS steps
    for (let i = 0; i < STEPS_PER_BATCH; i++) {
      lastResult = brain.step(stimOverride ? { stimOverride } : {});
      if (stimOverride) stimOverride = lastResult.stimOverride; // Not returned, handled internally
    }
    
    // Send batch to main thread
    if (lastResult) {
      // Transfer spike buffer ownership
      self.postMessage({ type: 'batch', payload: formatBatch(lastResult) }, [lastResult.spikes.buffer]);
    }
    
    // Yield to event loop (allows other messages like pause/getState)
    // Target 50ms real time per batch
    const elapsed = performance.now() - batchStart;
    const delay = Math.max(0, BATCH_MS - elapsed);
    
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
    // If delay <= 0, we are running slower than real-time, loop immediately
  }
}

// Handle errors
self.onerror = (err) => {
  console.error('[Worker] Error:', err);
  self.postMessage({ type: 'error', payload: err.message });
};

console.log('[Worker] Loaded and ready.');
