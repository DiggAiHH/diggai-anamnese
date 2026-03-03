/**
 * Netlify Function: /api/answers
 * Handles saving and retrieving patient answers.
 * K-09 FIX: CORS restricted + auth verification
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { corsHeaders, verifyToken, unauthorizedResponse } from './_shared/auth';

interface AnswerRecord {
  sessionId: string;
  questionId: string;
  value: unknown;
  answeredAt: string;
  timeSpentMs?: number;
}

let answersStore: AnswerRecord[] = [];

const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  // K-09 FIX: Require auth for all answer operations
  const auth = verifyToken(event.headers?.authorization || event.headers?.Authorization);
  if (!auth) {
    return unauthorizedResponse(origin);
  }

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // Support batch submission
      const records: AnswerRecord[] = Array.isArray(body.answers)
        ? body.answers.map((a: any) => ({
            sessionId: body.sessionId || a.sessionId,
            questionId: a.questionId,
            value: a.value,
            answeredAt: a.answeredAt || new Date().toISOString(),
            timeSpentMs: a.timeSpentMs,
          }))
        : [{
            sessionId: body.sessionId,
            questionId: body.questionId,
            value: body.value,
            answeredAt: new Date().toISOString(),
            timeSpentMs: body.timeSpentMs,
          }];

      for (const record of records) {
        // Upsert: replace existing answer for same session+question
        const idx = answersStore.findIndex(
          (a) => a.sessionId === record.sessionId && a.questionId === record.questionId
        );
        if (idx >= 0) {
          answersStore[idx] = record;
        } else {
          answersStore.push(record);
        }
      }

      return {
        statusCode: 201,
        headers: corsHeaders(origin),
        body: JSON.stringify({ success: true, saved: records.length }),
      };
    }

    if (event.httpMethod === 'GET') {
      const sessionId = event.queryStringParameters?.sessionId;
      if (!sessionId) {
        return {
          statusCode: 400,
          headers: corsHeaders(origin),
          body: JSON.stringify({ error: 'sessionId parameter required' }),
        };
      }

      const sessionAnswers = answersStore.filter((a) => a.sessionId === sessionId);
      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify({ answers: sessionAnswers }),
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
