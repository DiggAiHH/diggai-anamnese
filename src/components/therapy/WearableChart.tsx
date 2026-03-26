import React from 'react';
import { Card } from '../ui/Card';
import { Activity, Heart, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const mockWearableData = [
  { time: '08:00', hr: 72 },
  { time: '10:00', hr: 75 },
  { time: '12:00', hr: 80 },
  { time: '14:00', hr: 135, alert: true },
  { time: '16:00', hr: 140, alert: true },
  { time: '18:00', hr: 138, alert: true },
  { time: '20:00', hr: 85 },
];

export const WearableChart: React.FC<{ patientId?: string }> = (_props) => {
  const hasAlert = mockWearableData.some(d => d.alert);

  return (
    <Card className={`border-${hasAlert ? 'red' : 'blue'}-200`}>
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-[var(--border-primary)]">
        <div className={`flex justify-between items-center text-${hasAlert ? 'red' : 'blue'}-800`}>
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <Activity className="w-5 h-5" />
            Vitalsensorik (Apple / Google)
          </div>
          {hasAlert && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3 h-3" /> Tachykardie-Alarm
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        <div className="mb-4 flex gap-4 text-sm">
          <div className="bg-[var(--bg-primary)] p-3 rounded-lg flex-1">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1"><Heart className="w-4 h-4 text-red-500"/> Durchschnitt HR</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">89 <span className="text-sm font-normal text-[var(--text-muted)]">bpm</span></div>
          </div>
          <div className="bg-[var(--bg-primary)] p-3 rounded-lg flex-1">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">Maximalwert</div>
            <div className="text-2xl font-bold text-red-600">140 <span className="text-sm font-normal text-red-400">bpm</span></div>
          </div>
        </div>

        <div className="h-48 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockWearableData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} domain={[40, 160]} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Ruhepuls-Grenze', fill: '#EF4444', fontSize: 10 }} />
              <Line 
                type="monotone" 
                dataKey="hr" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={(props: any) => {
                  if (props.payload.alert) {
                    return <circle cx={props.cx} cy={props.cy} r={5} fill="#EF4444" stroke="white" strokeWidth={2} />;
                  }
                  return <circle cx={props.cx} cy={props.cy} r={0} />;
                }}
                activeDot={{ r: 6, fill: '#2563EB', stroke: 'white', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};
