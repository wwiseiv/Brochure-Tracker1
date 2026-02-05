// ElevenLabs integration using ELEVENLABS_API_KEY secret
// Note: Using direct API key instead of connector (user preference)

import { ElevenLabsClient } from 'elevenlabs';

function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }
  return apiKey;
}

export function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = getApiKey();
  return new ElevenLabsClient({ apiKey });
}

export function getElevenLabsApiKeyValue(): string {
  return getApiKey();
}

export async function textToSpeech(text: string, voiceId: string = "21m00Tcm4TlvDq8ikWAM"): Promise<{ audio: string; format: string }> {
  const apiKey = getApiKey();
  
  const cleanTextForTTS = (input: string): string => {
    return input
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{3,}/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanedText = cleanTextForTTS(text);
  const maxLength = 5000;
  const truncatedText = cleanedText.length > maxLength 
    ? cleanedText.substring(0, maxLength) + "..."
    : cleanedText;

  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: truncatedText,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text();
    console.error("ElevenLabs TTS API error:", ttsResponse.status, errorText);
    throw new Error("Failed to generate speech");
  }

  const audioBuffer = await ttsResponse.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString("base64");

  return {
    audio: base64Audio,
    format: "audio/mpeg",
  };
}

export async function speechToText(audioBuffer: Buffer, filename: string = "audio.webm"): Promise<string> {
  const apiKey = getApiKey();
  
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer]), filename);
  formData.append('model_id', 'scribe_v1');
  
  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs STT API error:", response.status, errorText);
    throw new Error('Transcription failed: ' + response.statusText);
  }
  
  const result = await response.json();
  return result.text;
}
