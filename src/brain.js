/**
 * BLIST Brain Core - Izhikevich 1000 Neuron Network
 * NMDA + STD (Tsodyks-Markram) + Homeostatic STDP
 * Optimized for Web Worker: Float32Array, zero-GC hot loop
 */
export class Brain {
  constructor(config = {}) {
    this.cfg = {
      N_exc: 800,
      N_inh: 200,
      p_conn: 0.10,
      S_exc_gain: 2.2,
      S_inh_gain: 3.5,
      tau_AMPA: 5.0,
      tau_NMDA: 80.0,
      tau_GABA: 10.0,
      ratio_NMDA: 0.3,
      U_std: 0.20,
      tau_rec: 300.0,
      // STDP Homeostatic
      w_max: 15.0,
      w_min: 0.0,
      target_mean_w: 3.0,
      homeostatic_rate: 0.0001,
      // Simulation
      dt: 0.5, // ms per inner step (2 steps/ms)
      stim_cutoff: 250,
      ...config
    };

    this.N = this.cfg.N_exc + this.cfg.N_inh;
    this.N_exc = this.cfg.N_exc;
    this.t = 0;
    this.running = false;
    
    // State Arrays (Float32 for SIMD-friendly, memory efficient)
    this.v = new Float32Array(this.N);
    this.u = new Float32Array(this.N);
    this.I_AMPA = new Float32Array(this.N);
    this.I_NMDA = new Float32Array(this.N);
    this.I_GABA = new Float32Array(this.N);
    this.x_std = new Float32Array(this.N);
    
    // Izhikevich Parameters
    this.a = new Float32Array(this.N);
    this.b = new Float32Array(this.N);
    this.c = new Float32Array(this.N);
    this.d = new Float32Array(this.N);
    
    // Connectivity: Sparse-ish but stored dense for speed (1000x1000 = 1M floats = 4MB)
    // Column-major: S[post][pre] -> S[post * N + pre]
    this.S = new Float32Array(this.N * this.N);
    
    // Metrics
    this.rateHistory = [];
    this.maxRateHistory = 2000;
    this.spikeBuffer = []; // [t, neuronId]
    this.maxSpikeBuffer = 5000;
    
    this._initParams();
    this._initConnectivity();
    this._resetState();
  }

  _initParams() {
    const { N_exc, N_inh } = this.cfg;
    // Excitatory: Regular Spiking (RS)
    for (let i = 0; i < N_exc; i++) {
      const r = Math.random();
      this.a[i] = 0.02;
      this.b[i] = 0.2;
      this.c[i] = -65.0 + 15.0 * r * r;
      this.d[i] = 8.0 - 6.0 * r * r;
    }
    // Inhibitory: Fast Spiking (FS)
    for (let i = N_exc; i < this.N; i++) {
      this.a[i] = 0.1;
      this.b[i] = 0.2;
      this.c[i] = -65.0;
      this.d[i] = 2.0;
    }
  }

  _initConnectivity() {
    const { N_exc, N_inh, p_conn, S_exc_gain, S_inh_gain } = this.cfg;
    const N = this.N;
    const S = this.S;
    
    // Initialize to zero
    S.fill(0.0);
    
    // Dense random connectivity with Dale's Law
    for (let post = 0; post < N; post++) {
      const baseIdx = post * N;
      // Excitatory inputs (cols 0..N_exc-1)
      for (let pre = 0; pre < N_exc; pre++) {
        if (Math.random() < p_conn) {
          S[baseIdx + pre] = 0.5 * Math.random() * S_exc_gain;
        }
      }
      // Inhibitory inputs (cols N_exc..N-1)
      for (let pre = N_exc; pre < N; pre++) {
        if (Math.random() < p_conn) {
          S[baseIdx + pre] = -1.0 * Math.random() * S_inh_gain;
        }
      }
    }
    // No self-connections
    for (let i = 0; i < N; i++) S[i * N + i] = 0.0;
  }

  _resetState() {
    this.v.fill(-65.0);
    for (let i = 0; i < this.N; i++) this.u[i] = this.b[i] * this.v[i];
    this.I_AMPA.fill(0.0);
    this.I_NMDA.fill(0.0);
    this.I_GABA.fill(0.0);
    this.x_std.fill(1.0);
    this.t = 0;
    this.rateHistory = [];
    this.spikeBuffer = [];
  }

  /**
   * Main simulation step: advances by 1ms (internal sub-steps = 1/dt)
   * @param {Object} opts - { stimOverride: {exc, inh, durationRemaining} }
   * @returns {Object} { spikes: Uint16Array, rate: float, t: int }
   */
  step(opts = {}) {
    const c = this.cfg;
    const N = this.N;
    const N_exc = this.N_exc;
    const dt = c.dt;
    const stepsPerMs = Math.round(1.0 / dt);
    
    // External Input
    let I_ext_exc, I_ext_inh;
    if (this.t < c.stim_cutoff) {
      I_ext_exc = 5.0; I_ext_inh = 2.0;
    } else {
      I_ext_exc = 0.4; I_ext_inh = 0.2;
    }
    
    // Stimulus Override Injection
    if (opts.stimOverride && opts.stimOverride.durationRemaining > 0) {
      I_ext_exc = opts.stimOverride.exc;
      I_ext_inh = opts.stimOverride.inh;
      opts.stimOverride.durationRemaining -= 1;
    }
    
    let firedThisMs = [];
    
    // Integration Loop (sub-steps)
    for (let s = 0; s < stepsPerMs; s++) {
      // 1. Izhikevich Voltage Update
      // v += dt * (0.04*v^2 + 5*v + 140 - u + I_syn + I_ext)
      for (let i = 0; i < N; i++) {
        const I_syn = this.I_AMPA[i] + this.I_NMDA[i] + this.I_GABA[i];
        const I_ext = (i < N_exc) ? I_ext_exc * (Math.random() * 2 - 1) : I_ext_inh * (Math.random() * 2 - 1);
        // Noise scaled by sqrt(dt) for Euler-Maruyama correctness, but kept simple here
        this.v[i] += dt * (0.04 * this.v[i] * this.v[i] + 5.0 * this.v[i] + 140.0 - this.u[i] + I_syn + I_ext);
        this.u[i] += dt * this.a[i] * (this.b[i] * this.v[i] - this.u[i]);
      }
      
      // 2. Spike Detection & Reset
      const fired = [];
      for (let i = 0; i < N; i++) {
        if (this.v[i] >= 30.0) {
          fired.push(i);
          this.v[i] = this.c[i];
          this.u[i] += this.d[i];
          // STD: Deplete vesicles
          this.x_std[i] *= (1.0 - c.U_std);
        }
      }
      
      if (fired.length > 0) {
        firedThisMs.push(...fired);
        
        // 3. Synaptic Current Updates (Vectorized Dot Product: S^T * spike_vector)
        // We compute input current for ALL neurons from fired neurons
        // inc[post] += S[post][pre] * x_std[pre] for pre in fired
        
        // Excitatory Contribution
        for (const pre of fired) {
          const x = this.x_std[pre];
          if (x <= 0.01) continue; // Skip if fully depleted
          const baseIdx = pre; // Column major access: S[post*N + pre]
          if (pre < N_exc) { // Excitatory Pre
            const wScale = (1.0 - c.ratio_NMDA); // AMPA fraction
            const wScaleNMDA = c.ratio_NMDA;     // NMDA fraction
            for (let post = 0; post < N; post++) {
              const w = S[post * N + baseIdx];
              if (w !== 0) {
                this.I_AMPA[post] += w * x * wScale;
                this.I_NMDA[post] += w * x * wScaleNMDA;
              }
            }
          } else { // Inhibitory Pre
            for (let post = 0; post < N; post++) {
              const w = S[post * N + baseIdx];
              if (w !== 0) this.I_GABA[post] += w * x;
            }
          }
        }
      }
      
      // 4. Synaptic Decay (Exponential Euler)
      const decay_AMPA = 1.0 - dt / c.tau_AMPA;
      const decay_NMDA = 1.0 - dt / c.tau_NMDA;
      const decay_GABA = 1.0 - dt / c.tau_GABA;
      const rec_std = dt / c.tau_rec;
      
      for (let i = 0; i < N; i++) {
        this.I_AMPA[i] *= decay_AMPA;
        this.I_NMDA[i] *= decay_NMDA;
        this.I_GABA[i] *= decay_GABA;
        // STD Recovery
        this.x_std[i] += (1.0 - this.x_std[i]) * rec_std;
      }
    } // End sub-steps

    // 5. Homeostatic STDP (Slow, once per ms)
    this._homeostaticSTDP();

    // 6. Metrics
    this.t += 1;
    const rate = (firedThisMs.length / N) * 1000.0; // Hz
    this.rateHistory.push(rate);
    if (this.rateHistory.length > this.maxRateHistory) this.rateHistory.shift();
    
    // Spike Buffer (for raster)
    for (const id of firedThisMs) {
      this.spikeBuffer.push(this.t, id);
    }
    if (this.spikeBuffer.length > this.maxSpikeBuffer * 2) {
      this.spikeBuffer = this.spikeBuffer.slice(-this.maxSpikeBuffer * 2);
    }

    return {
      spikes: new Uint16Array(firedThisMs), // Copy for transfer
      rate: rate,
      t: this.t
    };
  }

  _homeostaticSTDP() {
    const c = this.cfg;
    const N = this.N;
    const N_exc = this.N_exc;
    const S = this.S;
    
    // Compute mean excitatory weight
    let sum = 0.0, count = 0;
    for (let post = 0; post < N; post++) {
      const base = post * N;
      for (let pre = 0; pre < N_exc; pre++) {
        const w = S[base + pre];
        if (w > 0) { sum += w; count++; }
      }
    }
    if (count === 0) return;
    const meanW = sum / count;
    const target = c.target_mean_w;
    
    // Multiplicative scaling
    if (meanW > 0) {
      const scale = 1.0 + c.homeostatic_rate * (target - meanW);
      for (let post = 0; post < N; post++) {
        const base = post * N;
        for (let pre = 0; pre < N_exc; pre++) {
          const idx = base + pre;
          if (S[idx] > 0) {
            S[idx] = Math.min(c.w_max, Math.max(c.w_min, S[idx] * scale));
          }
        }
      }
    }
  }

  injectStimulus(excAmp, inhAmp, durationMs) {
    return { exc: excAmp, inh: inhAmp, durationRemaining: durationMs };
  }

  // --- Serialization for IndexedDB ---
  getState() {
    return {
      t: this.t,
      S: Array.from(this.S), // Convert to array for JSON
      x_std: Array.from(this.x_std),
      v: Array.from(this.v),
      u: Array.from(this.u),
      I_NMDA: Array.from(this.I_NMDA),
      I_AMPA: Array.from(this.I_AMPA),
      I_GABA: Array.from(this.I_GABA),
      cfg: this.cfg
    };
  }

  setState(state) {
    this.t = state.t;
    this.S.set(state.S);
    this.x_std.set(state.x_std);
    this.v.set(state.v);
    this.u.set(state.u);
    this.I_NMDA.set(state.I_NMDA);
    this.I_AMPA.set(state.I_AMPA);
    this.I_GABA.set(state.I_GABA);
    // Config is assumed compatible
  }

  getSpikeBuffer() {
    return new Uint16Array(this.spikeBuffer);
  }

  getRateHistory() {
    return this.rateHistory.slice();
  }
}

// Default Export for Worker
export default Brain;
