import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';

interface FlowNode {
  id: string;
  label: string;
  type: 'start' | 'decision' | 'process' | 'end' | 'module' | 'triage';
  children?: FlowNode[];
  condition?: string;
  color?: string;
}

const BODY_MODULES = [
  { name: 'Angiologie', id: '1010', icon: '🫀', color: 'border-red-400/30' },
  { name: 'Atembeschwerden', id: '1020', icon: '🫁', color: 'border-sky-400/30' },
  { name: 'Magen-Darm', id: '1030', icon: '🧬', color: 'border-yellow-400/30' },
  { name: 'Haut', id: '1040', icon: '🧴', color: 'border-orange-400/30' },
  { name: 'Herz-Kreislauf', id: '1050', icon: '❤️', color: 'border-rose-400/30' },
  { name: 'Stoffwechsel', id: '1060', icon: '⚡', color: 'border-amber-400/30' },
  { name: 'Bewegungsapparat', id: '1070', icon: '🦴', color: 'border-lime-400/30' },
  { name: 'Neurologie', id: '1080', icon: '🧠', color: 'border-purple-400/30' },
  { name: 'Urologie', id: '1090', icon: '🔬', color: 'border-teal-400/30' },
  { name: 'Augen', id: '1A00', icon: '👁️', color: 'border-blue-400/30' },
  { name: 'HNO', id: '1B00', icon: '👂', color: 'border-indigo-400/30' },
  { name: 'Gemüt/Psyche', id: '1C00', icon: '🧘', color: 'border-violet-400/30' },
  { name: 'Gynäkologie', id: 'GYN', icon: '♀️', color: 'border-pink-400/30' },
];

const flowData: FlowNode[] = [
  {
    id: 'landing', label: '🏥 Landing Page', type: 'start',
    children: [
      { id: 'dsgvo', label: '🔒 DSGVO-Einwilligung', type: 'decision', condition: 'Akzeptiert → weiter / Ablehnung → STOPP' },
    ]
  },
  {
    id: 'identifikation', label: '👤 Identifikation', type: 'process',
    children: [
      { id: '0000', label: '0000: Bekannt? (Ja/Nein)', type: 'decision' },
      { id: '0001', label: '0001: Nachname', type: 'process' },
      { id: '0011', label: '0011: Vorname', type: 'process' },
      { id: '0002', label: '0002: Geschlecht (M/W/D)', type: 'process' },
      { id: '0003', label: '0003: Geburtsdatum', type: 'process' },
    ]
  },
  {
    id: 'routing', label: '🔀 Patient-Routing', type: 'decision',
    children: [
      {
        id: 'neu', label: '🆕 Neu-Patient', type: 'module', condition: '0000 = Nein',
        children: [
          { id: 'enrollment', label: 'Versicherung, Adresse, Kontakt (2000–3005)', type: 'process' },
        ]
      },
      {
        id: 'alt', label: '🔄 Bestands-Patient', type: 'module', condition: '0000 = Ja',
        children: [
          { id: 'term100', label: 'TERM-100: Wunschtag', type: 'process' },
          { id: 'term101', label: 'TERM-101: Wunschzeit', type: 'process' },
          { id: 'alt100', label: 'ALT-100: Medikamente geändert?', type: 'decision' },
        ]
      },
    ]
  },
  {
    id: 'besuchsgrund', label: '🎯 VISIT-100: Besuchsgrund', type: 'decision',
    children: [
      { id: 'beschwerdeabklaerung', label: 'Beschwerdeabklärung → 1000', type: 'module', color: 'border-blue-500/40' },
      { id: 'kontrolle', label: 'Kontrolle → 5B-100', type: 'module', color: 'border-green-500/40' },
      { id: 'vorsorge', label: 'Vorsorge → 5C-100', type: 'module', color: 'border-teal-500/40' },
      { id: 'therapie', label: 'Therapieanpassung → 5D-100', type: 'module', color: 'border-amber-500/40' },
      { id: 'befund', label: 'Befunderörterung → 5E-100', type: 'module', color: 'border-purple-500/40' },
      { id: 'tumor', label: 'Tumorverdacht → 5F-100', type: 'module', color: 'border-red-500/40' },
      { id: 'gutachten', label: 'Begutachtung → 5G-100', type: 'module', color: 'border-indigo-500/40' },
      { id: 'unfall', label: 'Unfallfolgen → 5H-100', type: 'module', color: 'border-orange-500/40' },
      { id: 'zweitmeinung', label: 'Zweitmeinung → 5I-100', type: 'module', color: 'border-cyan-500/40' },
    ]
  },
  {
    id: 'beschwerden', label: '🩺 Beschwerden-Chain', type: 'module',
    children: [
      { id: '1000', label: '1000: Beschwerden vorhanden?', type: 'decision', condition: 'Nein + Alt → 9500 (Bewertung)' },
      { id: '1001', label: '1001: Seit wann? (Dauer)', type: 'process' },
      { id: '1004', label: '1004: Wie häufig?', type: 'process' },
      { id: '1005', label: '1005: Auslöser? (Multiselect)', type: 'process' },
      { id: '1006', label: '1006: Verlauf?', type: 'process' },
      { id: '1007', label: '1007: Begleitsymptome', type: 'process' },
      {
        id: '1002', label: '1002: Körperregion → 13 Module', type: 'decision',
        children: BODY_MODULES.map(m => ({
          id: m.id, label: `${m.icon} ${m.name} (${m.id})`, type: 'module' as const,
        }))
      },
    ]
  },
  {
    id: 'history', label: '📋 Medizinische Vorgeschichte', type: 'module',
    children: [
      { id: 'allgemein', label: 'Allgemein: Größe, Gewicht, Diabetes (4000–6007)', type: 'process' },
      { id: 'gewohnheiten', label: 'Gewohnheiten: Rauchen, Sport, Alkohol (4002–4131)', type: 'process' },
      { id: 'vorerkrankungen', label: 'Vorerkrankungen (7000–7011)', type: 'process' },
      { id: 'eingriffe', label: 'Erkrankungen/Eingriffe (8000–8012)', type: 'process' },
    ]
  },
  {
    id: 'conditional', label: '⚙️ Bedingte Blöcke (showIf)', type: 'module',
    children: [
      { id: 'kinder', label: '👶 Kinder (<6 J.): 1500–1604', type: 'module', condition: 'Alter < 6' },
      { id: 'screening', label: '🔍 Screening (>35 J.): 1700–1901', type: 'module', condition: 'Alter > 35' },
      { id: 'schwangerschaft', label: '🤰 Schwangerschaft: 8800–8851', type: 'module', condition: 'W, 14–50 J.' },
      { id: 'gyn', label: '♀️ Gynäkologie: GYN-100–115', type: 'module', condition: 'Geschlecht = W' },
      { id: 'mammo', label: '🩺 Mammografie: MAMMO-100', type: 'module', condition: 'W, >50 J.' },
      { id: 'darm', label: '🔬 Darmkrebs: DARM-W-100', type: 'module', condition: '>50 J.' },
    ]
  },
  {
    id: 'abschluss', label: '✅ Abschluss', type: 'end',
    children: [
      { id: 'medikamente', label: 'MED-100: Medikamente (strukturiert)', type: 'process' },
      { id: 'bewertung', label: '9500–9501: Bewertung (1–5 ⭐)', type: 'process' },
      { id: 'kontakt', label: '9010–9011: Kontaktpräferenz', type: 'process' },
      { id: 'zusammenfassung', label: '📄 Zusammenfassung + PDF-Export', type: 'end' },
    ]
  },
];

export function FlowDiagram() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'beschwerden']));

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderNode = (node: FlowNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    const typeStyles: Record<string, string> = {
      start: 'border-green-500/40 bg-green-500/10',
      decision: 'border-amber-500/40 bg-amber-500/10',
      process: 'border-blue-500/40 bg-blue-500/10',
      end: 'border-emerald-500/40 bg-emerald-500/10',
      module: node.color || 'border-purple-500/40 bg-purple-500/10',
      triage: 'border-red-500/40 bg-red-500/10',
    };

    const depthClass = depth === 0 ? '' : depth === 1 ? 'ml-5' : depth === 2 ? 'ml-10' : 'ml-15';

    return (
      <div key={node.id} className={`relative ${depthClass}`}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${typeStyles[node.type]} mb-1.5 transition-all duration-200 hover:scale-[1.01] ${hasChildren ? 'cursor-pointer' : ''}`}
          onClick={hasChildren ? () => toggleNode(node.id) : undefined}
          {...(hasChildren ? { role: 'button' as const, tabIndex: 0, 'aria-expanded': isExpanded } : {})}
          aria-label={node.label}
        >
          {hasChildren && (
            <span className="text-[var(--text-secondary)] transition-transform duration-200">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          {!hasChildren && <ArrowRight size={12} className="text-[var(--text-muted)]" />}
          <span className="text-sm text-[var(--text-primary)] font-medium">{node.label}</span>
          {node.condition && (
            <span className="text-xs text-[var(--text-muted)] ml-auto bg-[var(--bg-input)] px-2 py-0.5 rounded">{node.condition}</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-3 pl-3 border-l border-[var(--border-primary)]">
            {node.children!.map(child => renderNode(child, 0))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {flowData.map(node => renderNode(node, 0))}
    </div>
  );
}
