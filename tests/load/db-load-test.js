/**
 * DiggAI Anamnese - Database Load Test
 * Tests database connection pool and query performance
 * 
 * Usage:
 *   k6 run tests/load/db-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const queryLatency = new Trend('db_query_latency');
const connectionPoolUsage = new Gauge('db_pool_usage');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api';

export const options = {
  stages: [
    { duration: '3m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    db_query_latency: ['p(95)<50'],
    errors: ['rate<0.001'],
  },
};

// Test database-intensive operations
export default function () {
  // 1. Health check with DB status
  const healthRes = http.get(`${BASE_URL}/health/db`, {
    tags: { endpoint: 'db_health' },
  });

  const healthSuccess = check(healthRes, {
    'db health check passed': (r) => r.status === 200,
    'db response time < 100ms': (r) => r.timings.duration < 100,
  });

  if (!healthSuccess) {
    errorRate.add(1);
  } else {
    queryLatency.add(healthRes.timings.duration);
    
    // Extract pool usage if available
    try {
      const body = JSON.parse(healthRes.body);
      if (body.poolUsage !== undefined) {
        connectionPoolUsage.add(body.poolUsage);
      }
    } catch {
      // Ignore parse errors
    }
  }

  sleep(0.5);

  // 2. Complex query test - Sessions with answers
  const sessionsRes = http.get(`${BASE_URL}/sessions?limit=50&includeAnswers=true`, {
    tags: { endpoint: 'db_complex_query' },
  });

  const querySuccess = check(sessionsRes, {
    'complex query successful': (r) => r.status === 200,
    'complex query time < 300ms': (r) => r.timings.duration < 300,
  });

  if (!querySuccess) {
    errorRate.add(1);
  } else {
    queryLatency.add(sessionsRes.timings.duration);
  }

  sleep(0.5);

  // 3. Write operation test
  const writeRes = http.post(
    `${BASE_URL}/test-db-write`,
    JSON.stringify({
      testData: `test-${__VU}-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'db_write' },
    }
  );

  check(writeRes, {
    'db write successful': (r) => r.status === 200 || r.status === 201,
    'db write time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  queryLatency.add(writeRes.timings.duration);

  sleep(Math.random() * 2 + 1);
}

export function setup() {
  console.log('Starting Database Load Test');
  console.log(`Base URL: ${BASE_URL}`);
  
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    console.error('Health check failed! Aborting test.');
    return { abort: true };
  }
  
  console.log('Health check passed. Starting DB load test...');
  return { startTime: Date.now() };
}

export function teardown(data) {
  if (data.abort) return;
  
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Database load test completed in ${duration}s`);
}
