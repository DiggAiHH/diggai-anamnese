/**
 * K6 Configuration File
 * Global settings and options for all load tests
 */

export const options = {
  // Global thresholds applied to all tests
  thresholds: {
    http_req_duration: ['p(50)<100', 'p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.001'],
    iteration_duration: ['p(95)<5000'],
  },

  // Global tags applied to all metrics
  tags: {
    project: 'diggai-anamnese',
    environment: __ENV.ENV || 'local',
  },

  // System tags to include in output
  systemTags: ['status', 'method', 'url', 'name', 'check', 'error', 'error_code', 'scenario', 'group'],

  // Summary trend stats to calculate
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],

  // Discard response bodies to save memory
  discardResponseBodies: true,

  // Maximum HTTP redirects to follow
  maxRedirects: 10,

  // User agent string
  userAgent: 'DiggAI-LoadTest/1.0',
};

// Export configurations for different environments
export const environments = {
  local: {
    baseUrl: 'http://localhost:3001/api',
    wsUrl: 'ws://localhost:3001',
    vus: { min: 1, max: 100 },
  },
  
  staging: {
    baseUrl: 'https://staging.diggai.de/api',
    wsUrl: 'wss://staging.diggai.de',
    vus: { min: 10, max: 500 },
  },
  
  production: {
    baseUrl: 'https://diggai-drklaproth.netlify.app/api',
    wsUrl: 'wss://diggai-drklaproth.netlify.app',
    vus: { min: 50, max: 1000 },
  },
};

// Helper function to get environment config
export function getEnvironmentConfig(envName) {
  return environments[envName] || environments.local;
}

// Export default configuration
export default options;
