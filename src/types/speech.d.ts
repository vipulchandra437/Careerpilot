// WHY a local .d.ts instead of a dependency (RULES.md: zero new deps for 4b):
// lib.dom ships SpeechSynthesis/Utterance but NOT the SpeechRecognition family
// (it left the W3C-maintained spec). Chrome/Edge expose it as window.SpeechRecognition
// plus the webkit- prefixed alias. Declaring these locally keeps TS strict happy
// without pulling @types/webaudioapi or similar.

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

// WHY the core interface mirrors the MDN shape: onend/onerror/onresult/onresult
// are the only hooks we use; the rest (grammars, lang, interimResults, continuous,
// start/stop/abort) are what make it usable in the mic toggle.
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// WHY eslint-disable-next-line no-var: constructor declarations in .d.ts files
// are introduced with `var` (the declaration pattern, not a runtime variable).
// eslint-disable-next-line no-var
declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

// WHY declare on the Window interface (not global scope): both are accessed as
// window.SpeechRecognition / window.webkitSpeechRecognition by feature detection.
interface Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}
