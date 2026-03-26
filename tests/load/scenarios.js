// K6 Load Test Scenarios for DiggAI Anamnese
// Supports: normal, peak, stress, spike, endurance testing

export const scenarios = {
  // Normal load: Baseline performance testing
  normal: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 100 },   // Ramp up to 100 users
      { duration: '10m', target: 100 },  // Steady state
      { duration: '5m', target: 0 },     // Ramp down
    ],
    gracefulRampDown: '30s',
    tags: { scenario: 'normal' },
  },

  // Peak load: High traffic simulation
  peak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 500 },   // Quick ramp to 500 users
      { duration: '5m', target: 500 },   // Sustained peak
      { duration: '2m', target: 0 },     // Ramp down
    ],
    gracefulRampDown: '30s',
    tags: { scenario: 'peak' },
  },

  // Stress test: Beyond normal capacity
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 1000 },  // Ramp to 1000 users
      { duration: '10m', target: 1000 }, // Sustained stress
      { duration: '5m', target: 1500 },  // Push beyond limits
      { duration: '2m', target: 0 },     // Recovery
    ],
    gracefulRampDown: '1m',
    tags: { scenario: 'stress' },
  },

  // Spike test: Sudden traffic surge
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 100 },  // Baseline
      { duration: '30s', target: 1000 }, // Sudden spike
      { duration: '2m', target: 1000 },  // Sustain
      { duration: '30s', target: 100 },  // Drop
      { duration: '2m', target: 100 },   // Recovery check
      { duration: '30s', target: 0 },    // End
    ],
    gracefulRampDown: '30s',
    tags: { scenario: 'spike' },
  },

  // Endurance test: Long-term stability
  endurance: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10m', target: 200 },  // Ramp up
      { duration: '1h', target: 200 },   // Sustained load (1 hour)
      { duration: '10m', target: 0 },    // Ramp down
    ],
    gracefulRampDown: '5m',
    tags: { scenario: 'endurance' },
  },

  // Soak test: Very long duration for memory leak detection
  soak: {
    executor: 'constant-vus',
    vus: 100,
    duration: '4h',
    tags: { scenario: 'soak' },
  },

  // Breakpoint test: Find system limits
  breakpoint: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '2m', target: 250 },
      { duration: '2m', target: 500 },
      { duration: '2m', target: 750 },
      { duration: '2m', target: 1000 },
      { duration: '2m', target: 1250 },
      { duration: '2m', target: 1500 },
      { duration: '2m', target: 2000 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '2m',
    tags: { scenario: 'breakpoint' },
  },
};

// Export scenario selector for dynamic scenario selection
export function getScenario(scenarioName) {
  return scenarios[scenarioName] || scenarios.normal;
}

// Threshold configurations for all scenarios
export const thresholds = {
  // Response time thresholds
  http_req_duration: ['p(50)<100', 'p(95)<200', 'p(99)<500'],
  
  // Error rate threshold (max 0.1%)
  http_req_failed: ['rate<0.001'],
  
  // Iteration duration
  iteration_duration: ['p(95)<5000'],
  
  // Custom metric thresholds
  api_latency: ['p(95)<200'],
  errors: ['rate<0.001'],
};
