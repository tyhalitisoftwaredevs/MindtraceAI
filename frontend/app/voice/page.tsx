"use client";

import { FormEvent, useEffect, useState } from "react";
import { Headphones, Mic2, Pause, Play, ShieldCheck, Volume2 } from "lucide-react";
import { SpeechInput } from "@/components/speech-input";
import { Button, Card, PageHeading, SectionTitle, StatusPill } from "@/components/ui";
import { API_URL, apiPost, objectFrom } from "@/lib/api";

const sampleText = "Every small question is a beginning. Take your time, find your rhythm, and follow what makes you curious.";

export default function VoicePage() {
  const [text, setText] = useState(sampleText);
  const [consent, setConsent] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [voiceName, setVoiceName] = useState("");

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const updateVoice = () => {
      const voice = window.speechSynthesis.getVoices().find((item) => item.default) ?? window.speechSynthesis.getVoices()[0];
      setVoiceName(voice?.name ?? "");
    };
    updateVoice();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoice);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoice);
      window.speechSynthesis.cancel();
    };
  }, []);

  function speakStandard() {
    setError("");
    setMessage("");
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setError("Voice playback is not supported in this browser. You can still read or edit the text above.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setMessage(`Playing with a standard browser voice${voiceName ? ` (${voiceName})` : ""}.`);
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    setMessage("Playback stopped.");
  }

  async function updateConsent(nextConsent: boolean) {
    setConsentBusy(true);
    setError("");
    setMessage("");
    try {
      await apiPost("/api/voice/consent", { consent: nextConsent }, "learner");
      setConsent(nextConsent);
      setMessage(nextConsent ? "Personalised voice consent recorded. You can revoke it at any time." : "Personalised voice consent revoked.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your consent setting could not be updated.");
    } finally {
      setConsentBusy(false);
    }
  }

  async function personalized(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent || !text.trim()) return;
    setError("");
    setMessage("Preparing your consented voice sample…");
    try {
      const response = objectFrom(await apiPost<unknown>("/api/voice/synthesize", {
        text: text.trim(),
        personalized: true,
      }, "learner"));
      const audioUrl = response.audio_url ?? response.url;
      const audioBase64 = response.audio_base64 ?? response.audio;
      if (typeof audioUrl === "string") {
        const url = audioUrl.startsWith("http") ? audioUrl : `${API_URL}${audioUrl.startsWith("/") ? "" : "/"}${audioUrl}`;
        const audio = new Audio(url);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => {
          setSpeaking(false);
          setError("The personalized audio could not be played. Use the standard AI voice below.");
        };
        setSpeaking(true);
        await audio.play();
        setMessage("Playing your consented personalized voice sample.");
      } else if (typeof audioBase64 === "string" && audioBase64.length > 0) {
        const mime = typeof response.mime_type === "string" ? response.mime_type : "audio/mpeg";
        const audio = new Audio(audioBase64.startsWith("data:") ? audioBase64 : `data:${mime};base64,${audioBase64}`);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        setSpeaking(true);
        await audio.play();
        setMessage("Playing your consented personalized voice sample.");
      } else {
        setMessage("The personalized request was received. Your text and standard AI voice alternative are ready below.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Personalized synthesis is unavailable. Use the standard AI voice below.");
    }
  }

  return (
    <div>
      <PageHeading eyebrow="Voice & choice" title="Learning, in your own words." description="Listen, speak, or read. Your text stays available, and a standard AI voice is always an option." action={<StatusPill><span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Your choice, always</span></StatusPill>} />
      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <Card className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3"><SectionTitle title="Your listening space" detail="Edit the text, then choose how you want to experience it." /><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff5dd] text-[#927328]"><Headphones size={19} /></span></div>
          <label htmlFor="voice-text" className="mb-2 block text-sm font-semibold text-ink">Text to listen to</label>
          <textarea id="voice-text" value={text} onChange={(event) => setText(event.target.value)} rows={5} className="focus-ring w-full rounded-xl border border-[#dfe6df] bg-[#fbfcfa] p-4 text-sm leading-6 text-ink" />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={speaking ? stopSpeech : speakStandard} disabled={!text.trim()}>{speaking ? <Pause size={16} /> : <Play size={16} />}{speaking ? "Stop voice" : "Play standard AI voice"}</Button>
          </div>
          <div className="mt-5 rounded-xl bg-[#f7f9f6] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Volume2 size={16} className="text-forest" /> Standard AI voice</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Uses your browser’s built-in speech synthesis. No voice sample is sent to the backend.</p>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Mic2 size={16} className="text-forest" /> Want to speak instead?</p>
            <SpeechInput onTranscript={(spoken) => setText((current) => `${current === sampleText ? "" : current}${current && current !== sampleText ? " " : ""}${spoken}`)} />
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-forest">Personalised voice synthesis</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink">Only with your clear, active consent.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Personalised synthesis is optional. It stays off unless you turn it on, and you choose when to send text for synthesis. It is never used for authentication.</p>
          <form onSubmit={personalized}>
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold leading-6 text-ink">
              <input type="checkbox" checked={consent} disabled={consentBusy} onChange={(event) => void updateConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#225c4b] disabled:opacity-50" />
              <span>I consent to personalised voice synthesis</span>
            </label>
            <Button type="submit" className="mt-4 w-full" disabled={!consent || !text.trim() || speaking}>
              <Headphones size={16} /> Create consented voice sample
            </Button>
          </form>
          <div aria-live="polite">
            {message && <p role="status" className="mt-4 rounded-lg bg-[#f0f8f1] p-3 text-sm text-forest">{message}</p>}
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          </div>
          <div className="mt-7 border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-ink">A few things to know</p>
            <ul className="mt-3 space-y-3 text-sm leading-5 text-slate-500">
              <li className="flex gap-2"><span className="text-forest">✓</span> You can turn consent off at any time.</li>
              <li className="flex gap-2"><span className="text-forest">✓</span> Standard voice and readable text are always available.</li>
              <li className="flex gap-2"><span className="text-forest">✓</span> Never use a voice for identity or access verification.</li>
            </ul>
          </div>
        </Card>
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-400">Speech recognition and standard synthesis use browser Web Speech APIs. Personalised synthesis calls POST /api/voice/synthesize only after your explicit opt-in and action.</p>
    </div>
  );
}
