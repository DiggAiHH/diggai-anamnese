/**
 * Netlify Function: /api/export
 * Handles session data export (JSON/PDF format info).
 * K-09 FIX: CORS restricted + auth verification
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { corsHeaders, verifyToken, unauthorizedResponse } from './_shared/auth';

const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  // K-09 FIX: Require auth for exports
  const auth = verifyToken(event.headers?.authorization || event.headers?.Authorization);
  if (!auth) {
    return unauthorizedResponse(origin);
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const format = body.format || 'json';
    const sessionData = body.sessionData;

    if (!sessionData) {
      return {
        statusCode: 400,
        headers: corsHeaders(origin),
        body: JSON.stringify({ error: 'sessionData is required' }),
      };
    }

    if (format === 'json') {
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders(origin),
          'Content-Disposition': `attachment; filename="anamnese-export-${Date.now()}.json"`,
        },
        body: JSON.stringify({
          exportedAt: new Date().toISOString(),
          format: 'DiggAI Anamnese Export v1',
          data: sessionData,
        }, null, 2),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        success: true,
        message: `Export im Format "${format}" vorbereitet`,
        exportId: `exp_${Date.now()}`,
      }),
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
