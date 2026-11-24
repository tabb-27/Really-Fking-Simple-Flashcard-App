import type { AccentOption } from './types';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakEnglish(text: string, accent: AccentOption = 'en-US'): void {
  if (!isSpeechSupported() || !text.trim()) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = accent;
  utterance.rate = 0.95;

  const voices = synth.getVoices();
  if (voices.length > 0) {
    const exactMatch = voices.find(
      (voice) => voice.lang.toLowerCase() === accent.toLowerCase()
    );
    const prefixMatch = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(accent.slice(0, 2).toLowerCase())
    );
    if (exactMatch) {
      utterance.voice = exactMatch;
    } else if (prefixMatch) {
      utterance.voice = prefixMatch;
    }
  }

  synth.speak(utterance);
}
