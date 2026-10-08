/**
 * The local fallback: whisper-tiny running fully in the browser via
 * transformers.js. Chromium-family browsers get instant native speech;
 * Firefox and friends get this — the model downloads once (~40 MB) and
 * everything after that stays on the machine.
 */

export type WhisperProgress = (percent: number, label: string) => void;

type WhisperOutput = { text?: string };
type WhisperPipe = (audio: Float32Array, options?: Record<string, unknown>) => Promise<WhisperOutput>;

let pipePromise: Promise<WhisperPipe> | null = null;

export function loadWhisper(onProgress?: WhisperProgress): Promise<WhisperPipe> {
  if (!pipePromise) {
    pipePromise = (async () => {
      const mod = (await import("@huggingface/transformers")) as unknown as {
        pipeline: (
          task: string,
          model: string,
          options?: Record<string, unknown>,
        ) => Promise<WhisperPipe>;
      };
      return mod.pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny.en", {
        dtype: "q8",
        device: "wasm",
        progress_callback: (info: { status?: string; progress?: number }) => {
          if (onProgress && info && typeof info.progress === "number") {
            onProgress(info.progress, info.status ?? "");
          }
        },
      });
    })();
  }
  return pipePromise;
}

export async function transcribe(pipe: WhisperPipe, audio: Float32Array): Promise<string> {
  const out = await pipe(audio);
  return (out?.text ?? "").trim();
}

/** Decode a recorded blob and downsample to the 16 kHz mono PCM whisper wants. */
export async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(buf);
    const src = decoded.getChannelData(0);
    const target = 16000;
    if (decoded.sampleRate === target) return new Float32Array(src);
    const ratio = decoded.sampleRate / target;
    const out = new Float32Array(Math.floor(src.length / ratio));
    for (let i = 0; i < out.length; i++) out[i] = src[Math.floor(i * ratio)] ?? 0;
    return out;
  } finally {
    void ctx.close();
  }
}
