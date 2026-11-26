"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Mic, MicOff, PhoneOff, Send, Volume2 } from "lucide-react";
import { Lobby } from "./Lobby";
import { Interviewer, type InterviewerState } from "./Interviewer";
import { useLiveMonitoring } from "./useLiveMonitoring";
import { analyzeAnswer, type AnswerKind } from "@/lib/interview/analyze";
import type { Difficulty, InterviewType } from "@/lib/interview/questions";
import type { SavedAnswer } from "@/lib/interview/report";

interface Props {
  onExit: () => void;
}

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface RecognitionEvent {
  resultIndex: number;
  results: RecognitionResult[];
}

interface BrowserRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionConstructor = new () => BrowserRecognition;

const characterName: Record<InterviewType, string> = { hr: "Maya", technical: "Dev", mixed: "Sam" };

const answerKind = (type: InterviewType, index: number): AnswerKind => {
  if (type === "hr") return "hr";
  if (type === "technical") return "technical";
  return index % 2 === 0 ? "hr" : "technical";
};

export function VoiceInterview({ onExit }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"lobby" | "call">("lobby");
  const [type, setType] = useState<InterviewType>("hr");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [question, setQuestion] = useState("");
  const [turnSeq, setTurnSeq] = useState(0);
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  const [interviewerState, setInterviewerState] = useState<InterviewerState>("idle");
  const [input, setInput] = useState("");
  const [caption, setCaption] = useState("");
  const [listening, setListening] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const submitRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const questionStartRef = useRef(Date.now());
  const answersRef = useRef<SavedAnswer[]>([]);
  const cues = useLiveMonitoring(stream, videoRef, stage === "call");

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const stopDevices = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  useEffect(() => stopDevices, [stopDevices]);

  const finish = useCallback(
    async (finalAnswers: SavedAnswer[]) => {
      if (!sessionId || ending) return;
      setEnding(true);
      setInterviewerState("thinking");
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (!finalAnswers.length) {
        setError("Answer at least one question before ending the call.");
        setEnding(false);
        setInterviewerState("listening");
        return;
      }
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/interview/turn", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "finish", sessionId, answers: finalAnswers }),
        });
        if (res.status === 401) {
          router.push("/login?reason=expired");
          return;
        }
        if (!res.ok) throw new Error("Could not end the call");
        stopDevices();
        router.push(`/interview/${sessionId}`);
      } catch {
        setError("Could not end the call. Try again.");
        setEnding(false);
        setInterviewerState("listening");
      }
    },
    [ending, router, sessionId, stopDevices]
  );

  const submitAnswer = useCallback(
    async (text: string) => {
      const answer = text.trim();
      if (!answer || !sessionId || ending) return;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      setInput("");
      setCaption("");
      setInterviewerState("thinking");

      const durationSeconds = Math.max(1, (Date.now() - questionStartRef.current) / 1000);
      const metrics = analyzeAnswer({
        text: answer,
        kind: answerKind(type, answersRef.current.length),
        durationSeconds,
        eyeContactPercent: cues.eyeContactPercent,
        longPauses: cues.longPauses,
      });
      const saved: SavedAnswer = {
        index: answersRef.current.length,
        question,
        text: answer,
        metrics,
        score: metrics.score,
      };
      const nextAnswers = [...answersRef.current, saved];
      answersRef.current = nextAnswers;
      setAnswers(nextAnswers);

      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/interview/turn", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "turn",
            sessionId,
            turnIndex: saved.index,
            question,
            answer,
            type,
            difficulty,
          }),
        });
        if (res.status === 401) {
          router.push("/login?reason=expired");
          return;
        }
        if (!res.ok) throw new Error("Could not continue the interview");
        const data = (await res.json()) as { question?: string; text?: string; done?: boolean };
        if (data.done || !data.question && !data.text) {
          await finish(nextAnswers);
          return;
        }
        setQuestion(data.question ?? data.text ?? "");
        setTurnSeq((seq) => seq + 1);
        setInterviewerState("idle");
      } catch {
        setError("Could not continue the interview. Try again.");
        setInterviewerState("listening");
      }
    },
    [cues.eyeContactPercent, cues.longPauses, difficulty, ending, finish, question, router, sessionId, type]
  );

  useEffect(() => {
    submitRef.current = submitAnswer;
  }, [submitAnswer]);

  const startSession = async (selectedType: InterviewType, selectedDifficulty: Difficulty, media: MediaStream | null) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/interview/turn", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", type: selectedType, difficulty: selectedDifficulty }),
      });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }
      if (!res.ok) throw new Error("Could not start the interview");
      const data = (await res.json()) as { sessionId: string; question: string };
      setType(selectedType);
      setDifficulty(selectedDifficulty);
      setStream(media);
      setSessionId(data.sessionId);
      setQuestion(data.question);
      setStage("call");
    } catch {
      setError("Could not start the interview. Check your connection and try again.");
    }
  };

  // Speak each new question; the mouth moves only while audio is playing.
  useEffect(() => {
    if (stage !== "call" || !question) return;
    questionStartRef.current = Date.now();
    setCaption("");
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setInterviewerState("listening");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.rate = 0.98;
    utterance.onstart = () => setInterviewerState("talking");
    utterance.onend = () => setInterviewerState("listening");
    utterance.onerror = () => setInterviewerState("listening");
    window.speechSynthesis.speak(utterance);
    return () => {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      window.speechSynthesis.cancel();
    };
  }, [stage, question, turnSeq]);

  // Voice answers: speech fills the caption, then any final result submits.
  const startListening = () => {
    const globalWindow = window as unknown as {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    const Recognition = globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition;
    if (!Recognition) return;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    let finalText = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += `${result[0].transcript} `;
        else interim += result[0].transcript;
      }
      setCaption((finalText + interim).trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      if (finalText.trim()) void submitRef.current(finalText.trim());
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  };

  const chips: string[] = [];
  if (!cues.faceVisible) chips.push("Look at the camera");
  if (cues.eyeContactPercent < 50) chips.push("More eye contact");
  if (cues.longPauses > 2) chips.push("Try shorter pauses");
  if (!chips.length) chips.push("Good presence — keep going");

  if (stage === "lobby") {
    return (
      <main className="relative flex min-h-screen flex-col bg-surface text-white">
        <div className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-8">
          <button type="button" onClick={onExit} className="focus-ring mb-5 flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to interview options
          </button>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Voice interview</h1>
          <p className="mt-1 text-sm text-slate-400">A live, call-style round with spoken questions and browser-only coaching.</p>
          {error ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</p> : null}
          <div className="mt-6">
            <Lobby onStart={(t, d, media) => void startSession(t, d, media)} starting={false} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-surface text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Interviewer type={type} state={interviewerState} className="h-16 w-16" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">{characterName[type]}</h1>
              <p className="text-sm capitalize text-slate-400">{type} · {difficulty} · live call</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void finish(answersRef.current)}
            disabled={ending}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/70 disabled:opacity-50"
          >
            <PhoneOff className="h-4 w-4" /> {ending ? "Ending..." : "End call"}
          </button>
        </div>

        {error ? <p className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</p> : null}

        <div className="grid flex-1 gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="card flex flex-col p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-300">
              <Volume2 className="h-4 w-4" /> Question {answers.length + 1}
            </div>
            <p className="mt-3 text-lg leading-relaxed text-slate-100" aria-live="polite">{question}</p>

            <div className="mt-5 flex flex-wrap gap-2" aria-label="Live coaching cues">
              {chips.map((chip) => (
                <span key={chip} className="rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-xs text-brand-200">{chip}</span>
              ))}
            </div>

            <div className="relative mt-5 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-xs text-slate-200">
                {interviewerState === "listening" ? "Listening" : interviewerState === "talking" ? "Interviewer speaking" : "Thinking…"}
              </span>
            </div>

            <div className="mt-5" aria-live="polite">
              <label htmlFor="voice-answer" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your answer (voice or type)</label>
              <div className="mt-2 flex items-end gap-2">
                <button
                  type="button"
                  onClick={startListening}
                  disabled={ending}
                  aria-pressed={listening}
                  className={`focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    listening ? "border-red-500/40 bg-red-500/20 text-red-200" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                  aria-label={listening ? "Stop listening" : "Speak answer"}
                >
                  {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <textarea
                  id="voice-answer"
                  value={caption || input}
                  onChange={(e) => {
                    setCaption("");
                    setInput(e.target.value);
                  }}
                  disabled={ending}
                  rows={2}
                  className="min-h-[2.75rem] flex-1 resize-y rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="Speak, or type your answer here…"
                />
                <button
                  type="button"
                  onClick={() => void submitAnswer(caption || input)}
                  disabled={ending || !(caption || input).trim()}
                  className="btn-primary focus-ring flex h-11 shrink-0 items-center gap-2 px-4 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Send
                </button>
              </div>
            </div>
          </div>

          <aside className="card flex max-h-[70vh] flex-col p-4">
            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className="focus-ring flex w-full items-center justify-between text-sm font-semibold text-white"
              aria-expanded={showTranscript}
            >
              Transcript ({answers.length}) <span className="text-slate-400">{showTranscript ? "Hide" : "Show"}</span>
            </button>
            {showTranscript ? (
              <div className="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto" role="log" aria-label="Interview transcript">
                {answers.length === 0 ? <p className="text-sm text-slate-500">No answers yet.</p> : null}
                {answers.map((a) => (
                  <div key={a.index} className="border-b border-white/5 pb-3 last:border-0">
                    <p className="text-xs font-semibold text-brand-300">Question {a.index + 1}</p>
                    <p className="mt-1 text-xs text-slate-500">{a.question}</p>
                    <p className="mt-2 text-sm text-slate-200">{a.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
