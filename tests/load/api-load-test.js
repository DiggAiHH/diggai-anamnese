/**
 * DiggAI Anamnese - API Load Test
 * Tests the core API endpoints under load
 * 
 * Usage:
 *   k6 run tests/load/api-load-test.js
 *   k6 run --env SCENARIO=peak tests/load/api-load-test.js
 *   k6 run --env BASE_URL=https://api.diggai.de/api tests/load/api-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { scenarios, thresholds } from './scenarios.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const sessionCreated = new Counter('sessions_created');
const answersSubmitted = new Counter('answers_submitted');
const activeSessions = new Gauge('active_sessions');

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
    test: 'api-load',
    environment: __ENV.ENV || 'local',
  },
};

// Test data generators
const firstNames = ['Max', 'Maria', 'Hans', 'Anna', 'Peter', 'Laura', 'Thomas', 'Sarah'];
const lastNames = ['Mustermann', 'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSessionData() {
  return {
    service: Math.random() > 0.5 ? 'Termin / Anamnese' : 'Nur Anamnese',
    isNewPatient: Math.random() > 0.3,
    language: ['de', 'en', 'tr', 'ar'][Math.floor(Math.random() * 4)],
  };
}

function generateAnswerData(sessionId, atomId, value) {
  return {
    sessionId,
    atomId,
    value,
    timeSpentMs: Math.floor(Math.random() * 5000) + 1000,
    timestamp: new Date().toISOString(),
  };
}

// Main test function
export default function () {
  const sessionToken = `session-${__VU}-${Date.now()}`;
  
  group('Session Creation', () => {
    const sessionData = generateSessionData();
    
    const sessionRes = http.post(
      `${BASE_URL}/sessions`,
      JSON.stringify(sessionData),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Session': sessionToken,
        },
        tags: { endpoint: 'create_session' },
      }
    );

    const success = check(sessionRes, {
      'session created successfully': (r) => r.status === 201,
      'session has valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      'session response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      sessionCreated.add(1);
      apiLatency.add(sessionRes.timings.duration);
    }

    if (sessionRes.status === 201) {
      const sessionBody = JSON.parse(sessionRes.body);
      const sessionId = sessionBody.sessionId || sessionBody.id;
      
      if (sessionId) {
        activeSessions.add(1);
        
        // Simulate answer submission flow
        group('Answer Submission Flow', () => {
          submitPatientAnswers(sessionId, sessionToken);
        });

        activeSessions.add(-1);
      }
    }
  });

  sleep(Math.random() * 3 + 2);
}

function submitPatientAnswers(sessionId, sessionToken) {
  // Simulate a realistic patient answer flow
  const answerFlow = [
    { atomId: '0000', value: 'neu', delay: 2 },                    // Patient type
    { atomId: '0001', value: getRandomItem(lastNames), delay: 3 }, // Last name
    { atomId: '0011', value: getRandomItem(firstNames), delay: 3 }, // First name
    { atomId: '0021', value: '1985-06-15', delay: 2 },             // Birth date
    { atomId: '0100', value: 'männlich', delay: 1 },               // Gender
    { atomId: '1000', value: 'Schmerzen', delay: 5 },              // Chief complaint
    { atomId: '1100', value: '3 Tage', delay: 3 },                 // Duration
    { atomId: '1200', value: 'mittel', delay: 2 },                 // Severity
  ];

  for (const answer of answerFlow) {
    const answerData = generateAnswerData(sessionId, answer.atomId, answer.value);
    
    const answerRes = http.post(
      `${BASE_URL}/answers/${sessionId}`,
      JSON.stringify(answerData),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Session': sessionToken,
        },
        tags: { endpoint: 'submit_answer' },
      }
    );

    const success = check(answerRes, {
      'answer submitted successfully': (r) => r.status === 200 || r.status === 201,
      'answer response time < 300ms': (r) => r.timings.duration < 300,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      answersSubmitted.add(1);
      apiLatency.add(answerRes.timings.duration);
    }

    sleep(answer.delay + Math.random() * 2);
  }
}

// Test lifecycle hooks
export function setup() {
  console.log(`Starting API Load Test`);
  console.log(`Scenario: ${SCENARIO}`);
  console.log(`Base URL: ${BASE_URL}`);
  
  // Health check before starting
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    console.error('Health check failed! Aborting test.');
    return { abort: true };
  }
  
  console.log('Health check passed. Starting load test...');
  return { startTime: Date.now() };
}

export function teardown(data) {
  if (data.abort) {
    console.error('Test was aborted due to failed health check.');
    return;
  }
  
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration}s`);
  console.log('Check the summary above for results.');
}
