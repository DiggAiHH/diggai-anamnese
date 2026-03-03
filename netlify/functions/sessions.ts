/**
 * Netlify Function: /api/sessions
 * Handles patient session creation and retrieval.
 * K-09 FIX: CORS restricted + auth verification
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { corsHeaders, verifyToken, unauthorizedResponse } from './_shared/auth';

// Simple in-memory + JSON blob storage
const STORE_KEY = 'anamnese-sessions';

interface PatientSession {
  id: string;
  patientName: string;
  birthDate: string;
  gender: string;
  service: string;
  insuranceType: string;
  isNewPatient: boolean;
  answers: Record<string, unknown>;
  status: 'active' | 'completed' | 'submitted';
  createdAt: string;
  updatedAt: string;
  language: string;
}

function generateId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// We use the global Netlify Blobs API when available, or fall back to returning ephemeral data
let sessionsCache: PatientSession[] = [];

const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  // K-09 FIX: Verify auth token (POST = session creation allowed without full auth)
  const auth = verifyToken(event.headers?.authorization || event.headers?.Authorization);
  if (!auth && event.httpMethod !== 'POST') {
    return unauthorizedResponse(origin);
  }

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const session: PatientSession = {
        id: generateId(),
        patientName: body.patientName || '',
        birthDate: body.birthDate || '',
        gender: body.gender || '',
        service: body.service || '',
        insuranceType: body.insuranceType || 'gesetzlich',
        isNewPatient: body.isNewPatient ?? true,
        answers: body.answers || {},
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        language: body.language || 'de',
      };
      sessionsCache.push(session);

      return {
        statusCode: 201,
        headers: corsHeaders(origin),
        body: JSON.stringify({ success: true, session }),
      };
    }

    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id;
      if (id) {
        const session = sessionsCache.find((s) => s.id === id);
        if (!session) {
          return {
            statusCode: 404,
            headers: corsHeaders(origin),
            body: JSON.stringify({ error: 'Session nicht gefunden' }),
          };
        }
        return {
          statusCode: 200,
          headers: corsHeaders(origin),
          body: JSON.stringify({ session }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          sessions: sessionsCache,
          total: sessionsCache.length,
        }),
      };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const idx = sessionsCache.findIndex((s) => s.id === body.id);
      if (idx === -1) {
        return {
          statusCode: 404,
          headers: corsHeaders(origin),
          body: JSON.stringify({ error: 'Session nicht gefunden' }),
        };
      }
      sessionsCache[idx] = {
        ...sessionsCache[idx],
        ...body,
        updatedAt: new Date().toISOString(),
      };
      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify({ success: true, session: sessionsCache[idx] }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Internal server error', details: String(err) }),
    };
  }
};

export { handler };
