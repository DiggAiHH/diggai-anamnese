/**
 * DiggAI Anamnese - Doctor Dashboard Load Test
 * Tests doctor dashboard endpoints and real-time session polling
 * 
 * Usage:
 *   k6 run tests/load/dashboard-load-test.js
 *   k6 run --env SCENARIO=peak tests/load/dashboard-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { scenarios, thresholds } from './scenarios.js';

// Custom metrics
const errorRate = new Rate('errors');
const dashboardLatency = new Trend('dashboard_latency');
const pollsCompleted = new Counter('polls_completed');
const sessionsListed = new Counter('sessions_listed');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api';
const SCENARIO = __ENV.SCENARIO || 'normal';

// Test options
export const options = {
  scenarios: {
    load: scenarios[SCENARIO] || scenarios.normal,
  },
  thresholds: thresholds,
  tags: {
    test: 'dashboard-load',
    environment: __ENV.ENV || 'local',
  },
};

// Simulated doctor credentials (for load testing only)
const doctorTokens = [
  'test-token-dr-1',
  'test-token-dr-2',
  'test-token-dr-3',
  'test-token-dr-4',
  'test-token-dr-5',
];

function getDoctorToken(vu) {
  return doctorTokens[vu % doctorTokens.length];
}

// Main test function
export default function () {
  const doctorToken = getDoctorToken(__VU);
  const headers = {
    'Authorization': `Bearer ${doctorToken}`,
    'Content-Type': 'application/json',
  };

  group('Dashboard Load', () => {
    // 1. Fetch dashboard overview
    group('Dashboard Overview', () => {
      const overviewRes = http.get(`${BASE_URL}/dashboard/overview`, {
        headers,
        tags: { endpoint: 'dashboard_overview' },
      });

      const success = check(overviewRes, {
        'dashboard overview loaded': (r) => r.status === 200,
        'overview response time < 300ms': (r) => r.timings.duration < 300,
      });

      if (!success) {
        errorRate.add(1);
      } else {
        dashboardLatency.add(overviewRes.timings.duration);
      }
    });

    sleep(1);

    // 2. Fetch active sessions (polling simulation)
    group('Session Polling', () => {
      // Simulate 5 polling cycles
      for (let i = 0; i < 5; i++) {
        const sessionsRes = http.get(`${BASE_URL}/sessions/active`, {
          headers,
          tags: { endpoint: 'list_sessions' },
        });

        const success = check(sessionsRes, {
          'sessions listed successfully': (r) => r.status === 200,
          'sessions response time < 200ms': (r) => r.timings.duration < 200,
        });

        if (!success) {
          errorRate.add(1);
        } else {
          pollsCompleted.add(1);
          dashboardLatency.add(sessionsRes.timings.duration);
          
          // Count sessions for metrics
          try {
            const body = JSON.parse(sessionsRes.body);
            if (Array.isArray(body)) {
              sessionsListed.add(body.length);
            }
          } catch {
            // Ignore parse errors in load test
          }
        }

        // Polling interval (2-4 seconds)
        sleep(Math.random() * 2 + 2);
      }
    });

    // 3. Fetch session details (if sessions exist)
    group('Session Details', () => {
      const sessionsRes = http.get(`${BASE_URL}/sessions/active`, { headers });
      
      if (sessionsRes.status === 200) {
        try {
          const sessions = JSON.parse(sessionsRes.body);
          
          // Get details for up to 3 sessions
          const sessionsToCheck = sessions.slice(0, 3);
          
          for (const session of sessionsToCheck) {
            const sessionId = session.id || session.sessionId;
            if (sessionId) {
              const detailRes = http.get(`${BASE_URL}/sessions/${sessionId}`, {
                headers,
                tags: { endpoint: 'session_detail' },
              });

              check(detailRes, {
                'session detail loaded': (r) => r.status === 200,
                'detail response time < 300ms': (r) => r.timings.duration < 300,
              }) || errorRate.add(1);

              dashboardLatency.add(detailRes.timings.duration);
              sleep(0.5);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    });

    // 4. Statistics endpoint
    group('Dashboard Statistics', () => {
      const statsRes = http.get(`${BASE_URL}/dashboard/stats`, {
        headers,
        tags: { endpoint: 'dashboard_stats' },
      });

      const success = check(statsRes, {
        'stats loaded': (r) => r.status === 200,
        'stats response time < 200ms': (r) => r.timings.duration < 200,
      });

      if (!success) {
        errorRate.add(1);
      } else {
        dashboardLatency.add(statsRes.timings.duration);
      }
    });
  });

  // Think time between doctor actions
  sleep(Math.random() * 5 + 3);
}

export function setup() {
  console.log(`Starting Dashboard Load Test`);
  console.log(`Scenario: ${SCENARIO}`);
  console.log(`Base URL: ${BASE_URL}`);
  
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    console.error('Health check failed! Aborting test.');
    return { abort: true };
  }
  
  console.log('Health check passed. Starting dashboard load test...');
  return { startTime: Date.now() };
}

export function teardown(data) {
  if (data.abort) return;
  
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Dashboard load test completed in ${duration}s`);
}
