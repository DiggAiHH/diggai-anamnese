import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'; // Assuming a UI module
import { Button } from '../ui/Button';
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import axios from 'axios';

interface BillingSuggestion {
  code: string;
  description: string;
  type: 'EBM' | 'GOA';
  confidence: number;
}

export const BillingSuggestions = ({ sessionId, clinicalNotes }: { sessionId: string; clinicalNotes: string }) => {
  const [suggestions, setSuggestions] = useState<BillingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/ai/billing-optimization', { clinicalNotes }, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('anamnese_auth_token') || ''}`,
        }
      });
      setSuggestions(data.suggestions || []);
    } catch (e) {
      console.error('Failed to parse billing optimization', e);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <TrendingUp className="w-5 h-5" />
          KI-Abrechnungs-Check (EBM/GOÄ)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 && !loading ? (
          <Button onClick={generateSuggestions} className="w-full bg-green-600 hover:bg-green-700 text-white">
            Abrechnungsvorschläge generieren
          </Button>
        ) : loading ? (
          <div className="flex animate-pulse items-center gap-2 text-green-700">
            <AlertCircle className="w-4 h-4" /> Prüfe GOÄ und EBM Vorgaben auf Verschnitt...
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm border border-green-100">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">{s.type}</span>
                    {s.code}
                  </div>
                  <div className="text-sm text-gray-600">{s.description}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {(s.confidence * 100).toFixed(0)}% Match
                  </span>
                  <Button variant="outline" size="sm">Zum PVS senden</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
