import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// import { api } from '@/services/api'; // Assuming api service is set up for this

const VoiceDev: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        // const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        // Here you would send the audio blob to your backend
        // For now, we'll simulate a response
        setFeedback('Processing voice command...');
        try {
          // const response = await api.voice.process(audioBlob);
          // setFeedback(response.data.message);
          // setTranscript(response.data.transcript);
          setTimeout(() => {
            setFeedback('Voice command processed (simulated).');
            setTranscript('Simulated transcript: "Create a blue button."');
          }, 2000);
        } catch (error) {
          setFeedback('Error processing command.');
        }
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setFeedback('Recording...');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setFeedback('Could not access microphone. Please grant permission.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--text-primary)] p-4">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{ background: 'radial-gradient(circle at 50% 40%, #8b5cf6, transparent 60%)' }}
      />
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-6">
          <Mic className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-violet-300 font-medium">Voice Dev — Experimental</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-2">Voice-Driven Development</h1>
        <p className="text-[var(--text-secondary)]">Speak commands to control your learning session.</p>
      </motion.div>

      <motion.div layout className="relative w-40 h-40 flex items-center justify-center mb-8">
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.4, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
              className="absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 70%)', animation: 'pulse 1.5s ease-in-out infinite' }}
            />
          )}
        </AnimatePresence>
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`relative z-10 w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
            isRecording
              ? 'bg-gradient-to-br from-violet-600 to-cyan-500 shadow-[0_0_32px_rgba(139,92,246,0.50)]'
              : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          {isRecording ? <Square className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-[var(--text-secondary)]" />}
        </button>
      </motion.div>

      <div className="text-center space-y-4 max-w-md w-full relative z-10">
        <p className="text-sm text-[var(--text-secondary)] h-6">{feedback}</p>
        {transcript && (
          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Transcript</p>
            <p className="text-sm text-[var(--text-primary)]">{transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceDev;
