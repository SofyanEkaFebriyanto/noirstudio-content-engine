/**
 * ElevenLabs client. Dependency-free fetch wrapper around the endpoints this
 * engine uses:
 *   POST /v1/text-to-speech/{voice_id}/with-timestamps
 *   POST /v1/sound-generation
 *   POST /v1/music
 *   GET  /v1/voices
 */
import { requireEnv } from './env';

const BASE = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';

function apiKey(): string {
  return requireEnv('ELEVENLABS_API_KEY', 'Get one at https://elevenlabs.io/app/settings/api-keys');
}

export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type TtsResult = {
  audio: Buffer;
  alignment: Alignment;
};

export type TtsOptions = {
  voiceId: string;
  text: string;
  modelId?: string;
  languageCode?: string;
  outputFormat?: string;
  settings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    speed?: number;
    useSpeakerBoost?: boolean;
  };
};

/** Synthesize speech and return audio plus character alignment. */
export async function textToSpeechWithTimestamps(options: TtsOptions): Promise<TtsResult> {
  const format = options.outputFormat ?? process.env.ELEVENLABS_TTS_FORMAT ?? 'mp3_44100_128';
  const url = `${BASE}/v1/text-to-speech/${encodeURIComponent(options.voiceId)}/with-timestamps?output_format=${format}`;

  const body: Record<string, unknown> = {
    text: options.text,
    model_id: options.modelId ?? process.env.ELEVENLABS_TTS_MODEL ?? 'eleven_multilingual_v2',
  };

  if (options.languageCode) {
    body.language_code = options.languageCode;
  }

  if (options.settings) {
    body.voice_settings = {
      stability: options.settings.stability,
      similarity_boost: options.settings.similarityBoost,
      style: options.settings.style,
      speed: options.settings.speed,
      use_speaker_boost: options.settings.useSpeakerBoost,
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await apiError(response, 'text-to-speech');
  }

  const json = (await response.json()) as { audio_base64: string; alignment?: Alignment; normalized_alignment?: Alignment };
  const alignment = json.alignment ?? json.normalized_alignment;
  if (!alignment) {
    throw new Error('ElevenLabs returned no alignment. Use a model that supports timestamps (multilingual_v2 / v3).');
  }

  return { audio: Buffer.from(json.audio_base64, 'base64'), alignment };
}

export type SoundEffectOptions = {
  text: string;
  durationSeconds?: number;
  loop?: boolean;
  promptInfluence?: number;
  modelId?: string;
  outputFormat?: string;
};

/** Generate a single sound effect. Max 30 seconds per call. */
export async function generateSoundEffect(options: SoundEffectOptions): Promise<Buffer> {
  const format = options.outputFormat ?? 'mp3_44100_128';
  const response = await fetch(`${BASE}/v1/sound-generation?output_format=${format}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: options.text,
      duration_seconds: options.durationSeconds,
      loop: options.loop ?? false,
      prompt_influence: options.promptInfluence ?? 0.3,
      model_id: options.modelId ?? 'eleven_text_to_sound_v2',
    }),
  });

  if (!response.ok) throw await apiError(response, 'sound-generation');
  return Buffer.from(await response.arrayBuffer());
}

export type MusicOptions = {
  prompt: string;
  lengthMs: number;
  instrumental?: boolean;
  modelId?: string;
  seed?: number;
  outputFormat?: string;
};

/** Compose a music bed. 3s–10min; longer beds get looped by the engine. */
export async function composeMusic(options: MusicOptions): Promise<Buffer> {
  const format = options.outputFormat ?? 'mp3_44100_128';
  const body: Record<string, unknown> = {
    prompt: options.prompt,
    music_length_ms: Math.round(Math.min(600_000, Math.max(3_000, options.lengthMs))),
    model_id: options.modelId ?? 'music_v1',
    force_instrumental: options.instrumental ?? true,
  };
  if (options.seed !== undefined) body.seed = options.seed;

  const response = await fetch(`${BASE}/v1/music?output_format=${format}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw await apiError(response, 'music');
  return Buffer.from(await response.arrayBuffer());
}

export type Voice = {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  category?: string;
};

const voiceCache = new Map<string, Voice[]>();

export async function listVoices(): Promise<Voice[]> {
  const cached = voiceCache.get('all');
  if (cached) return cached;
  const response = await fetch(`${BASE}/v1/voices`, {
    headers: { 'xi-api-key': apiKey() },
  });
  if (!response.ok) throw await apiError(response, 'voices');
  const json = (await response.json()) as { voices: Voice[] };
  voiceCache.set('all', json.voices);
  return json.voices;
}

/** Find a voice by id, exact name, or fuzzy name match. */
export async function resolveVoice(query: string): Promise<Voice> {
  const voices = await listVoices();
  const exact = voices.find((voice) => voice.voice_id === query);
  if (exact) return exact;
  const byName = voices.find((voice) => voice.name.toLowerCase() === query.toLowerCase());
  if (byName) return byName;
  const fuzzy = voices.filter((voice) => voice.name.toLowerCase().includes(query.toLowerCase()));
  if (fuzzy.length === 1) return fuzzy[0]!;
  if (fuzzy.length > 1) {
    throw new Error(
      `Voice "${query}" is ambiguous: ${fuzzy.map((voice) => voice.name).join(', ')}. Use a voice_id.`,
    );
  }
  // A voice id that is absent is the common case: the key belongs to a
  // different workspace, or the voice was deleted. Say which it is, and list
  // what this key can actually use — a wall of names in one line is unreadable.
  const looksLikeId = /^[A-Za-z0-9]{20,}$/.test(query);
  const header = looksLikeId
    ? `Voice id "${query}" is not available to this API key.`
    : `No voice named "${query}" in this workspace.`;

  const list = voices
    .map((voice) => {
      const use = voice.labels?.use_case ? `  [${voice.labels.use_case}]` : '';
      return `    ${voice.voice_id}  ${voice.name}${use}`;
    })
    .join('\n');

  throw new Error(
    `${header}\n\n` +
      (looksLikeId
        ? 'This key sees only the voices below. If the id is from another workspace, copy it from the one this key belongs to.\n\n'
        : '') +
      `Available to this key (${voices.length}):\n${list}\n\n` +
      'Pick one with --voice <id|name>, or set ELEVENLABS_VOICE_ID in .env.',
  );
}

async function apiError(response: Response, endpoint: string): Promise<Error> {
  let detail = '';
  try {
    const json = (await response.json()) as { detail?: unknown };
    detail =
      typeof json.detail === 'string'
        ? json.detail
        : json.detail
          ? JSON.stringify(json.detail)
          : JSON.stringify(json);
  } catch {
    detail = await response.text().catch(() => '');
  }
  const hint =
    response.status === 401
      ? ' Check ELEVENLABS_API_KEY.'
      : response.status === 422
        ? ' Request body was rejected — check the text and voice id.'
        : response.status === 429
          ? ' Rate limited or out of credits.'
          : '';
  return new Error(`ElevenLabs ${endpoint} failed (${response.status}): ${detail}.${hint}`);
}
