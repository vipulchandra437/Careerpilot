"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type Landmarker = import("@mediapipe/tasks-vision").FaceLandmarker;

export interface MonitoringCues {
  available: boolean;
  faceVisible: boolean;
  eyeContactPercent: number;
  longPauses: number;
}

const initial: MonitoringCues = { available: false, faceVisible: false, eyeContactPercent: 0, longPauses: 0 };

/**
 * Camera and microphone stay in the browser: face landmarks and audio levels
 * become small numeric cues only. No media data is sent anywhere (P8-14).
 */
export function useLiveMonitoring(
  stream: MediaStream | null,
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled = true
): MonitoringCues {
  const [cues, setCues] = useState<MonitoringCues>(initial);
  const landmarkerRef = useRef<Landmarker | null>(null);

  useEffect(() => {
    if (!enabled || !stream) return;
    let cancelled = false;
    let frame = 0;
    let audio: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let samples: Uint8Array<ArrayBuffer> | null = null;
    let frames = 0;
    let centeredFrames = 0;
    let longPauses = 0;
    let silenceStart = 0;
    let wasSpeaking = false;
    let lastPublish = performance.now();

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      void video.play().catch(() => undefined);
    }

    if (stream.getAudioTracks().length && typeof AudioContext !== "undefined") {
      try {
        audio = new AudioContext();
        const source = audio.createMediaStreamSource(stream);
        analyser = audio.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        samples = new Uint8Array(analyser.fftSize);
      } catch {
        audio = null;
        analyser = null;
      }
    }

    // Client-only import; no CDN script tag (P8-14).
    void import("@mediapipe/tasks-vision")
      .then(async ({ FaceLandmarker, FilesetResolver }) => {
        const fileset = await FilesetResolver.forVisionTasks("/models/wasm");
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        if (cancelled) landmarker.close();
        else landmarkerRef.current = landmarker;
      })
      .catch(() => undefined); // No model => coaching chips stay quiet and no score is inferred.

    const loop = () => {
      const now = performance.now();
      let faceVisible = false;
      if (landmarkerRef.current && video && video.readyState >= 2) {
        try {
          const landmarks = landmarkerRef.current.detectForVideo(video, now).faceLandmarks[0];
          if (landmarks) {
            faceVisible = true;
            const leftIris = landmarks[468];
            const rightIris = landmarks[473];
            const leftMid = (landmarks[33].x + landmarks[133].x) / 2;
            const rightMid = (landmarks[362].x + landmarks[263].x) / 2;
            const leftMidY = (landmarks[33].y + landmarks[133].y) / 2;
            const rightMidY = (landmarks[362].y + landmarks[263].y) / 2;
            const dx = (leftIris.x - leftMid + rightIris.x - rightMid) / 2;
            const dy = (leftIris.y - leftMidY + rightIris.y - rightMidY) / 2;
            frames += 1;
            if (Math.abs(dx) < 0.035 && Math.abs(dy) < 0.03) centeredFrames += 1;
          } else {
            faceVisible = false;
          }
        } catch {
          faceVisible = false;
        }
      }

      if (analyser && samples) {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const value = (sample - 128) / 128;
          sum += value * value;
        }
        const speaking = Math.sqrt(sum / samples.length) > 0.02;
        if (wasSpeaking && !speaking) silenceStart = now;
        if (!wasSpeaking && speaking && silenceStart && now - silenceStart > 700) longPauses += 1;
        if (speaking) silenceStart = 0;
        wasSpeaking = speaking;
      }

      if (now - lastPublish > 500) {
        const modelReady = !!landmarkerRef.current;
        setCues({
          available: modelReady,
          faceVisible: modelReady && faceVisible,
          eyeContactPercent: modelReady && frames ? Math.round((centeredFrames / frames) * 100) : 0,
          longPauses,
        });
        frames = 0;
        centeredFrames = 0;
        lastPublish = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      setCues(initial);
      void audio?.close().catch(() => undefined);
    };
  }, [stream, videoRef, enabled]);

  return cues;
}
