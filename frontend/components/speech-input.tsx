"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SpeechResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function SpeechInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognition.current?.stop(), []);

  function toggle() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Speech recognition is not available in this browser. You can type instead.");
      return;
    }
    const instance = new SpeechRecognition();
    instance.lang = "en-ZA";
    instance.continuous = true;
    instance.interimResults = false;
    instance.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => {
        return index >= event.resultIndex ? event.results[index][0]?.transcript ?? "" : "";
      }).join(" ").trim();
      if (transcript) onTranscript(transcript);
    };
    instance.onerror = () => {
      setMessage("We couldn’t access the microphone. Check browser permissions or type instead.");
      setListening(false);
    };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    setMessage("Your speech is transcribed in this browser.");
    setListening(true);
    try {
      instance.start();
    } catch {
      setListening(false);
      setMessage("Speech recognition could not start. Check browser permissions or type instead.");
    }
  }

  return (
    <div>
      <button type="button" onClick={toggle} aria-pressed={listening} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce6dd] px-3 text-sm font-semibold text-forest hover:bg-mint">
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
        {listening ? "Stop listening" : "Speak your answer"}
      </button>
      <p className="mt-2 text-xs text-slate-400" aria-live="polite">{listening ? "Listening…" : message}</p>
    </div>
  );
}
