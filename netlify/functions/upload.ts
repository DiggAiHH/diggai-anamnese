/**
 * Netlify Function: /api/upload
 * Handles file uploads (documents, scanned images).
 * K-09 FIX: CORS restricted + auth verification
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { corsHeaders, verifyToken, unauthorizedResponse } from './_shared/auth';

interface UploadedFile {
  id: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const uploadsStore: UploadedFile[] = [];

const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  // K-09 FIX: Require auth
  const auth = verifyToken(event.headers?.authorization || event.headers?.Authorization);
  if (!auth) {
    return unauthorizedResponse(origin);
  }

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      const upload: UploadedFile = {
        id: `upl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        sessionId: body.sessionId || 'anonymous',
        filename: body.filename || 'unknown',
        mimeType: body.mimeType || 'application/octet-stream',
        size: body.data ? Math.ceil((body.data.length * 3) / 4) : 0,
        uploadedAt: new Date().toISOString(),
      };

      uploadsStore.push(upload);

      return {
        statusCode: 201,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          success: true,
          upload: { id: upload.id, filename: upload.filename, size: upload.size },
        }),
      };
    }

    if (event.httpMethod === 'GET') {
      const sessionId = event.queryStringParameters?.sessionId;
      const files = sessionId
        ? uploadsStore.filter((u) => u.sessionId === sessionId)
        : uploadsStore;

      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify({ uploads: files, total: files.length }),
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
