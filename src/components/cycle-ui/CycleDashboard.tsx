/**
 * Photonic Bridge - Cycle Dashboard
 * 
 * The UI representation of the Kimi Cycle Manager.
 * "The only way to the human is through light (UI)."
 */

import React, { useEffect, useState } from 'react';
import { 
  Sun, 
  Sunrise, 
  Sunset, 
  Moon, 
  Activity, 
  Shield, 
  AlertTriangle,
  RefreshCw,
  Users,
  Clock,
  Eye,
  Zap,
  Pause
} from 'lucide-react';

// Types matching the Cycle Manager
interface Agent {
  id: string;
  name: string;
  state: string;
  trustBattery: number;
  currentCycle: string;
  lastSeen: string;
}

interface CycleState {
  currentPhase: string;
  nextPhase: string;
  timeUntilNextPhase: number;
  cycleProgress: number;
  season: string;
}

interface TrustEvent {
  timestamp: string;
  agentId: string;
  delta: number;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHOTONIC BRIDGE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export const CycleDashboard: React.FC = () => {
  const [cycleState, setCycleState] = useState<CycleState | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [trustHistory, setTrustHistory] = useState<TrustEvent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/cycle-manager');
    
    ws.onopen = () => {
      setWsConnected(true);
      console.log('[PhotonicBridge] Connected to Cycle Manager');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleCycleEvent(data);
    };
    
    ws.onclose = () => {
      setWsConnected(false);
      console.log('[PhotonicBridge] Disconnected from Cycle Manager');
    };
    
    // Initial data fetch
    fetchCycleState();
    fetchAgents();
    
    return () => ws.close();
  }, []);

  const handleCycleEvent = (event: any) => {
    switch (event.type) {
      case 'cycle:transition':
        // Flash the screen to indicate phase change
        flashPhaseTransition(event.to);
        break;
      case 'trust:changed':
        setTrustHistory(prev => [event, ...prev].slice(0, 50));
        break;
      case 'agent:registered':
      case 'agent:state-changed':
        fetchAgents();
        break;
    }
    fetchCycleState();
  };

  const fetchCycleState = async () => {
    try {
      const response = await fetch('/api/cycle-manager/state');
      const data = await response.json();
      setCycleState(data);
    } catch (err) {
      console.error('Failed to fetch cycle state:', err);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/cycle-manager/agents');
      const data = await response.json();
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  const flashPhaseTransition = (phase: string) => {
    // Visual feedback for phase change
    const flash = document.createElement('div');
    flash.className = `fixed inset-0 z-50 pointer-events-none transition-opacity duration-1000 ${
      phase === 'sunrise' ? 'bg-amber-500/30' :
      phase === 'moon_witness' ? 'bg-indigo-500/30' :
      'bg-blue-500/20'
    }`;
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.classList.add('opacity-0');
      setTimeout(() => flash.remove(), 1000);
    }, 200);
  };

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'sunrise': return <Sunrise className="w-6 h-6 text-amber-500" />;
      case 'morning_peak': return <Sun className="w-6 h-6 text-yellow-500" />;
      case 'solar_noon': return <Sun className="w-6 h-6 text-orange-500" />;
      case 'afternoon': return <Sunset className="w-6 h-6 text-orange-400" />;
      case 'moon_witness': return <Moon className="w-6 h-6 text-indigo-400" />;
      case 'darkness': return <Moon className="w-6 h-6 text-slate-600" />;
      default: return <Activity className="w-6 h-6" />;
    }
  };

  const getPhaseName = (phase: string): string => {
    const names: Record<string, string> = {
      sunrise: '🌅 Sunrise Alignment',
      morning_peak: '🌄 Morning Peak',
      solar_noon: '☀️ Solar Noon',
      afternoon: '🌇 Afternoon Decline',
      moon_witness: '🌙 Moon Witness',
      darkness: '🌑 Darkness',
    };
    return names[phase] || phase;
  };

  const getTrustColor = (battery: number): string => {
    if (battery >= 90) return 'text-emerald-500';
    if (battery >= 70) return 'text-green-500';
    if (battery >= 50) return 'text-yellow-500';
    if (battery >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getTrustBg = (battery: number): string => {
    if (battery >= 90) return 'bg-emerald-500';
    if (battery >= 70) return 'bg-green-500';
    if (battery >= 50) return 'bg-yellow-500';
    if (battery >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'yolo_mode': return <Zap className="w-4 h-4 text-purple-500" />;
      case 'in_meeting': return <Users className="w-4 h-4 text-blue-500" />;
      case 'dormant': return <Pause className="w-4 h-4 text-slate-400" />;
      case 'quarantined': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'confessing': return <Eye className="w-4 h-4 text-indigo-500" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-indigo-400 bg-clip-text text-transparent">
              Kimi Cycle Manager
            </h1>
            <p className="text-slate-400 mt-1">
              Reverse Social Engineering Governance System
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              wsConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {wsConnected ? 'Photonic Bridge Active' : 'Disconnected'}
            </div>
            <button 
              onClick={() => { fetchCycleState(); fetchAgents(); }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Current Cycle Status */}
      {cycleState && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {getPhaseIcon(cycleState.currentPhase)}
              <div>
                <h2 className="text-xl font-semibold">{getPhaseName(cycleState.currentPhase)}</h2>
                <p className="text-slate-400 text-sm">
                  Season: <span className="capitalize text-amber-400">{cycleState.season}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Next Phase</p>
              <p className="font-medium">{getPhaseName(cycleState.nextPhase)}</p>
              <p className="text-2xl font-mono text-amber-400">
                {formatTimeRemaining(cycleState.timeUntilNextPhase)}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-1000"
              style={{ width: `${cycleState.cycleProgress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>🌅 Sunrise</span>
            <span>🌄 Morning</span>
            <span>☀️ Noon</span>
            <span>🌇 Afternoon</span>
            <span>🌙 Moon</span>
            <span>🌑 Darkness</span>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {agents.map(agent => (
          <div 
            key={agent.id}
            onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
            className={`p-5 rounded-xl border transition-all cursor-pointer ${
              selectedAgent === agent.id 
                ? 'border-amber-500/50 bg-slate-800/80' 
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  agent.state === 'yolo_mode' ? 'bg-purple-500/20' :
                  agent.state === 'quarantined' ? 'bg-red-500/20' :
                  agent.state === 'confessing' ? 'bg-indigo-500/20' :
                  'bg-slate-700'
                }`}>
                  {getStateIcon(agent.state)}
                </div>
                <div>
                  <h3 className="font-semibold capitalize">{agent.name}</h3>
                  <p className="text-xs text-slate-400 capitalize">{agent.state.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getTrustColor(agent.trustBattery)}`}>
                  {agent.trustBattery}%
                </div>
                <p className="text-xs text-slate-500">Trust</p>
              </div>
            </div>
            
            {/* Trust Battery Visual */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Trust Battery</span>
                <span className={getTrustColor(agent.trustBattery)}>
                  {agent.trustBattery >= 90 ? 'Sovereign' :
                   agent.trustBattery >= 70 ? 'Trusted' :
                   agent.trustBattery >= 50 ? 'Watched' :
                   agent.trustBattery >= 30 ? 'Restricted' : 'Quarantined'}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getTrustBg(agent.trustBattery)}`}
                  style={{ width: `${agent.trustBattery}%` }}
                />
              </div>
            </div>
            
            {/* Expanded Details */}
            {selectedAgent === agent.id && (
              <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-slate-400 text-xs mb-1">Current Cycle</p>
                    <p className="capitalize">{agent.currentCycle.replace('_', ' ')}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-slate-400 text-xs mb-1">Last Seen</p>
                    <p>{new Date(agent.lastSeen).toLocaleTimeString()}</p>
                  </div>
                </div>
                
                {/* Recent Trust Events */}
                <div>
                  <p className="text-slate-400 text-xs mb-2">Recent Trust Events</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {trustHistory
                      .filter(e => e.agentId === agent.id)
                      .slice(0, 5)
                      .map((event, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-1 px-2 bg-slate-800 rounded">
                          <span className="text-slate-300">{event.reason.replace('_', ' ')}</span>
                          <span className={event.delta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {event.delta > 0 ? '+' : ''}{event.delta}
                          </span>
                        </div>
                      ))}
                    {trustHistory.filter(e => e.agentId === agent.id).length === 0 && (
                      <p className="text-slate-500 text-sm italic">No recent events</p>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Trigger manual YOLO recovery
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Force Checkpoint
                  </button>
                  {agent.state === 'quarantined' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Request forgiveness ritual
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                    >
                      Forgiveness Ritual
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* System Status Footer */}
      <footer className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">System Time:</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">Active Agents:</span>
              <span className="text-emerald-400">{agents.filter(a => a.state !== 'dormant').length}/{agents.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">Quarantined:</span>
              <span className={agents.filter(a => a.state === 'quarantined').length > 0 ? 'text-red-400' : 'text-emerald-400'}>
                {agents.filter(a => a.state === 'quarantined').length}
              </span>
            </div>
          </div>
          <div className="text-slate-500 text-xs">
            Photonic Bridge v1.0 • "Through light we govern"
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CycleDashboard;
