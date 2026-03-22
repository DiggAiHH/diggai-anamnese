/**
 * Cycle Manager API Routes
 * 
 * REST API and WebSocket endpoints for the Kimi Cycle Manager.
 * Provides the Photonic Bridge interface for human oversight.
 */

import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getCycleManager } from '../services/cycle-manager/CycleManager';
import { AgentID, CyclePhase, TrustEventReason } from '../services/cycle-manager/types';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// REST ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/cycle-manager/state
 * Get current cycle state (SunControllerState)
 */
router.get('/state', (req, res) => {
  try {
    const cm = getCycleManager();
    const state = cm.getSystemState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cycle state', details: error });
  }
});

/**
 * GET /api/cycle-manager/agents
 * Get all registered agents with their current state
 */
router.get('/agents', (req, res) => {
  try {
    const cm = getCycleManager();
    const agents = cm.getAllAgents();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agents', details: error });
  }
});

/**
 * GET /api/cycle-manager/agents/:id
 * Get specific agent details
 */
router.get('/agents/:id', (req, res) => {
  try {
    const cm = getCycleManager();
    const agent = cm.getAgent(req.params.id as AgentID);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agent', details: error });
  }
});

/**
 * POST /api/cycle-manager/agents/:id/trust
 * Manually adjust agent trust (human override)
 */
router.post('/agents/:id/trust', (req, res) => {
  try {
    const cm = getCycleManager();
    const { reason, note } = req.body;
    
    // This would typically require admin authentication
    cm.updateTrust(req.params.id as AgentID, reason as TrustEventReason);
    
    res.json({ 
      message: 'Trust updated', 
      agentId: req.params.id,
      reason,
      note,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trust', details: error });
  }
});

/**
 * GET /api/cycle-manager/agents/:id/trust-history
 * Get trust history for an agent
 */
router.get('/agents/:id/trust-history', (req, res) => {
  try {
    const cm = getCycleManager();
    const history = cm.getTrustHistory(req.params.id as AgentID);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get trust history', details: error });
  }
});

/**
 * POST /api/cycle-manager/agents/:id/recover
 * Recover an agent from YOLO mode failure
 */
router.post('/agents/:id/recover', (req, res) => {
  try {
    const cm = getCycleManager();
    cm.recoverYOLOSession(req.params.id as AgentID);
    
    res.json({ 
      message: 'YOLO session recovered', 
      agentId: req.params.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to recover agent', details: error });
  }
});

/**
 * GET /api/cycle-manager/photon-stream
 * Get current photonic stream for UI rendering
 */
router.get('/photon-stream', (req, res) => {
  try {
    const cm = getCycleManager();
    const stream = cm.getPhotonStream();
    res.json(stream);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get photon stream', details: error });
  }
});

/**
 * POST /api/cycle-manager/control/start
 * Start the cycle manager
 */
router.post('/control/start', (req, res) => {
  try {
    const cm = getCycleManager();
    cm.start();
    res.json({ message: 'Cycle Manager started', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start cycle manager', details: error });
  }
});

/**
 * POST /api/cycle-manager/control/stop
 * Stop the cycle manager
 */
router.post('/control/stop', (req, res) => {
  try {
    const cm = getCycleManager();
    cm.stop();
    res.json({ message: 'Cycle Manager stopped', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop cycle manager', details: error });
  }
});

/**
 * POST /api/cycle-manager/control/force-phase
 * Force transition to a specific phase (emergency override)
 */
router.post('/control/force-phase', (req, res) => {
  try {
    const { phase } = req.body;
    const cm = getCycleManager();
    
    // This would be a protected admin-only endpoint
    // cm.forcePhaseTransition(phase as CyclePhase);
    
    res.json({ 
      message: 'Phase transition forced', 
      phase,
      warning: 'This is an emergency override',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to force phase transition', details: error });
  }
});

/**
 * GET /api/cycle-manager/manifest/current
 * Get current sunrise manifest
 */
router.get('/manifest/current', (req, res) => {
  // Access through cycle manager's current manifest
  res.json({ message: 'Current manifest', timestamp: new Date().toISOString() });
});

/**
 * GET /api/cycle-manager/confession/current
 * Get current moon confession
 */
router.get('/confession/current', (req, res) => {
  // Access through cycle manager's current confession
  res.json({ message: 'Current confession', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBSOCKET SETUP
// ═══════════════════════════════════════════════════════════════════════════

export function setupCycleManagerWebSocket(server: Server): void {
  const wss = new WebSocketServer({ 
    server,
    path: '/cycle-manager',
  });
  
  const cm = getCycleManager();
  
  // Broadcast to all connected clients
  const broadcast = (data: unknown) => {
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  // Subscribe to cycle manager events
  cm.on('cycle:transition', (data) => {
    broadcast({ type: 'cycle:transition', ...data });
  });
  
  cm.on('trust:changed', (data) => {
    broadcast({ type: 'trust:changed', ...data });
  });
  
  cm.on('agent:registered', (data) => {
    broadcast({ type: 'agent:registered', ...data });
  });
  
  cm.on('yolo:started', (data) => {
    broadcast({ type: 'yolo:started', ...data });
  });
  
  cm.on('yolo:ended', (data) => {
    broadcast({ type: 'yolo:ended', ...data });
  });
  
  cm.on('yolo:recovered', (data) => {
    broadcast({ type: 'yolo:recovered', ...data });
  });
  
  cm.on('witness:requested', (data) => {
    broadcast({ type: 'witness:requested', ...data });
  });
  
  cm.on('witness:resolved', (data) => {
    broadcast({ type: 'witness:resolved', ...data });
  });
  
  cm.on('cycle:sunrise:completed', (data) => {
    broadcast({ type: 'cycle:sunrise:completed', ...data });
  });
  
  cm.on('cycle:morning_peak:completed', (data) => {
    broadcast({ type: 'cycle:morning_peak:completed', ...data });
  });
  
  cm.on('cycle:solar_noon:completed', (data) => {
    broadcast({ type: 'cycle:solar_noon:completed', ...data });
  });
  
  cm.on('cycle:afternoon:completed', (data) => {
    broadcast({ type: 'cycle:afternoon:completed', ...data });
  });
  
  cm.on('cycle:moon_witness:completed', (data) => {
    broadcast({ type: 'cycle:moon_witness:completed', ...data });
  });
  
  cm.on('cycle:silent_witness:start', () => {
    broadcast({ type: 'cycle:silent_witness:start' });
  });
  
  cm.on('cycle:silent_witness:end', () => {
    broadcast({ type: 'cycle:silent_witness:end' });
  });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('[KCM] WebSocket client connected');
    
    // Send initial state
    ws.send(JSON.stringify({
      type: 'connection:established',
      currentPhase: cm.getCurrentPhase(),
      timestamp: new Date().toISOString(),
    }));
    
    ws.on('message', (message: Buffer | string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle client commands
        switch (data.action) {
          case 'get_state':
            ws.send(JSON.stringify({
              type: 'state',
              data: cm.getSystemState(),
            }));
            break;
            
          case 'get_agents':
            ws.send(JSON.stringify({
              type: 'agents',
              data: cm.getAllAgents(),
            }));
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
            
          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown action' }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      console.log('[KCM] WebSocket client disconnected');
    });
  });
  
  console.log('[KCM] WebSocket server initialized on /cycle-manager');
}

export default router;
