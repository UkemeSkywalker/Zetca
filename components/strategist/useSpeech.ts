'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** The browser's speech recognition (Chrome, Edge and Safari have it) */
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

const recognitionClass = (): (new () => Recognition) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const noSubscribe = () => () => {};

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser’s address bar, or type instead.',
  'service-not-allowed': 'Microphone access is blocked. Allow it in your browser’s address bar, or type instead.',
  'audio-capture': 'No microphone found. Plug one in, or type instead.',
  network: 'Speech needs an internet connection. Type instead, or try again.',
};

/**
 * Speak instead of typing: `onFinal` gets each finished phrase, and `interim`
 * shows the words still being heard.
 */
export function useSpeech(onFinal: (text: string) => void) {
  // Known only in the browser; false while the page is put together on the server
  const supported = useSyncExternalStore(
    noSubscribe,
    () => !!recognitionClass(),
    () => false
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const rec = useRef<Recognition | null>(null);
  const final = useRef(onFinal);
  useEffect(() => {
    final.current = onFinal;
  }, [onFinal]);

  useEffect(() => () => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Cls = recognitionClass();
    if (!Cls) return;
    setError('');
    const r = new Cls();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || 'en-US';
    r.onresult = (e) => {
      let pending = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) final.current(result[0].transcript.trim());
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    r.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') setError(ERRORS[e.error] ?? 'Couldn’t hear that. Try again, or type instead.');
    };
    r.onend = () => {
      setListening(false);
      setInterim('');
    };
    rec.current = r;
    r.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, interim, error, start, stop };
}
