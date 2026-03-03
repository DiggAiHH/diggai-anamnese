/**
 * Netlify Function: /api/health
 * Health check endpoint for monitoring.
 * K-09 FIX: CORS restricted (health is public but CORS limited)
 */
import type { Handler } from '@netlify/functions';
import { corsHeaders } from './_shared/auth';

const handler: Handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  return {
    statusCode: 200,
    headers: corsHeaders(origin),
    body: JSON.stringify({
      status: 'ok',
      service: 'DiggAI Anamnese API',
      version: '16.0',
      timestamp: new Date().toISOString(),
      environment: 'netlify-functions',
      endpoints: [
        'GET  /api/health',
        'POST /api/sessions',
        'GET  /api/sessions',
        'PUT  /api/sessions',
        'POST /api/answers',
        'GET  /api/answers?sessionId=...',
        'POST /api/upload',
        'POST /api/export',
      ],
    }),
  };
};

export { handler };
