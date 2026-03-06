// ─── Treatment Flow Builder ────────────────────────────────
// Modul 7/8: Admin page for creating/editing treatment flows

import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save, Play,
  Clock, MapPin, Users, ChevronUp, ChevronDown, Settings,
  Stethoscope, FlaskConical, CreditCard, ClipboardList
} from 'lucide-react';

type StepType = 'WAITING' | 'REGISTRATION' | 'LAB' | 'EKG' | 'CONSULTATION' | 'CHECKOUT' | 'PAYMENT';

interface FlowStepDraft {
  id: string;
  type: StepType;
  roomType: string;
  specificRoomId: string;
  estimatedMinutes: number;
  bufferMinutes: number;
  requiredStaff: string[];
  instructions: { de: string; en: string };
  preparationVideo: string;
  nfcCheckpointId: string;
  condition: string;
  isSkippable: boolean;
}

interface FlowDraft {
  name: string;
  description: string;
  serviceType: string;
  isActive: boolean;
  steps: FlowStepDraft[];
}

const STEP_TYPE_CONFIG: Record<StepType, { label: string; color: string; icon: typeof Clock }> = {
  WAITING: { label: 'Wartebereich', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Clock },
  REGISTRATION: { label: 'Anmeldung', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: ClipboardList },
  LAB: { label: 'Labor', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: FlaskConical },
  EKG: { label: 'EKG/Diagnostik', color: 'bg-pink-100 text-pink-700 border-pink-300', icon: Stethoscope },
  CONSULTATION: { label: 'Sprechzimmer', color: 'bg-green-100 text-green-700 border-green-300', icon: Users },
  CHECKOUT: { label: 'Checkout', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Settings },
  PAYMENT: { label: 'Zahlung', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CreditCard },
};

const SERVICE_TYPES = [
  { value: 'anamnese', label: 'Anamnese / Erstbesuch' },
  { value: 'followup', label: 'Nachsorge' },
  { value: 'lab', label: 'Laboruntersuchung' },
  { value: 'prescription', label: 'Rezept / Überweisung' },
  { value: 'prevention', label: 'Vorsorge' },
  { value: 'emergency', label: 'Akutfall' },
];

function createEmptyStep(): FlowStepDraft {
  return {
    id: crypto.randomUUID(),
    type: 'WAITING',
    roomType: '',
    specificRoomId: '',
    estimatedMinutes: 15,
    bufferMinutes: 5,
    requiredStaff: [],
    instructions: { de: '', en: '' },
    preparationVideo: '',
    nfcCheckpointId: '',
    condition: '',
    isSkippable: true,
  };
}

export function TreatmentFlowBuilder() {
  const navigate = useNavigate();
  const { flowId } = useParams();
  const isEditing = !!flowId;

  const [flow, setFlow] = useState<FlowDraft>({
    name: '',
    description: '',
    serviceType: 'anamnese',
    isActive: true,
    steps: [createEmptyStep()],
  });

  const [expandedStep, setExpandedStep] = useState<string | null>(flow.steps[0]?.id || null);
  const [saving, setSaving] = useState(false);

  const updateFlow = useCallback((updates: Partial<FlowDraft>) => {
    setFlow(f => ({ ...f, ...updates }));
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<FlowStepDraft>) => {
    setFlow(f => ({
      ...f,
      steps: f.steps.map(s => s.id === stepId ? { ...s, ...updates } : s),
    }));
  }, []);

  const addStep = useCallback(() => {
    const step = createEmptyStep();
    setFlow(f => ({ ...f, steps: [...f.steps, step] }));
    setExpandedStep(step.id);
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setFlow(f => ({ ...f, steps: f.steps.filter(s => s.id !== stepId) }));
  }, []);

  const moveStep = useCallback((stepId: string, direction: 'up' | 'down') => {
    setFlow(f => {
      const idx = f.steps.findIndex(s => s.id === stepId);
      if (idx < 0) return f;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= f.steps.length) return f;
      const steps = [...f.steps];
      [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];
      return { ...f, steps };
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // Would call API: flowCreate or flowUpdate
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    navigate('/flows/live');
  };

  const totalTime = flow.steps.reduce((sum, s) => sum + s.estimatedMinutes + s.bufferMinutes, 0);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} title="Zurück" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {isEditing ? 'Flow bearbeiten' : 'Neuer Treatment Flow'}
              </h1>
              <p className="text-sm text-gray-500">
                {flow.steps.length} Schritte · ~{totalTime} Min. gesamt
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/flows/live')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Play className="w-4 h-4" /> Live Board
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !flow.name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Flow Meta */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Flow-Informationen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={flow.name}
                onChange={e => updateFlow({ name: e.target.value })}
                placeholder="z.B. Standard-Anamnese"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leistungsart</label>
              <select
                value={flow.serviceType}
                onChange={e => updateFlow({ serviceType: e.target.value })}
                title="Leistungsart"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
              >
                {SERVICE_TYPES.map(st => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={flow.description}
              onChange={e => updateFlow({ description: e.target.value })}
              placeholder="Optionale Beschreibung des Behandlungsablaufs..."
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={flow.isActive}
              onChange={e => updateFlow({ isActive: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Flow ist aktiv</span>
          </label>
        </section>

        {/* Steps */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Behandlungsschritte</h2>
            <button
              onClick={addStep}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
            >
              <Plus className="w-4 h-4" /> Schritt hinzufügen
            </button>
          </div>

          <div className="space-y-3">
            {flow.steps.map((step, idx) => {
              const config = STEP_TYPE_CONFIG[step.type];
              const StepIcon = config.icon;
              const isExpanded = expandedStep === step.id;

              return (
                <div key={step.id} className={`bg-white rounded-xl border ${isExpanded ? 'border-blue-300 shadow-md' : 'border-gray-200'} transition-all`}>
                  {/* Step Header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                  >
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">
                      {idx + 1}
                    </span>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border ${config.color}`}>
                      <StepIcon className="w-4 h-4" />
                      {config.label}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-400 ml-auto">
                      <Clock className="w-3.5 h-3.5" />
                      {step.estimatedMinutes} Min.
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); moveStep(step.id, 'up'); }} disabled={idx === 0} title="Nach oben" className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); moveStep(step.id, 'down'); }} disabled={idx === flow.steps.length - 1} title="Nach unten" className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeStep(step.id); }} title="Entfernen" className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step Details (expanded) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Schritt-Typ</label>
                          <select
                            value={step.type}
                            onChange={e => updateStep(step.id, { type: e.target.value as StepType })}
                            title="Schritt-Typ"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                          >
                            {Object.entries(STEP_TYPE_CONFIG).map(([key, val]) => (
                              <option key={key} value={key}>{val.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            <Clock className="w-3 h-3 inline mr-1" />Geschätzte Dauer (Min.)
                          </label>
                          <input
                            type="number"
                            value={step.estimatedMinutes}
                            onChange={e => updateStep(step.id, { estimatedMinutes: parseInt(e.target.value) || 0 })}
                            min={1}
                            max={120}
                            placeholder="Dauer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Puffer (Min.)</label>
                          <input
                            type="number"
                            value={step.bufferMinutes}
                            onChange={e => updateStep(step.id, { bufferMinutes: parseInt(e.target.value) || 0 })}
                            min={0}
                            max={30}
                            placeholder="Puffer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            <MapPin className="w-3 h-3 inline mr-1" />Raum-Typ
                          </label>
                          <input
                            type="text"
                            value={step.roomType}
                            onChange={e => updateStep(step.id, { roomType: e.target.value })}
                            placeholder="z.B. Wartezimmer, Labor, Sprechzimmer 1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            <Users className="w-3 h-3 inline mr-1" />Benötigtes Personal
                          </label>
                          <input
                            type="text"
                            value={step.requiredStaff.join(', ')}
                            onChange={e => updateStep(step.id, { requiredStaff: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            placeholder="MFA, Arzt (kommagetrennt)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Anweisungen (DE)</label>
                        <textarea
                          value={step.instructions.de}
                          onChange={e => updateStep(step.id, { instructions: { ...step.instructions, de: e.target.value } })}
                          placeholder="Anweisungen für den Patienten..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={step.isSkippable}
                            onChange={e => updateStep(step.id, { isSkippable: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm text-gray-600">Überspringbar</span>
                        </label>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={step.condition}
                            onChange={e => updateStep(step.id, { condition: e.target.value })}
                            placeholder="Bedingung (optional, z.B. 'lab_required === true')"
                            className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-500 focus:ring-1 focus:ring-blue-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Step Button */}
          <button
            onClick={addStep}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Weiteren Schritt hinzufügen
          </button>
        </section>

        {/* Summary Card */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-800 mb-3">Flow-Zusammenfassung</h3>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-blue-700">{flow.steps.length} Schritte</span>
            <span className="text-blue-700">~{totalTime} Min. gesamt</span>
            <span className="text-blue-700">{flow.steps.filter(s => !s.isSkippable).length} Pflichtschritte</span>
            <span className={flow.isActive ? 'text-green-600' : 'text-gray-400'}>
              {flow.isActive ? '● Aktiv' : '○ Inaktiv'}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {flow.steps.map((step, idx) => {
              const config = STEP_TYPE_CONFIG[step.type];
              return (
                <div key={step.id} className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                    {idx + 1}. {config.label}
                  </span>
                  {idx < flow.steps.length - 1 && <span className="text-gray-300">→</span>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TreatmentFlowBuilder;
