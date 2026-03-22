import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePwaDiaryTrends } from '../../hooks/usePatientApi';

const METRICS = [
  { key: 'mood', label: 'Stimmung' },
  { key: 'painLevel', label: 'Schmerzlevel' },
  { key: 'sleepQuality', label: 'Schlafqualität' },
  { key: 'heartRate', label: 'Herzfrequenz' },
  { key: 'weight', label: 'Gewicht' },
];

const PERIODS = [
  { key: '7d', label: '7 Tage' },
  { key: '30d', label: '30 Tage' },
  { key: '90d', label: '90 Tage' },
];

export default function PwaDiaryTrends() {
  const navigate = useNavigate();
  const [metric, setMetric] = useState('mood');
  const [period, setPeriod] = useState('30d');
  const { data, isLoading } = usePwaDiaryTrends(metric, period);

  const trend = data?.trend;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/pwa/diary')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Zurück zum Tagebuch"
          title="Zurück zum Tagebuch"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Verlaufstrends</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Metric selector */}
        <div className="flex flex-wrap gap-2">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => setMetric(m.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${metric === m.key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p.key ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Chart card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : data?.dataPoints?.length ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Durchschnitt</p>
                  <p className="text-2xl font-bold">{data.average?.toFixed(1) ?? '–'}</p>
                </div>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="w-5 h-5" />
                  <span className="text-sm font-medium capitalize">{trend ?? 'stabil'}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.dataPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Keine Daten für den gewählten Zeitraum
            </div>
          )}
        </div>

        {/* Stats */}
        {data && !isLoading && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Min', value: data.min?.toFixed(1) },
              { label: 'Avg', value: data.average?.toFixed(1) },
              { label: 'Max', value: data.max?.toFixed(1) },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl p-3 text-center shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value ?? '–'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
