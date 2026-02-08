# PCB Auto AI Assistant — Voice Add-On (Dictation + Read Aloud)

**For:** Replit AI / Developer
**Date:** February 8, 2026
**Depends on:** PCB_Auto_AI_Assistant_Implementation.md (build that first, then add this)
**Prerequisite:** ElevenLabs API key already in use on the Field Sales Suite project. Copy it to PCB Auto's Replit Secrets.

---

## 1. What This Adds

Two voice capabilities on the existing AI Assistant chat panel:

1. **🎤 Dictation (Speech-to-Text)** — User taps the microphone button next to the text input. They talk naturally. Their speech converts to text in the input field. They can edit it, then tap Send. Uses the browser's free built-in Web Speech API — no external API call, no cost.

2. **🔊 Read Aloud (Text-to-Speech)** — A small speaker icon appears on every assistant message. User taps it and ElevenLabs reads that message aloud in a natural voice. NOT automatic — only plays when they click. Uses the ElevenLabs API key you already have from the Field Sales Suite.

---

## 2. Environment Variable

```
ELEVENLABS_API_KEY=your_existing_key_here
```

Copy from the Field Sales Suite Replit project → Secrets → `ELEVENLABS_API_KEY`
Paste into the PCB Auto Replit project → Secrets

---

## 3. Backend: ElevenLabs TTS Endpoint

Create one new route that takes text and returns audio:

```typescript
// server/routes/tts.ts

import express from 'express';

const router = express.Router();

// ElevenLabs config
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';  // "Adam" — professional male voice
// Other good options:
// 'ErXwobaYiN019PkySvjV' = "Antoni" — calm, clear male
// '21m00Tcm4TlvDq8ikWAM' = "Rachel" — professional female
// 'AZnzlk1XvdvUeBnXmlld' = "Domi" — confident female
// Change VOICE_ID to whichever you prefer, or make it configurable in settings

const MODEL_ID = 'eleven_turbo_v2';  // Fast, low latency, good quality

// POST /api/pcbauto/v1/tts/speak
router.post('/speak', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    // Strip markdown formatting for cleaner speech
    const cleanText = stripMarkdown(text);

    // Call ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.5,           // 0-1, higher = more consistent
            similarity_boost: 0.75,   // 0-1, higher = closer to original voice
            style: 0.0,              // 0-1, keep low for informational content
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', response.status, errorText);
      return res.status(500).json({ error: 'Text-to-speech failed' });
    }

    // Stream the audio back as MP3
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
    });

    // Pipe the response body to the client
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));

  } catch (err: any) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'Text-to-speech failed' });
  }
});

// Strip markdown so it reads naturally as speech
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')       // Remove bold **text**
    .replace(/\*(.*?)\*/g, '$1')            // Remove italic *text*
    .replace(/#{1,6}\s/g, '')               // Remove headings
    .replace(/`(.*?)`/g, '$1')             // Remove inline code
    .replace(/```[\s\S]*?```/g, '')         // Remove code blocks entirely
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links → just the text
    .replace(/^\s*[-*+]\s/gm, '')           // Remove list bullets
    .replace(/^\s*\d+\.\s/gm, '')           // Remove numbered list markers
    .replace(/\n{2,}/g, '. ')              // Double newlines → pause
    .replace(/\n/g, '. ')                  // Single newlines → pause
    .replace(/\s{2,}/g, ' ')              // Collapse whitespace
    .trim();
}

export default router;
```

Register the route:

```typescript
// server/index.ts or server/app.ts

import ttsRoutes from './routes/tts';

app.use('/api/pcbauto/v1/tts', ttsRoutes);
```

---

## 4. Frontend: Dictation Hook (Web Speech API)

This uses the browser's free built-in speech recognition. Works on Chrome, Safari, Edge, and most mobile browsers. No API key needed.

```typescript
// hooks/useDictation.ts

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseDictationReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
}

export function useDictation(onResult?: (text: string) => void): UseDictationReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Check browser support
  const SpeechRecognition = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;
  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;        // Keep listening until stopped
    recognition.interimResults = true;    // Show words as they're spoken
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show interim results (words appearing as spoken)
      const currentText = finalTranscript || interimTranscript;
      setTranscript(currentText);

      // When a final result comes in, pass it up
      if (finalTranscript && onResult) {
        onResult(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'no-speech') {
        setError(null); // Not really an error — just silence
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // If we're still supposed to be listening (user didn't stop), restart
      // This handles the case where recognition auto-stops after silence
      if (recognitionRef.current?._shouldBeListening) {
        try {
          recognition.start();
        } catch (e) {
          // Already started, ignore
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognitionRef.current._shouldBeListening = false;

    return () => {
      recognition.abort();
    };
  }, [SpeechRecognition]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    recognitionRef.current._shouldBeListening = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // May already be started
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current._shouldBeListening = false;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    error,
  };
}
```

---

## 5. Frontend: Read Aloud Hook (ElevenLabs)

```typescript
// hooks/useReadAloud.ts

import { useState, useRef, useCallback } from 'react';

interface UseReadAloudReturn {
  isPlaying: boolean;
  playingMessageId: string | null;
  speak: (text: string, messageId: string) => Promise<void>;
  stop: () => void;
  error: string | null;
}

export function useReadAloud(): UseReadAloudReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsPlaying(false);
    setPlayingMessageId(null);
  }, []);

  const speak = useCallback(async (text: string, messageId: string) => {
    // If already playing this message, stop it (toggle behavior)
    if (playingMessageId === messageId && isPlaying) {
      stop();
      return;
    }

    // Stop any currently playing audio
    stop();

    setError(null);
    setIsPlaying(true);
    setPlayingMessageId(messageId);

    try {
      abortRef.current = new AbortController();

      const response = await fetch('/api/pcbauto/v1/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Text-to-speech failed');
      }

      // Convert response to audio blob and play
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setPlayingMessageId(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setPlayingMessageId(null);
        setError('Audio playback failed');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Read aloud error:', err);
        setError('Could not play audio. Try again.');
        setIsPlaying(false);
        setPlayingMessageId(null);
      }
    }
  }, [isPlaying, playingMessageId, stop]);

  return { isPlaying, playingMessageId, speak, stop, error };
}
```

---

## 6. Updated Assistant Chat Component

Replace the input bar and message bubbles in the existing `AssistantChat` component. These are the specific sections to change:

### 6.1 Add Imports and Hooks

At the top of `AssistantChat.tsx`, add:

```tsx
import { useDictation } from '../../hooks/useDictation';
import { useReadAloud } from '../../hooks/useReadAloud';
```

Inside the component function, add:

```tsx
const { isPlaying, playingMessageId, speak, stop: stopAudio } = useReadAloud();

// Dictation — appends spoken text to the input field
const { isListening, transcript, startListening, stopListening, isSupported: micSupported, error: micError } = useDictation(
  (finalText) => {
    // Append transcribed text to whatever's already in the input
    setInput(prev => {
      const separator = prev.trim() ? ' ' : '';
      return prev + separator + finalText;
    });
  }
);

// Show interim transcript in real time while speaking
useEffect(() => {
  if (isListening && transcript) {
    // Show live preview in a state variable (optional — see UI below)
  }
}, [isListening, transcript]);
```

### 6.2 Replace the Input Bar

Replace the existing input bar `<div>` (the one with the input and Send button) with:

```tsx
{/* Dictation error */}
{micError && (
  <div style={{
    padding: '8px 16px', background: '#fef2f2', borderTop: '1px solid #fecaca',
    fontSize: 12, color: '#991b1b',
  }}>
    {micError}
  </div>
)}

{/* Live transcript preview while dictating */}
{isListening && transcript && (
  <div style={{
    padding: '8px 16px', background: '#eff6ff', borderTop: '1px solid #bfdbfe',
    fontSize: 13, color: '#1e40af', fontStyle: 'italic',
  }}>
    🎤 {transcript}...
  </div>
)}

{/* Input bar */}
<div style={{
  padding: '12px 16px', borderTop: '1px solid #e5e7eb',
  display: 'flex', gap: 8, flexShrink: 0, background: 'white',
  alignItems: 'center',
}}>
  {/* Microphone button */}
  {micSupported && (
    <button
      onClick={isListening ? stopListening : startListening}
      disabled={isLoading}
      aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
      style={{
        width: 40, height: 40, borderRadius: '50%', border: 'none',
        background: isListening ? '#ef4444' : '#f3f4f6',
        color: isListening ? 'white' : '#6b7280',
        fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
        animation: isListening ? 'micPulse 1.5s ease infinite' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {isListening ? '⏹' : '🎤'}
    </button>
  )}

  {/* Text input */}
  <input
    ref={inputRef}
    value={input}
    onChange={e => setInput(e.target.value)}
    onKeyDown={e => e.key === 'Enter' && handleSend()}
    placeholder={isListening ? 'Listening... speak now' : 'Ask anything...'}
    style={{
      flex: 1, padding: '10px 14px', fontSize: 14,
      border: isListening ? '2px solid #ef4444' : '1.5px solid #d1d5db',
      borderRadius: 10, outline: 'none',
      background: isListening ? '#fef2f2' : 'white',
      transition: 'all 0.2s ease',
    }}
  />

  {/* Send button */}
  <button onClick={handleSend} disabled={!input.trim() || isLoading} style={{
    padding: '10px 16px', background: input.trim() ? '#111827' : '#e5e7eb',
    color: input.trim() ? 'white' : '#9ca3af',
    border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
    cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0,
  }}>
    Send
  </button>
</div>

{/* Mic pulse animation */}
<style>{`
  @keyframes micPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }
`}</style>
```

### 6.3 Add Speaker Icon to Assistant Messages

Replace the existing assistant message bubble rendering with this version that adds the speaker button:

```tsx
{messages.map(msg => (
  <div key={msg.id} style={{
    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
  }}>
    <div style={{
      padding: '12px 16px',
      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
      background: msg.role === 'user' ? '#111827' : '#f3f4f6',
      color: msg.role === 'user' ? 'white' : '#1f2937',
      fontSize: 14, lineHeight: 1.6,
    }}>
      {msg.role === 'assistant' ? (
        <ReactMarkdown
          components={{
            p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
            strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
            ol: ({ children }) => <ol style={{ margin: '8px 0', paddingLeft: 20 }}>{children}</ol>,
            li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
            a: ({ href, children }) => (
              <a href={href} style={{ color: '#3b82f6', textDecoration: 'underline' }}>{children}</a>
            ),
          }}
        >
          {msg.content}
        </ReactMarkdown>
      ) : (
        msg.content
      )}
    </div>

    {/* Speaker button — only on assistant messages */}
    {msg.role === 'assistant' && (
      <button
        onClick={() => speak(msg.content, msg.id)}
        aria-label={playingMessageId === msg.id ? 'Stop reading' : 'Read aloud'}
        style={{
          marginTop: 4,
          padding: '4px 10px',
          fontSize: 12,
          background: 'none',
          border: 'none',
          color: playingMessageId === msg.id ? '#2563eb' : '#9ca3af',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          borderRadius: 6,
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={e => { if (playingMessageId !== msg.id) e.currentTarget.style.color = '#4b5563'; }}
        onMouseLeave={e => { if (playingMessageId !== msg.id) e.currentTarget.style.color = '#9ca3af'; }}
      >
        {playingMessageId === msg.id ? (
          <>
            <span style={{ animation: 'speakerPulse 1s ease infinite' }}>🔊</span>
            <span>Playing...</span>
          </>
        ) : (
          <>
            <span>🔈</span>
            <span>Listen</span>
          </>
        )}
      </button>
    )}
  </div>
))}

<style>{`
  @keyframes speakerPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`}</style>
```

---

## 7. How It Works — User Experience

### Dictation Flow (Speech-to-Text):

1. User taps the **🎤 microphone button** next to the text input
2. Button turns **red** with a pulsing glow — they know it's listening
3. Input field border turns red, placeholder changes to "Listening... speak now"
4. As they talk, a **live preview** bar appears above the input showing their words in real time
5. Their speech converts to text and fills the input field
6. They can keep talking (continuous mode) — new words append
7. When done, they tap the mic button again (turns it off) or just tap **Send**
8. They can also **edit the text** before sending — dictation doesn't auto-send

**Example:** Shop owner taps mic and says "How do I change my dual pricing rate to three and a half percent" → input fills with that text → they tap Send → assistant responds with step-by-step instructions for Settings → Dual Pricing.

### Read Aloud Flow (Text-to-Speech):

1. Every assistant message has a small **🔈 Listen** button below it
2. User taps it → button changes to **🔊 Playing...** with a pulse animation
3. ElevenLabs generates natural-sounding speech and plays it through the device speakers
4. Audio plays to completion, then the button resets to 🔈 Listen
5. If the user taps it again while playing, it **stops** immediately (toggle behavior)
6. Only ONE message plays at a time — tapping a different message stops the current one

**Example:** Advisor is helping a customer and can't read the screen. They tap Listen on the assistant's response about how to add parts, and it reads the steps aloud while they look at the RO.

---

## 8. Why These Technology Choices

| Feature | Technology | Why |
|---|---|---|
| Dictation | Browser Web Speech API | Free, no API cost, works offline, built into Chrome/Safari/Edge, ~95% browser support, real-time interim results |
| Read Aloud | ElevenLabs API | Natural-sounding voice (far better than browser TTS), already have the API key and account from Field Sales Suite, fast turbo model for low latency |

**Why NOT browser TTS for read-aloud?** The built-in `speechSynthesis` API sounds robotic and unnatural. For a professional product demo, ElevenLabs voice quality is night-and-day better. It's a small API cost (pennies per message) for a huge quality improvement.

**Why NOT a paid STT API for dictation?** The browser's Web Speech API is surprisingly good for English dictation — and it's instant (no network round-trip). For a shop environment where users speak clear English commands, it's more than sufficient. No cost, no latency.

---

## 9. Mobile Considerations

- **Microphone permission:** On first tap of the mic button, the browser will prompt for microphone access. This is standard and expected. Once granted, it persists for the session.
- **iOS Safari:** Web Speech API works on iOS Safari 14.5+. If not supported, the mic button simply doesn't render (`micSupported` check).
- **Tablet in shop:** Techs with greasy hands can hold the tablet and tap the big mic button with a knuckle, speak their question, then tap Send. Much easier than typing.
- **Audio playback:** Works on all mobile browsers. Audio plays through the device speaker or connected Bluetooth.

---

## 10. Dependencies

```bash
# No new backend dependencies — uses native fetch to call ElevenLabs
# No new frontend dependencies — Web Speech API is built into the browser
# react-markdown should already be installed from the base assistant spec
```

---

## 11. Environment Variables

```
ELEVENLABS_API_KEY=your_key_here     # Copy from Field Sales Suite Replit Secrets
```

Optional (to change the voice):

```
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB    # Default: Adam (professional male)
```

---

## 12. Voice Options

If you want to change or let merchants choose their assistant voice, here are the best ElevenLabs voices for this use case:

| Voice ID | Name | Style | Best For |
|---|---|---|---|
| `pNInz6obpgDQGcFmaJgB` | Adam | Professional male, clear | **Default — recommended** |
| `ErXwobaYiN019PkySvjV` | Antoni | Calm, articulate male | Slower-paced guidance |
| `21m00Tcm4TlvDq8ikWAM` | Rachel | Professional female | Alternate default |
| `AZnzlk1XvdvUeBnXmlld` | Domi | Confident female | Direct, energetic |
| `EXAVITQu4vr4xnSDxMaL` | Bella | Warm female | Friendly, approachable |

Future enhancement: let the merchant pick their preferred voice in Settings → AI Assistant → Voice.

---

## 13. Test Checklist

```
□ ELEVENLABS_API_KEY is set in Replit Secrets
□ Mic button appears on Chrome desktop
□ Mic button appears on iPad Safari
□ Mic button appears on Android Chrome
□ Tap mic → browser prompts for microphone permission
□ Speak → words appear in real-time in the input field
□ Tap mic again → stops listening, text remains in input
□ Tap Send → message sends with dictated text
□ Can edit dictated text before sending
□ Dictation handles natural language ("how do I add a part to this repair order")
□ Mic button does NOT appear on unsupported browsers (graceful fallback)
□ 🔈 Listen button appears on every assistant message
□ Tap Listen → audio plays in natural ElevenLabs voice
□ Tap Listen again while playing → audio stops (toggle)
□ Tap Listen on different message → previous audio stops, new one plays
□ Audio plays on mobile (iOS Safari, Android Chrome)
□ Audio plays through Bluetooth speaker/headphones if connected
□ Long assistant messages (200+ words) play fully without cutting off
□ Markdown formatting is stripped from speech (no "asterisk asterisk" spoken)
□ Numbered steps read naturally ("Step one... step two...")
□ If ElevenLabs API is down, Listen button shows error gracefully (not a crash)
□ Dictation and Read Aloud work simultaneously (can listen while mic is active)
```
