'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  language?: string;
}

export function useVoiceInput({ onTranscript, language = 'tr-TR' }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setState('listening');

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
    };

    recognition.onend = () => {
      setState('processing');
      setTimeout(() => {
        const current = recognitionRef.current?._lastTranscript;
        if (current) onTranscript(current);
        setState('idle');
        setTranscript('');
      }, 200);
    };

    recognition.onerror = (event: any) => {
      console.error('[Voice] Error:', event.error);
      setState(event.error === 'aborted' ? 'idle' : 'error');
      setTimeout(() => setState('idle'), 2000);
    };

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      const combined = finalText || interimText;
      (recognitionRef.current as any)._lastTranscript = finalText || interimText;
      setTranscript(combined);
      if (finalText) onTranscript(finalText);
    };

    recognition.start();
    setState('listening');
  }, [language, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState('idle');
    setTranscript('');
  }, []);

  const toggle = useCallback(() => {
    if (state === 'listening') stopListening();
    else startListening();
  }, [state, startListening, stopListening]);

  return { state, transcript, supported, toggle, startListening, stopListening };
}
