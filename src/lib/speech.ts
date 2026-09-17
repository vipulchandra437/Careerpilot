"use client";

// WHY a dedicated client-only module: speech (both synthesis and recognition) is
// browser-native and only exists on the client. Centralizing feature detection,
// the toggle-preference persistence, and the recognition wrapper means the
// interview page stays readable and every Web Speech API touch lives in one file
// (RULES: one file = one responsibility).

// ---------------------------------------------------------------------------
// Feature detection (progressive enhancement)
// ---------------------------------------------------------------------------

// WHY separate booleans: synthesis and recognition are independent. A browser can
// have one but not the other (e.g. some mobile Safari). Each UI affordance must
// honor its own capability — never gate both on one.
export const isSpeechSynthesisSupported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof window.speechSynthesis !== "undefined";

export const isSpeechRecognitionSupported =
  typeof window !== "undefined" &&
  (typeof window.SpeechRecognition !== "undefined" ||
    typeof window.webkitSpeechRecognition !== "undefined");

// ---------------------------------------------------------------------------
// Toggle preferences (localStorage)
// ---------------------------------------------------------------------------

// WHY localStorage, not server state: both voice toggles are per-device
// affordance preferences (accessibility + UX), not account data. They need no
// DB write, shouldn't ride the session model, and must persist across reloads
// within the same browser (checklist requirement).

const VOICE_STORAGE_KEY = "careerpilot.voiceInterviewer";
const SPEAK_STORAGE_KEY = "careerpilot.speakAnswers";

// WHY boolean-of-stored-string: localStorage has no boolean type; an explicit
// "true"/"false" string is the unambiguous encoding. Guards against privacy-mode
// localStorage throws by degrading to the safe default.
function readBooleanPreference(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeBooleanPreference(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // non-critical: the toggle still applies for the current page.
  }
}

// WHY distinct getters, one storage helper: keep the two keys from drift while
// avoiding two near-identical helper pairs.
export function getVoicePreference(): boolean {
  return readBooleanPreference(VOICE_STORAGE_KEY);
}
export function setVoicePreference(enabled: boolean): void {
  writeBooleanPreference(VOICE_STORAGE_KEY, enabled);
}
export function getSpeakAnswersPreference(): boolean {
  return readBooleanPreference(SPEAK_STORAGE_KEY);
}
export function setSpeakAnswersPreference(enabled: boolean): void {
  writeBooleanPreference(SPEAK_STORAGE_KEY, enabled);
}

// ---------------------------------------------------------------------------
// Speech output (interviewer reads questions)
// ---------------------------------------------------------------------------

// WHY explicit steady rate/pitch: DESIGN.md wants a calm, steady interviewer —
// "not a robot gimmick". Anchoring at the neutral defaults (rate ~1.0, pitch ~1)
// gives the least synthetic delivery; forcing non-defaults risks a robotic read.
export function speak(text: string, onEnd?: () => void): void {
  if (!isSpeechSynthesisSupported || !text.trim()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.onend = onEnd ?? null;
  utterance.onerror = onEnd ?? null;
  // WHY cancel-before-speak: if a previous utterance is mid-playback, queueing
  // another would overlap. Aborting first guarantees one voice at a time.
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported) return;
  window.speechSynthesis.cancel();
}

// ---------------------------------------------------------------------------
// Speech input (student speaks answers)
// ---------------------------------------------------------------------------

export type RecognitionCallbacks = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (error: string) => void;
};

// WHY a small factory instead of a class: the interview page owns one live
// recognizer at a time and recreates it per attempt. A factory keeps that
// lifecycle explicit in the page and avoids a stateful class the page would
// only ever start/abort.
export function createRecognition(callbacks: RecognitionCallbacks): {
  start: () => void;
  stop: () => void;
  abort: () => void;
} | null {
  if (!isSpeechRecognitionSupported) return null;

  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition!;
  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  // WHY accumulate final/interim separately: onresult fires repeatedly with
  // growing result lists; "final" segments must persist while "interim" only
  // previews live partials. Final text keeps accumulating, interim is replaced
  // each event so the textarea shows the running sentence.
  let interimText = "";
  let finalText = "";

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        finalText += res[0].transcript;
      } else {
        interimText = res[0].transcript;
      }
    }
    if (finalText) {
      callbacks.onFinal(finalText.trim());
      interimText = "";
    } else if (interimText) {
      callbacks.onInterim(interimText);
    }
  };

  recognition.onerror = (event) => {
    // WHY forward the raw error string: 'not-allowed' (mic denied) vs
    // 'no-speech' map to different friendly messages in the UI. 'aborted' is
    // expected when we abort intentionally — the page doesn't need to see it.
    if (event.error !== "aborted") {
      callbacks.onError(event.error);
    }
  };

  recognition.onend = () => {
    // WHY always surface onEnd: the page flips its recording state back to idle
    // here regardless of how the recognition ended (natural silence, stop(),
    // or an error already reported above).
    callbacks.onEnd();
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch {
        // start() throws InvalidStateError if called twice in a row; the UI
        // guards, but a double-click race shouldn't surface a raw exception.
        callbacks.onError("start-failed");
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // already stopped — nothing to do.
      }
    },
    abort: () => {
      try {
        recognition.abort();
      } catch {
        // already stopped — nothing to do.
      }
    },
  };
}