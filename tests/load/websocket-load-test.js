/**
 * DiggAI Anamnese - WebSocket Load Test
 * Tests Socket.IO connections and real-time message handling
 * 
 * Note: This requires the k6 Socket.IO extension or xk6
 * For standard k6, this tests the HTTP fallback endpoints
 * 
 * Usage:
 *   k6 run tests/load/websocket-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const wsLatency = new Trend('websocket_latency');
const connectionsOpened = new Counter('ws_connections_opened');
const messagesSent = new Counter('ws_messages_sent');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    errors: ['rate<0.01'],
  },
};

// Generate test session data
function generateSessionId(vu) {
  return `ws-test-${vu}-${Date.now()}`;
}

// Test Socket.IO HTTP polling endpoints
// (Fallback for environments without native WebSocket support in k6)
export default function () {
  const sessionId = generateSessionId(__VU);
  
  // 1. Initialize Socket.IO session
  const sidRes = http.get(
    `${BASE_URL}/socket.io/?EIO=4&transport=polling`,
    { tags: { endpoint: 'socketio_init' } }
  );

  const initSuccess = check(sidRes, {
    'socket.io init successful': (r) => r.status === 200,
    'init response contains sid': (r) => r.body.includes('sid'),
  });

  if (!initSuccess) {
    errorRate.add(1);
    return;
  }

  connectionsOpened.add(1);
  wsLatency.add(sidRes.timings.duration);

  // Extract SID if present
  let sid = null;
  try {
    const match = sidRes.body.match(/"sid":"([^"]+)"/);
    if (match) sid = match[1];
  } catch {
    // Ignore extraction errors
  }

  sleep(0.5);

  // 2. Send connection message (40 = CONNECT)
  if (sid) {
    const connectRes = http.post(
      `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${sid}`,
      '40',
      { 
        headers: { 'Content-Type': 'text/plain' },
        tags: { endpoint: 'socketio_connect' },
      }
    );

    check(connectRes, {
      'socket.io connect successful': (r) => r.status === 200,
    }) || errorRate.add(1);

    wsLatency.add(connectRes.timings.duration);
    sleep(0.5);

    // 3. Join session room (42 = EVENT)
    const joinPayload = `42["join","${sessionId}"]`;
    const joinRes = http.post(
      `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${sid}`,
      joinPayload,
      {
        headers: { 'Content-Type': 'text/plain' },
        tags: { endpoint: 'socketio_join' },
      }
    );

    check(joinRes, {
      'socket.io join successful': (r) => r.status === 200,
    }) || errorRate.add(1);

    messagesSent.add(1);
    wsLatency.add(joinRes.timings.duration);

    // 4. Simulate real-time updates
    for (let i = 0; i < 5; i++) {
      sleep(Math.random() * 2 + 1);
      
      // Send ping/heartbeat
      const pingRes = http.get(
        `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${sid}`,
        { tags: { endpoint: 'socketio_poll' } }
      );

      check(pingRes, {
        'socket.io poll successful': (r) => r.status === 200,
      }) || errorRate.add(1);

      wsLatency.add(pingRes.timings.duration);
    }

    // 5. Disconnect (41 = DISCONNECT)
    const disconnectRes = http.post(
      `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${sid}`,
      '41',
      {
        headers: { 'Content-Type': 'text/plain' },
        tags: { endpoint: 'socketio_disconnect' },
      }
    );

    check(disconnectRes, {
      'socket.io disconnect successful': (r) => r.status === 200,
    }) || errorRate.add(1);
  }

  sleep(Math.random() * 3 + 2);
}

export function setup() {
  console.log('Starting WebSocket Load Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.error('Health check failed! Aborting test.');
    return { abort: true };
  }
  
  console.log('Health check passed. Starting WebSocket load test...');
  return { startTime: Date.now() };
}

export function teardown(data) {
  if (data.abort) return;
  
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`WebSocket load test completed in ${duration}s`);
}
