import { BarChart3, Bot, Building2, ShieldCheck, Workflow } from 'lucide-react';

interface PracticeGrowthSectionProps {
	onOpenAdmin: () => void;
	onOpenAgents: () => void;
	onOpenBuilder: () => void;
}

interface GrowthMetric {
	id: string;
	label: string;
	value: string;
	delta: string;
}

const METRICS: GrowthMetric[] = [
	{ id: 'automation', label: 'Automatisierungsgrad', value: '78%', delta: '+12%' },
	{ id: 'triage', label: 'Triage-Vorqualifizierung', value: '91%', delta: '+7%' },
	{ id: 'waiting', label: 'Wartezeit-Optimierung', value: '34 min', delta: '-18%' },
	{ id: 'satisfaction', label: 'Patienten-Zufriedenheit', value: '4.8 / 5', delta: '+0.4' },
];

export function PracticeGrowthSection({ onOpenAdmin, onOpenAgents, onOpenBuilder }: PracticeGrowthSectionProps) {
	return (
		<section className="rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 md:p-6 shadow-sm">
			<div className="flex items-center gap-2 mb-4">
				<BarChart3 className="w-5 h-5 text-emerald-500" />
				<h3 className="text-lg font-bold text-[var(--text-primary)]">Practice Growth Cockpit</h3>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
				{METRICS.map((metric) => (
					<div
						key={metric.id}
						className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3.5"
					>
						<p className="text-xs text-[var(--text-secondary)]">{metric.label}</p>
						<div className="mt-2 flex items-end justify-between">
							<p className="text-xl font-extrabold text-[var(--text-primary)]">{metric.value}</p>
							<p className="text-xs font-semibold text-emerald-600">{metric.delta}</p>
						</div>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<button
					onClick={onOpenAgents}
					className="rounded-2xl border border-indigo-300/50 bg-indigo-50/60 dark:bg-indigo-900/20 p-4 text-left hover:border-indigo-400 transition-colors"
				>
					<div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
						<Bot className="w-4 h-4" /> Agent Orchestrierung
					</div>
					<p className="text-xs text-[var(--text-secondary)] mt-1">Workflows, Runs, KPIs und Monitoring zentral steuern.</p>
				</button>

				<button
					onClick={onOpenBuilder}
					className="rounded-2xl border border-blue-300/50 bg-blue-50/60 dark:bg-blue-900/20 p-4 text-left hover:border-blue-400 transition-colors"
				>
					<div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-sm">
						<Workflow className="w-4 h-4" /> Flow Engineering
					</div>
					<p className="text-xs text-[var(--text-secondary)] mt-1">Digitale Patientenpfade und Praxisprozesse iterativ optimieren.</p>
				</button>

				<button
					onClick={onOpenAdmin}
					className="rounded-2xl border border-emerald-300/50 bg-emerald-50/60 dark:bg-emerald-900/20 p-4 text-left hover:border-emerald-400 transition-colors"
				>
					<div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
						<Building2 className="w-4 h-4" /> Praxis Management
					</div>
					<p className="text-xs text-[var(--text-secondary)] mt-1">Rollen, Compliance, Dokumentation und Teamsteuerung bündeln.</p>
				</button>
			</div>

			<div className="mt-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
				<ShieldCheck className="w-4 h-4 text-green-600" />
				Privacy-first aktiv: sensible Gesundheitsdaten bleiben lokal/DSGVO-konform verarbeitet.
			</div>
		</section>
	);
}
