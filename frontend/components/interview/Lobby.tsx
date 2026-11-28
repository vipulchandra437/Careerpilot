"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Mic, VideoOff } from "lucide-react";
import {
  difficultyInstruction,
  type Difficulty,
  type InterviewType,
} from "@/lib/interview/questions";
import { Interviewer } from "./Interviewer";

interface Props {
  onStart: (type: InterviewType, difficulty: Difficulty, stream: MediaStream | null) => void;
  starting?: boolean;
}

const types: { id: InterviewType; title: string; desc: string }[] = [
  { id: "hr", title: "HR", desc: "Motivation, teamwork and real situations with Maya." },
  { id: "technical", title: "Technical", desc: "DSA, systems and trade-offs with Dev." },
  { id: "mixed", title: "Mixed", desc: "HR and technical alternating with Sam." },
];

const difficulties: Difficulty[] = ["easy", "standard", "tough"];

export function Lobby({ onStart, starting = false }: Props) {
  const [type, setType] = useState<InterviewType>("hr");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [consent, setConsent] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  const enableMedia = async () => {
    setMediaError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(media);
    } catch {
      setMediaError("Camera or microphone access was denied. You can still answer by typing.");
    }
  };

  const stopMedia = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Choose your round</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {types.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={type === item.id}
              onClick={() => setType(item.id)}
              className={`focus-ring rounded-xl border p-4 text-left transition-colors ${
                type === item.id
                  ? "border-brand-300 bg-brand-50"
                  : "border-line bg-soft/60 hover:bg-soft"
              }`}
            >
              <Interviewer type={item.id} state="idle" className="mb-2 h-14 w-14" />
              <span className="block font-semibold text-ink">{item.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Difficulty</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {difficulties.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={difficulty === level}
              onClick={() => setDifficulty(level)}
              className={`focus-ring rounded-xl border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                difficulty === level
                  ? "border-brand-300 bg-brand-50 text-brand-100"
                  : "border-line bg-soft text-muted hover:bg-soft"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">{difficultyInstruction[difficulty]}</p>
      </div>

      <div className="card grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">Camera &amp; microphone</h2>
          <p className="mt-1 text-sm text-muted">
            Live preview only. Nothing is recorded or uploaded.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!consent}
              onClick={() => void enableMedia()}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" /> {stream ? "Restart devices" : "Turn on devices"}
            </button>
            {stream ? (
              <button
                type="button"
                onClick={stopMedia}
                className="focus-ring inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-muted"
              >
                <VideoOff className="h-4 w-4" /> Turn off
              </button>
            ) : null}
          </div>
          {!consent ? (
            <p className="mt-2 text-xs text-amber-700">Accept the notice first.</p>
          ) : null}
          {mediaError ? <p className="mt-2 text-sm text-amber-700">{mediaError}</p> : null}
        </div>
        <div className="aspect-video overflow-hidden rounded-xl border border-line bg-black/40">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {!stream ? (
            <p className="-translate-y-1/2 text-center text-sm text-muted">
              <Mic className="mx-auto mb-2 h-6 w-6" /> Preview appears here
            </p>
          ) : null}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-soft/60 p-4 text-sm text-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="focus-ring mt-0.5 h-4 w-4 accent-brand-500"
        />
        <span>
          Camera and microphone are analysed live in the browser. Video is not recorded or
          uploaded, and only answer text goes to the LLM.
        </span>
      </label>

      <button
        type="button"
        disabled={!consent || starting}
        onClick={() => onStart(type, difficulty, stream)}
        className="focus-ring w-full rounded-xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-glow-indigo disabled:cursor-not-allowed disabled:opacity-50"
      >
        {starting ? "Starting interview…" : "Start voice interview"}
      </button>
    </div>
  );
}
