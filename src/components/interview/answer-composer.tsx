"use client";

import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// WHY one composer reused by both stages (question and follow-up): the mic +
// textarea + submit affordances are identical; a single component keeps the
// speech-input wiring in one place instead of duplicated in two form blocks.

export function AnswerComposer({
  value,
  onChange,
  onSubmit,
  submitting,
  disabled,
  placeholder,
  micSupported,
  speakAnswersOn,
  listening,
  micError,
  onToggleMic,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  submitting: boolean;
  disabled: boolean;
  placeholder: string;
  micSupported: boolean;
  speakAnswersOn: boolean;
  listening: boolean;
  micError: string | null;
  onToggleMic: () => void;
}) {
  // WHY hide the mic affordance entirely when either the browser lacks
  // SpeechRecognition or the student turned "speak my answers" off: a dead mic
  // button is noise. Text input is always present and always works.
  const showMic = micSupported && speakAnswersOn;

  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-4 border-t border-border">
      {micError && (
        <p className="text-xs text-red-600" role="alert">{micError}</p>
      )}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || submitting}
        rows={4}
        className="w-full"
      />
      {disabled && (
        <p className="text-xs text-muted-foreground">
          The interviewer is speaking — click the waveform dots to stop and answer.
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          {showMic && (
            <Button
              type="button"
              variant={listening ? "default" : "outline"}
              size="sm"
              onClick={onToggleMic}
              disabled={submitting || disabled}
              className="gap-2"
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening ? "Stop recording" : "Use mic"}
            </Button>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || !value.trim() || disabled}>
            {submitting ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </form>
  );
}