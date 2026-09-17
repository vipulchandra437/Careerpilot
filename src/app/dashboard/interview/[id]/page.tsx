"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthBanner } from "@/components/auth/auth-banner";
import { AnswerComposer } from "@/components/interview/answer-composer";
import { VoiceToggle } from "@/components/interview/voice-toggle";
import {
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
  getVoicePreference,
  setVoicePreference,
  getSpeakAnswersPreference,
  setSpeakAnswersPreference,
  speak,
  stopSpeaking,
  createRecognition,
} from "@/lib/speech";

type Turn = {
  question: string;
  focus: string;
  answer: string | null;
  evaluation: { score: number; feedback: string; followUp: string } | null;
  followUp: string | null;
  followUpAnswer: string | null;
  followUpEvaluation: { score: number; feedback: string } | null;
  // WHY this flag is optional on the client: older transcripts created before
  // the API fix won't have it. The client defaults missing → true (evaluated)
  // so resume-after-refresh treats all legacy turns as complete.
  evaluated?: boolean;
};

type SessionState = {
  id: string;
  mode: string;
  status: string;
  questionCount: number;
  transcript: Turn[];
  finalScore: number | null;
  summary: string | null;
};

type Stage = "loading" | "ready" | "evaluating" | "followUp" | "finished";

const STAGED_COPY = ["Thinking of a good question...", "Evaluating your answer...", "Almost there..."];

export default function InterviewPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [stage, setStage] = useState<Stage>("loading");
  const [stageIndex, setStageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const stageIntervalRef = useRef<ReturnType<typeof setInterval>>();
  // WHY a mounted gate for async responses: LLM + network calls can resolve
  // after the user navigates away; setting state then is a wasted render (and a
  // React warning). The flag flips false on unmount and every post-await state
  // set is guarded by it.
  const isMountedRef = useRef(true);
  // WHY voice state lives here, not in speech.ts: it's page UI state — the
  // module only owns the capability + persistence. This page renders toggles,
  // the waveform, and the mic, so the runtime state belongs to it.
  const [voiceEnabled, setVoiceEnabled] = useState(getVoicePreference());
  const [speakAnswersOn, setSpeakAnswersOn] = useState(getSpeakAnswersPreference());
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  // WHY a ref, not state, for accumulated speech: onFinal chunks arrive in a
  // burst; reading via ref avoids a stale-closure race when building the next
  // interim preview.
  const finalTranscriptRef = useRef("");
  // WHY ref for the just-spoken prompt: guards against re-speaking the same
  // prompt when unrelated state churn re-renders (e.g. progress dots).
  const spokenPromptRef = useRef<string | null>(null);
  // WHY mounted gate: feature detection (speechSynthesis/SpeechRecognition) is a
  // client-side truth — SSR evaluates it false, the browser true. Rendering the
  // toggles only after mount prevents a hydration mismatch while keeping the
  // "progressive enhancement" behavior once the page is interactive.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // WHY explicit teardown here (not just the stage-effect cleanup): it
    // guarantees (a) the interval can never tick after unmount even if a
    // future refactor reorders effects, and (b) async handlers know the page
    // is gone via isMountedRef and skip their setState calls.
    return () => {
      isMountedRef.current = false;
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    };
  }, []);

  // Load session
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/interview/${params.id}`);
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          // WHY mounted guard: the session fetch can resolve after navigation.
          if (!isMountedRef.current) return;
          setError(data.error ?? "Session not found.");
          setLoading(false);
          return;
        }
        const data = (await res.json()) as SessionState;
        if (!isMountedRef.current) return;
        setSession(data);
        setLoading(false);

        // Determine initial stage based on transcript state
        if (data.status === "completed" || data.status === "abandoned") {
          setStage("finished");
        } else {
          const transcript = data.transcript;
          const lastTurn = transcript[transcript.length - 1];
          if (lastTurn && !lastTurn.answer) {
            setStage("ready");
          } else if (lastTurn && lastTurn.followUp && !lastTurn.followUpAnswer) {
            setStage("followUp");
          } else {
            setStage("ready");
          }
        }
      } catch {
        if (!isMountedRef.current) return;
        setError("Could not reach the server. Please try again.");
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session, stage]);

  // Staged loading copy animation
  useEffect(() => {
    if (stage === "evaluating" || stage === "followUp" || stage === "loading") {
      stageIntervalRef.current = setInterval(() => {
        setStageIndex((prev) => (prev + 1) % STAGED_COPY.length);
      }, 2000);
    }
    return () => {
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    };
  }, [stage]);

  // WHY session-transcript-based current turn (not the render-derived const):
  // effects must not depend on values computed after early returns; deriving
  // from session here keeps the dependency array honest and the effect stable.
  // The current turn is the first un-answered entry, else the first entry with
  // a pending follow-up — the same rule the render uses to pick the question.
  useEffect(() => {
    // WHY early returns: speech is a progressive enhancement — without support or
    // an explicit opt-in, the page behaves exactly like text mode (no audio).
    if (!voiceEnabled || !isSpeechSynthesisSupported) return;
    if (listening) return; // don't talk over a student who is recording
    if (stage !== "ready" && stage !== "followUp") return;
    if (!session) return;

    const transcript = session.transcript;
        const currentTurn =
      transcript.find((t) => !t.answer || (t.answer && t.evaluated === false)) ||
      transcript.find((t) => t.followUp && !t.followUpAnswer);
    if (!currentTurn) return;

    const prompt =
      stage === "followUp" && currentTurn.followUp
        ? currentTurn.followUp
        : currentTurn.question;
    // WHY dedupe via ref: the same prompt string must be spoken exactly once
    // per appearance, even as unrelated state (progress dots, stage churn)
    // re-runs this effect.
    if (!prompt || prompt === spokenPromptRef.current) return;

    spokenPromptRef.current = prompt;
    setIsSpeaking(true);
    speak(prompt, () => setIsSpeaking(false));

    // WHY cleanup: when deps change (submit → "evaluating", new question, toggle
    // off), the previous utterance must be cancelled so the interviewer never
    // keeps talking over the next phase. New-speak also cancels before speaking,
    // so this is safe for consecutive prompts too.
    return () => {
      stopSpeaking();
      setIsSpeaking(false);
    };
  }, [voiceEnabled, listening, stage, session]);

  // WHY cleanup on unmount: cancel orphaned audio and abort a live mic on
  // navigation, so leaving mid-session never leaves audio playing or a dangling
  // recognizer (spec: "no orphaned audio").
  useEffect(() => {
    return () => {
      stopSpeaking();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  // WHY handlers (not raw setState) persist the toggle to localStorage: the
  // preference must survive reloads, and turning voice OFF must actively cancel
  // playback (no orphaned audio).
  const handleToggleVoice = (on: boolean) => {
    setVoiceEnabled(on);
    setVoicePreference(on);
    spokenPromptRef.current = null;
    if (!on) {
      stopSpeaking();
      setIsSpeaking(false);
    }
  };

  const handleToggleSpeak = (on: boolean) => {
    setSpeakAnswersOn(on);
    setSpeakAnswersPreference(on);
    if (!on && listening) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      setListening(false);
    }
  };

  const handleToggleMic = () => {
    if (listening) {
      // WHY stop() (not abort): gracefully flushes recognized text into the box
      // so the student can edit it before submitting.
      recognitionRef.current?.stop();
      return;
    }

    setMicError(null);
    // WHY cancel interviewer voice on mic start: the student is about to speak;
    // playback would overlap their recording.
    stopSpeaking();
    setIsSpeaking(false);

    const rec = createRecognition({
      onInterim: (text) => {
        const base = finalTranscriptRef.current;
        setAnswer(base ? `${base} ${text}`.trim() : text);
      },
      onFinal: (text) => {
        finalTranscriptRef.current = text;
        setAnswer(text);
      },
      onError: (err) => {
        // WHY error-code → friendly copy: RULES.md says users never see raw
        // internals. 'not-allowed' is the browser's "mic permission denied".
        setMicError(
          err === "not-allowed"
            ? "Microphone access was denied. You can still type your answer."
            : err === "no-speech"
              ? "No speech was heard — try the mic again, or type instead."
              : "The microphone ran into a problem — please try again or type your answer."
        );
      },
      onEnd: () => {
        setListening(false);
      },
    });

    if (!rec) {
      setMicError("Speech recognition isn't available in this browser — please type instead.");
      return;
    }
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  // WHY interrupt exists separately from the toggle: clicking the waveform dots
  // should stop playback WITHOUT changing the persistent preference.
  const interruptSpeech = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || submitting) return;

    // WHY stop a live mic on submit: the answer is final; a still-listening
    // recognizer would append its tail into the NEXT question's input box.
    if (listening) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      setListening(false);
    }

    setSubmitting(true);
    setError(null);
    setStage("evaluating");
    setStageIndex(0);

    try {
      const res = await fetch(`/api/interview/${params.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        // WHY mounted guard: the error response may arrive after the user has
        // left the page — setting state then warns and does nothing useful.
        if (!isMountedRef.current) return;
        setError(data.error ?? "Something went wrong. Please try again.");
        setStage("ready");
        setSubmitting(false);
        return;
      }

      const result = await res.json();
      if (!isMountedRef.current) return;
      setSession((prev) => {
        if (!prev) return prev;
        const transcript = [...prev.transcript];
        // Find and update the turn that was just answered
        for (let i = transcript.length - 1; i >= 0; i--) {
          const turn = transcript[i];
          if (!turn.answer) {
            transcript[i] = { ...turn, answer: answer.trim(), evaluation: { score: result.evaluation.score, feedback: result.evaluation.feedback, followUp: result.followUp || "" }, followUp: result.followUp || null };
            break;
          }
          if (turn.followUp && !turn.followUpAnswer) {
            transcript[i] = { ...turn, followUpAnswer: answer.trim(), followUpEvaluation: { score: result.evaluation.score, feedback: result.evaluation.feedback } };
            break;
          }
        }
        return { ...prev, transcript };
      });
      setAnswer("");
      // WHY reset the speech buffer: the recognized text was just consumed by the
      // evaluation pipeline; the next answer must start from an empty slate.
      finalTranscriptRef.current = "";

      if (result.followUp) {
        setStage("followUp");
      } else if (result.nextQuestion) {
        // Add next question to transcript
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            transcript: [...prev.transcript, {
              question: result.nextQuestion.text,
              focus: result.nextQuestion.focus,
              answer: null,
              evaluation: null,
              followUp: null,
              followUpAnswer: null,
              followUpEvaluation: null,
            }],
          };
        });
        setStage("ready");
      } else {
        setStage("ready");
      }
    } catch {
      // WHY mounted guard: a network failure may surface after the page was
      // unmounted — flipping back to "ready" on a dead page is meaningless.
      if (!isMountedRef.current) return;
      setError("Could not reach the server. Please try again.");
      setStage("ready");
    } finally {
      if (isMountedRef.current) setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setStage("loading");
    try {
      const res = await fetch(`/api/interview/${params.id}/finish`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!isMountedRef.current) return;
        setError(data.error ?? "Couldn't finish session. Please try again.");
        setStage("ready");
        return;
      }
      const data = (await res.json()) as { finalScore: number | null; summary: string | null };
      if (!isMountedRef.current) return;
      setSession((prev) => prev ? { ...prev, status: "completed", finalScore: data.finalScore, summary: data.summary } : prev);
      setStage("finished");
    } catch {
      if (!isMountedRef.current) return;
      setError("Could not reach the server. Please try again.");
      setStage("ready");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="mx-auto max-w-4xl px-6 py-4">
            <Link href="/dashboard" className="font-serif text-xl font-semibold tracking-tight text-foreground">CareerPilot</Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-12">
          <AuthBanner message={error} />
          <Link href="/dashboard/interview" className="mt-4 inline-block text-sm text-primary hover:underline">&larr; Back to interviews</Link>
        </main>
      </div>
    );
  }

  if (!session) return null;

  const transcript = session.transcript;
    const currentTurn = transcript.find((t) => !t.answer || (t.answer && t.evaluated === false)) || transcript.find((t) => t.followUp && !t.followUpAnswer);

  // WHY input is locked while the interviewer voice reads: typing an answer over
  // the question being spoken overlaps two streams (spec: "input disabled to
  // prevent overlap"). The student clicks the waveform dots to interrupt.
  const speechBlocked = voiceEnabled && isSpeaking && !listening && (stage === "ready" || stage === "followUp");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/interview" className="font-serif text-lg font-semibold tracking-tight text-foreground hover:underline">CareerPilot</Link>
            <span className="text-sm text-muted-foreground capitalize">{session.mode} interview</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
            {/* Voice toggles — rendered only after mount (SSR/client parity) AND
                only when the browser API exists (progressive enhancement). */}
            {mounted && isSpeechSynthesisSupported && (
              <VoiceToggle label="Voice interviewer" checked={voiceEnabled} onChange={handleToggleVoice} />
            )}
            {mounted && isSpeechRecognitionSupported && (
              <VoiceToggle label="Speak my answers" checked={speakAnswersOn} onChange={handleToggleSpeak} />
            )}
            {/* Progress dots */}
            <div className="flex items-center gap-1">
              {Array.from({ length: session.questionCount }).map((_, i) => {
                const turn = transcript[i];
                const isAnswered = turn?.answer !== null;
                const isFollowUpDone = turn?.followUpAnswer !== null;
                const isCurrent = currentTurn === turn;
                return (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      isFollowUpDone ? "bg-green-500" :
                      isAnswered ? "bg-green-400" :
                      isCurrent ? "bg-primary" :
                      "bg-gray-300"
                    }`}
                    title={`Question ${i + 1}`}
                  />
                );
              })}
            </div>
            {session.status === "active" && (
              <Button variant="ghost" size="sm" onClick={handleFinish} disabled={stage === "loading" || stage === "evaluating"}>
                Finish
              </Button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-4xl px-6 pt-4">
          <AuthBanner message={error} />
        </div>
      )}

      <main className="mx-auto max-w-4xl px-6 py-8">
        {stage === "loading" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">{STAGED_COPY[stageIndex]}</p>
          </div>
        )}

        {stage === "evaluating" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">{STAGED_COPY[stageIndex]}</p>
          </div>
        )}

        {stage === "ready" && currentTurn && (
          <div className="space-y-6">
            {/* Question bubble */}
            <div className="flex justify-start items-start gap-3">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <p className="text-sm font-medium text-foreground">{currentTurn.question}</p>
                {currentTurn.focus && (
                  <p className="mt-1 text-xs text-muted-foreground italic">Focus: {currentTurn.focus}</p>
                )}
              </div>
              {/* Waveform dots — visible only while the interviewer is reading */}
              {speechBlocked && (
                <button
                  type="button"
                  onClick={interruptSpeech}
                  aria-label="Stop speaking"
                  title="Stop speaking"
                  className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <span className="flex items-end gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </span>
                  Stop
                </button>
              )}
            </div>

            {/* Previous Q&A with evaluations */}
            {transcript.map((turn, i) => {
              if (i >= transcript.indexOf(currentTurn)) return null;
              const isFollowUpTurn = turn.followUp && turn.followUpAnswer !== null;
              const evaluation = isFollowUpTurn ? turn.followUpEvaluation : turn.evaluation;
              const answerText = isFollowUpTurn ? turn.followUpAnswer : turn.answer;

              if (!answerText) return null;

              return (
                <div key={i} className="space-y-3">
                  {/* User's answer */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3">
                      <p className="text-sm text-primary-foreground whitespace-pre-wrap">{answerText}</p>
                    </div>
                  </div>

                  {/* Evaluation feedback */}
                  {evaluation && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Score:</span>
                          <span className="text-sm font-bold text-foreground">{evaluation.score}/10</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{evaluation.feedback}</p>
                      </div>
                    </div>
                  )}

                  {/* Follow-up question if present */}
                  {turn.followUp && !turn.followUpAnswer && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-primary/20 bg-primary/10 px-4 py-3">
                        <p className="text-xs font-medium text-primary mb-1">Follow-up</p>
                        <p className="text-sm text-foreground">{turn.followUp}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Answer composer — recognized speech enters the SAME pipeline as typed text */}
            <AnswerComposer
              value={answer}
              onChange={setAnswer}
              onSubmit={handleSubmit}
              submitting={submitting}
              disabled={speechBlocked}
              placeholder="Type or speak your answer... (be specific — mention metrics where you can)"
              micSupported={mounted && isSpeechRecognitionSupported}
              speakAnswersOn={speakAnswersOn}
              listening={listening}
              micError={micError}
              onToggleMic={handleToggleMic}
            />
          </div>
        )}

        {stage === "followUp" && currentTurn && currentTurn.followUp && (
          <div className="space-y-6">
            {/* Original Q&A */}
            <div className="flex justify-start items-start gap-3">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <p className="text-sm font-medium text-foreground">{currentTurn.question}</p>
              </div>
              {speechBlocked && (
                <button
                  type="button"
                  onClick={interruptSpeech}
                  aria-label="Stop speaking"
                  title="Stop speaking"
                  className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <span className="flex items-end gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </span>
                  Stop
                </button>
              )}
            </div>
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3">
                <p className="text-sm text-primary-foreground whitespace-pre-wrap">{currentTurn.answer}</p>
              </div>
            </div>

            {/* Evaluation */}
            {currentTurn.evaluation && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Score:</span>
                    <span className="text-sm font-bold text-foreground">{currentTurn.evaluation.score}/10</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{currentTurn.evaluation.feedback}</p>
                </div>
              </div>
            )}

            {/* Follow-up question */}
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-primary/20 bg-primary/10 px-4 py-3">
                <p className="text-xs font-medium text-primary mb-1">Follow-up</p>
                <p className="text-sm text-foreground">{currentTurn.followUp}</p>
              </div>
            </div>

            {/* Follow-up composer — same pipeline, same voice affordances */}
            <AnswerComposer
              value={answer}
              onChange={setAnswer}
              onSubmit={handleSubmit}
              submitting={submitting}
              disabled={speechBlocked}
              placeholder="Type or speak your follow-up answer..."
              micSupported={mounted && isSpeechRecognitionSupported}
              speakAnswersOn={speakAnswersOn}
              listening={listening}
              micError={micError}
              onToggleMic={handleToggleMic}
            />
          </div>
        )}

        {/* Summary screen */}
        {stage === "finished" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-serif text-xl font-semibold tracking-tight">Session Complete</h2>
              {session.finalScore != null && (
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">{session.finalScore}</span>
                  <span className="text-muted-foreground">/10 average</span>
                </div>
              )}
              {session.summary && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{session.summary}</p>
              )}
            </div>

            {/* Per-question breakdown */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold tracking-tight">Per-Question Feedback</h3>
              {transcript.map((turn, i) => {
                const isFollowUpTurn = turn.followUp && turn.followUpAnswer !== null;
                const evaluation = isFollowUpTurn ? turn.followUpEvaluation : turn.evaluation;
                const answerText = isFollowUpTurn ? turn.followUpAnswer : turn.answer;

                if (!answerText) return null;

                return (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Q{i + 1}: {turn.question}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Score:</span>
                      <span className="text-sm font-bold text-foreground">{evaluation?.score ?? "—"}/10</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{evaluation?.feedback}</p>
                    {isFollowUpTurn && turn.followUp && (
                      <div className="mt-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2">
                        <p className="text-xs font-medium text-primary">Follow-up: {turn.followUp}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/dashboard/interview" className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-secondary/30">
                Back to interviews
              </Link>
              <Link href="/dashboard/interview/start" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                New Interview
              </Link>
            </div>
          </div>
        )}

        <div ref={chatRef} />
      </main>
    </div>
  );
}
