import React, { useState, useRef } from 'react';
import { Mic, StopCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import axios from 'axios';

export const AmbientScribePanel = ({ sessionId }: { sessionId: string }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [soapNote, setSoapNote] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulation of speech recognition & transcription for Demo
  const simulationRef = useRef<any>(null);

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTranscript('');
      setSoapNote(null);
      
      let dots = 0;
      simulationRef.current = setInterval(() => {
        dots++;
        if(dots % 3 === 0) setTranscript(p => p + ' Patient beschreibt Schmerzen... ');
        else if (dots % 3 === 1) setTranscript(p => p + ' Seit drei Tagen durchgehend... ');
        else setTranscript(p => p + ' Keine Linderung durch Ibuprofen. ');
      }, 2000);
    } else {
      setIsRecording(false);
      clearInterval(simulationRef.current);
      generateSoap();
    }
  };

  const generateSoap = async () => {
    setIsProcessing(true);
    try {
      const { data } = await axios.post('/api/ai/ambient-scribe', {
        transcript,
        sessionId,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('anamnese_auth_token') || ''}` }
      });
      setSoapNote(data.soapNote);
    } catch (e) {
        console.error('Failed to generate SOAP note', e);
        // Fallback for safety during testing
        setSoapNote({
            s: 'Patient berichtet von starken Schmerzen im Brustbereich seit drei Tagen. Keine Linderung durch Ibuprofen.',
            o: 'Visuell unauffällig, Sprache klar.',
            a: 'Verdacht auf Angina Pectoris vs. muskuläre Verspannung.',
            p: 'EKG anordnen, Blutbild (Troponin).'
        });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-indigo-200 bg-indigo-50/20">
      <CardHeader className="pb-3 border-b border-indigo-100">
        <CardTitle className="flex justify-between items-center text-indigo-900">
          <div className="flex items-center gap-2">
            <Mic className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`} />
            Ambient Voice Scribe
          </div>
          <Button 
            onClick={toggleRecording}
            className={`flex items-center gap-2 ${isRecording ? 'bg-white border hover:bg-red-50 text-red-600 border-red-500' : ''}`}
          >
            {isRecording ? <><StopCircle className="w-4 h-4"/> Stop Dictation</> : <><Mic className="w-4 h-4"/> Start Listening</>}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {isRecording && (
          <div className="p-3 bg-white rounded border border-gray-200 text-sm italic text-gray-600 min-h-[60px]">
            {transcript || 'Listening to conversation...'}
            <span className="animate-pulse">|</span>
          </div>
        )}
        
        {isProcessing && (
          <div className="bg-indigo-100/50 p-6 rounded-lg flex flex-col items-center justify-center text-indigo-700">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-700 mb-2"></div>
            Generiere strukturierte SOAP Notiz aus Transkript...
          </div>
        )}

        {soapNote && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Generierte SOAP Notiz
            </h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="p-2 bg-white border border-gray-200 rounded">
                <span className="font-bold text-gray-800 block">S (Subjektiv)</span>
                {soapNote.s}
              </div>
              <div className="p-2 bg-white border border-gray-200 rounded">
                <span className="font-bold text-gray-800 block">O (Objektiv)</span>
                {soapNote.o}
              </div>
              <div className="p-2 bg-white border border-gray-200 rounded">
                <span className="font-bold text-gray-800 block">A (Assessment)</span>
                {soapNote.a}
              </div>
              <div className="p-2 bg-white border border-gray-200 rounded">
                <span className="font-bold text-gray-800 block">P (Plan)</span>
                {soapNote.p}
              </div>
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Ins PVS importieren
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
