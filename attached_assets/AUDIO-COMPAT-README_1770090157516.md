# Audio Recording Browser Compatibility Package

## Overview

This package fixes the voice recording browser compatibility issues across RoleplayCoach, new-drop, and DealMeetingRecorder components. It provides:

1. **Universal Audio Hook** - Drop-in replacement that handles all browser quirks
2. **Automatic Format Detection** - Uses best available format for each browser
3. **Compatibility UI Components** - Warns users of limitations, suggests alternatives
4. **Graceful Degradation** - Falls back to file upload when recording unavailable

## Browser Support Matrix

| Browser | Recording | Formats | Notes |
|---------|-----------|---------|-------|
| Chrome 49+ | ✅ Full | webm/opus, webm | Best support |
| Firefox 29+ | ✅ Full | webm/opus, ogg | Full support |
| Edge 79+ | ✅ Full | webm/opus, webm | Chromium-based |
| Safari 14.1+ | ✅ Full | mp4/aac | Requires recent version |
| iOS Safari 14.1+ | ⚠️ Limited | mp4/aac | Works but can be finicky |
| Chrome Android | ✅ Full | webm/opus | Good support |
| Samsung Internet | ✅ Full | webm/opus | Chromium-based |
| Opera | ✅ Full | webm/opus | Chromium-based |
| IE 11 | ❌ None | — | Not supported |

## Files Included

```
audio-compat/
├── client/src/
│   ├── hooks/
│   │   └── use-audio-recorder.ts      # Main recording hook
│   └── components/
│       └── AudioCompatibility.tsx     # UI components
├── migrations/
│   ├── RoleplayCoach-migration.tsx    # Migration guide
│   └── NewDrop-DealMeetingRecorder-migration.tsx
└── README.md
```

## Quick Installation

### Step 1: Copy Files

```bash
# Copy the hook
cp client/src/hooks/use-audio-recorder.ts your-project/client/src/hooks/

# Copy UI components
cp client/src/components/AudioCompatibility.tsx your-project/client/src/components/
```

### Step 2: Install (No New Dependencies!)

The hook uses only native browser APIs - no new npm packages needed.

### Step 3: Basic Usage

```tsx
import { useAudioRecorder } from '@/hooks/use-audio-recorder';

function MyComponent() {
  const {
    isRecording,
    audioBlob,
    audioUrl,
    duration,
    browserSupport,
    start,
    stop,
    reset,
    error,
  } = useAudioRecorder();

  return (
    <div>
      {!browserSupport.isFullySupported && (
        <p>⚠️ Limited recording support in {browserSupport.browserName}</p>
      )}
      
      <button onClick={isRecording ? stop : start}>
        {isRecording ? 'Stop' : 'Record'}
      </button>
      
      {audioBlob && <audio src={audioUrl} controls />}
    </div>
  );
}
```

## Migration Guide

### RoleplayCoach.tsx

**Find this code (around lines 300-400):**

```tsx
// OLD CODE - Remove this
const [isRecording, setIsRecording] = useState(false);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const chunksRef = useRef<Blob[]>([]);

const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  // ... lots of manual setup
};
```

**Replace with:**

```tsx
// NEW CODE
import { useAudioRecorder, createAudioFilename } from '@/hooks/use-audio-recorder';

const {
  isRecording,
  audioBlob,
  audioUrl,
  duration,
  browserSupport,
  start: startRecording,
  stop: stopRecording,
  reset,
  error,
} = useAudioRecorder({
  onStop: (blob, url, duration) => {
    // Handle completed recording
  },
  onError: (error) => {
    toast({ title: 'Error', description: error.message });
  },
  maxDuration: 180,
});
```

**Also remove the manual format detection (lines 342-359):**

```tsx
// OLD CODE - Remove this
let ext = "m4a";
const blobType = audioBlob.type.toLowerCase();
if (blobType.includes("webm")) ext = "webm";
// etc...

// NEW CODE - Replace with
import { getAudioFileExtension, createAudioFilename } from '@/hooks/use-audio-recorder';

const filename = createAudioFilename('recording', audioBlob.type);
// Automatically gets correct extension!
```

### new-drop.tsx

Similar pattern - replace manual MediaRecorder code with the hook.

### DealMeetingRecorder.tsx

See `migrations/NewDrop-DealMeetingRecorder-migration.tsx` for complete examples with:
- Audio level visualization
- Pause/resume functionality
- Upload progress
- Full compatibility fallback UI

## Hook API Reference

### useAudioRecorder(options?)

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onStop` | `(blob, url, duration) => void` | - | Called when recording stops |
| `onError` | `(error) => void` | - | Called on error |
| `onAudioLevel` | `(level: 0-1) => void` | - | Called with audio level for visualizer |
| `maxDuration` | `number` | 0 (unlimited) | Max recording seconds |
| `preferredMimeType` | `string` | auto | Override format selection |
| `audioConstraints` | `MediaTrackConstraints` | `{ echoCancellation: true }` | Audio capture settings |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `isRecording` | `boolean` | Currently recording |
| `isPaused` | `boolean` | Recording paused |
| `duration` | `number` | Recording duration in seconds |
| `audioBlob` | `Blob \| null` | Recorded audio data |
| `audioUrl` | `string \| null` | Object URL for playback |
| `error` | `Error \| null` | Last error |
| `browserSupport` | `BrowserSupport` | Compatibility info |
| `start` | `() => Promise<boolean>` | Start recording |
| `stop` | `() => Promise<Blob \| null>` | Stop recording |
| `pause` | `() => void` | Pause recording |
| `resume` | `() => void` | Resume recording |
| `reset` | `() => void` | Clear recording |

### Helper Functions

```tsx
import { 
  getAudioFileExtension,  // Get extension for MIME type
  createAudioFilename,    // Create timestamped filename
  checkBrowserSupport,    // Check support without hook
} from '@/hooks/use-audio-recorder';

// Get correct extension
getAudioFileExtension('audio/webm;codecs=opus'); // 'webm'
getAudioFileExtension(audioBlob);                 // 'webm' or 'm4a' etc

// Create filename
createAudioFilename('meeting', 'audio/webm'); // 'meeting_1699123456789.webm'

// Check support (useful outside components)
const support = checkBrowserSupport();
console.log(support.isFullySupported);
```

## UI Components

### AudioCompatibilityBanner

Shows warning when browser has limitations:

```tsx
import { AudioCompatibilityBanner } from '@/components/AudioCompatibility';

<AudioCompatibilityBanner 
  support={browserSupport}
  showOnlyIfIssues={true}  // Hide if fully supported
  compact={false}          // Full or inline display
/>
```

### AudioCompatibilityBadge

Small badge for headers:

```tsx
import { AudioCompatibilityBadge } from '@/components/AudioCompatibility';

<AudioCompatibilityBadge support={browserSupport} showBrowserName />
```

### RecordingUnavailable

Full fallback UI when recording isn't possible:

```tsx
import { RecordingUnavailable } from '@/components/AudioCompatibility';

{!browserSupport.isFullySupported && (
  <RecordingUnavailable 
    support={browserSupport}
    onUploadClick={() => openFilePicker()}
  />
)}
```

### AudioCompatibilityCheck

Detailed compatibility panel:

```tsx
import { AudioCompatibilityCheck } from '@/components/AudioCompatibility';

<AudioCompatibilityCheck support={browserSupport} />
```

## Common Issues & Solutions

### "No microphone found"

The user hasn't granted permission or no mic is connected.

```tsx
const { error } = useAudioRecorder();

if (error?.message.includes('microphone')) {
  // Show helpful message about permissions
}
```

### Safari not working

Safari requires HTTPS and explicit user interaction to start recording.

```tsx
// Make sure start() is called from a click handler
<button onClick={() => start()}>Record</button>

// NOT from useEffect or automatic trigger
```

### Recording works but upload fails

Check the file extension matches what your server expects:

```tsx
const filename = createAudioFilename('audio', audioBlob.type);
// Safari: 'audio_123456.m4a'
// Chrome: 'audio_123456.webm'

// Make sure server accepts both formats!
```

### Audio level always 0

AudioContext requires user interaction first:

```tsx
// The hook handles this, but if you see issues:
const { start } = useAudioRecorder({
  onAudioLevel: (level) => {
    // level will be 0 until recording actually starts
  },
});
```

## Testing

### Test Different Browsers

1. Open your app in Chrome - should work perfectly
2. Open in Safari - should use m4a format
3. Open in Firefox - should use webm/opus
4. Check mobile browsers

### Test Error States

```tsx
// Deny microphone permission - should show helpful error
// Unplug microphone during recording - should handle gracefully
// Record past maxDuration - should auto-stop
```

### Test File Formats

```tsx
// After recording, check:
console.log(audioBlob.type);  // Should be browser-appropriate
console.log(getAudioFileExtension(audioBlob));  // Should match
```

## What This Fixes

| Issue | Before | After |
|-------|--------|-------|
| Safari crashes | ❌ MediaRecorder fails | ✅ Uses mp4/aac |
| iOS no audio | ❌ webm not supported | ✅ Auto-detects m4a |
| Firefox ogg issues | ❌ Manual handling | ✅ Prefers opus |
| Wrong file extension | ❌ Always .m4a | ✅ Matches actual format |
| No error messages | ❌ Silent failures | ✅ Helpful errors |
| No browser warnings | ❌ Users confused | ✅ Clear compatibility UI |

## Rollback

If you need to rollback, the migration is non-breaking. Just:

1. Remove the imports
2. Restore your original MediaRecorder code
3. Keep the old format detection logic

The hook doesn't modify any global state or external behavior.

---

*This package ensures audio recording works reliably across all browsers your field reps might use.*
