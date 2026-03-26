import { useState } from 'react';
import { Play, Heart, Share2, Info, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function PwaReels() {
  const { t } = useTranslation();
  const [activeReel, setActiveReel] = useState(0);

  const reels = [
    {
      id: 1,
      title: 'Blutzucker richtig messen',
      doctor: 'Dr. med. Klaproth',
      tags: ['Diabetes', 'Prävention'],
      likes: 124,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      id: 2,
      title: '5 Tipps für einen gesunden Rücken',
      doctor: 'Dr. med. Schmidt',
      tags: ['Physiotherapie', 'Alltag'],
      likes: 89,
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      id: 3,
      title: 'Was passiert bei einer Magenspiegelung?',
      doctor: 'Dr. med. Klaproth',
      tags: ['Aufklärung', 'Gastroenterologie'],
      likes: 256,
      gradient: 'from-purple-500 to-pink-600'
    }
  ];

  return (
    <div className="h-screen bg-black text-white overflow-hidden relative flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-4 z-50 flex items-center gap-4 bg-gradient-to-b from-black/60 to-transparent">
        <Link to="/pwa" className="p-2 bg-white/20 rounded-full backdrop-blur-md">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <span className="font-bold text-lg tracking-wider">MediReels</span>
      </div>

      <div className="flex-1 relative snap-y snap-mandatory overflow-y-auto no-scrollbar pb-20">
        {reels.map((reel, index) => (
          <div key={reel.id} className="h-full w-full snap-center relative flex flex-col justify-end p-6" onClick={() => setActiveReel(index)}>
            <div className={`absolute inset-0 bg-gradient-to-br ${reel.gradient} opacity-80 z-0`}>
              <div className="w-full h-full flex items-center justify-center">
                 <Play className="w-20 h-20 text-white/30" />
              </div>
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex gap-2">
                {reel.tags.map(tag => (
                   <span key={tag} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold">{tag}</span>
                ))}
              </div>
              <h2 className="text-3xl font-black leading-tight">{reel.title}</h2>
              <p className="text-white/80 font-medium">👨‍⚕️ {reel.doctor}</p>
              
              <div className="flex items-center gap-6 mt-6 pb-4">
                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-all">
                    <Heart className="w-6 h-6 text-white group-hover:text-pink-500 transition-colors" />
                  </div>
                  <span className="text-xs font-bold">{reel.likes}</span>
                </button>
                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                    <Share2 className="w-6 h-6 text-white group-hover:text-blue-500 transition-colors" />
                  </div>
                  <span className="text-xs font-bold">Teilen</span>
                </button>
                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold">Details</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
