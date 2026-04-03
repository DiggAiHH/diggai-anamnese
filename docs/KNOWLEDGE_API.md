# Knowledge-Harnessing API

## Overview

Real-time knowledge extraction and learning management system.

## Endpoints

### GET /api/knowledge/dashboard
Returns dashboard statistics.

### GET /api/knowledge/learnings
List learnings with filters and pagination.

### POST /api/knowledge/learnings
Create a new learning.

### GET /api/knowledge/learnings/:id
Get learning details.

### PATCH /api/knowledge/learnings/:id
Update learning status.

### GET /api/knowledge/error-patterns
List error patterns.

### POST /api/knowledge/capture
Manually capture knowledge.

### GET /api/knowledge/metrics
Get metric statistics.

## WebSocket Events

- `knowledge:error:detected` - New error pattern
- `knowledge:learning:created` - New learning
- `knowledge:learning:updated` - Learning updated
- `knowledge:anomaly:detected` - Metric anomaly
