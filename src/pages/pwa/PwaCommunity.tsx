import { useState } from 'react';
import { ArrowLeft, Users, Calendar, MapPin, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function PwaCommunity() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('network');

  const matches = [
    { id: 1, name: 'Heinrich, 72', diagnosis: 'Typ-2-Diabetes', match: '95%' },
    { id: 2, name: 'Martha, 68', diagnosis: 'Bluthochdruck', match: '88%' }
  ];

  const events = [
    { id: 1, title: 'Gemeinsamer Spaziergang', date: 'Morgen, 10:00 Uhr', location: 'Stadtpark', type: 'Bewegung' },
    { id: 2, title: 'Ernährungstipps bei Diabetes', date: 'Samstag, 15:00 Uhr', location: 'Online', type: 'Seminar' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 pt-6 pb-4 flex items-center gap-3">
        <Link to="/pwa" className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Community</h1>
          <p className="text-xs text-gray-500">Netzwerk & Veranstaltungen</p>
        </div>
      </header>

      <div className="p-4">
        <div className="flex bg-gray-200/50 p-1 rounded-xl mb-6">
          <button onClick={() => setActiveTab('network')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'network' ? 'bg-white shadow-sm text-sky-600' : 'text-gray-500'}`}>
            Matching
          </button>
          <button onClick={() => setActiveTab('events')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'events' ? 'bg-white shadow-sm text-sky-600' : 'text-gray-500'}`}>
            Events
          </button>
        </div>

        {activeTab === 'network' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex gap-4 items-start">
              <div className="p-3 bg-sky-100 rounded-xl text-sky-600"><Users className="w-6 h-6" /></div>
              <div>
                <h3 className="font-bold text-sky-900">Netzwerk-Matching</h3>
                <p className="text-sm text-sky-700 mt-1">Lernen Sie Patienten mit ähnlichen Diagnosen für Erfahrungsaustausch kennen.</p>
              </div>
            </div>

            {matches.map(m => (
              <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900">{m.name}</h4>
                  <p className="text-xs font-medium text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-md mt-1">{m.diagnosis}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Match</p>
                    <p className="text-sm font-black text-sky-600">{m.match}</p>
                  </div>
                  <button className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4 animate-fade-in">
            {events.map(e => (
              <div key={e.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-gray-900 leading-tight pr-4">{e.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-1 rounded-md shrink-0">{e.type}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> {e.date}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {e.location}</div>
                </div>
                <button className="w-full mt-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-sm rounded-xl transition-colors">
                  Teilnehmen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
