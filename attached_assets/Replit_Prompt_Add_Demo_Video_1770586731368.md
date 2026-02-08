# REPLIT TASK: Add Demo Video to PCB Auto Homepage

## What To Do

Add the PCB Auto demo video to the homepage so prospective auto repair shop owners can watch it and learn about the platform. The video should be a prominent, visually compelling section — not buried at the bottom.

## Video Details

- **Vimeo URL:** https://vimeo.com/1163077090/8af78ee4f6
- **Embed URL:** https://player.vimeo.com/video/1163077090?h=8af78ee4f6
- **Aspect Ratio:** 16:9
- **Duration:** ~2 minutes

## Embed Code

Use Vimeo's responsive iframe embed. Do NOT use a static width/height — it must be responsive:

```html
<div style="position: relative; width: 100%; max-width: 960px; margin: 0 auto; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
  <iframe
    src="https://player.vimeo.com/video/1163077090?h=8af78ee4f6&title=0&byline=0&portrait=0"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    allow="autoplay; fullscreen; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>
```

**Vimeo player parameters explained:**
- `title=0` — hides the video title overlay
- `byline=0` — hides the "from [user]" text
- `portrait=0` — hides the uploader's avatar
- These keep it clean and branded

## Where To Place It

Place the video section on the homepage in a prominent position — ideally as the **second section**, right after the hero/header area. The flow should be:

1. **Hero section** (existing headline, tagline, CTA buttons)
2. **⬇️ NEW: Demo Video section** ← add here
3. **Features / rest of homepage content** (existing)

## Design for the Video Section

Build a section around the video that looks like this:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              See PCB Auto in Action                         │
│   Everything your shop needs — in one 2-minute walkthrough  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │                                                     │   │
│   │               [  VIMEO VIDEO EMBED  ]               │   │
│   │                  16:9 responsive                    │   │
│   │                                                     │   │
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│       Repair Orders · Digital Inspections · Parts           │
│       Scheduling · Payments · All Connected                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Styling Requirements

- **Section background:** Slightly different from surrounding sections — use a subtle contrast (dark background if the page is light, or a light card on a gray background) so the video section stands out
- **Section padding:** 60px top and bottom (desktop), 40px on mobile
- **Headline:** "See PCB Auto in Action" — large, bold, centered above the video
- **Subheadline:** "Everything your shop needs — in one 2-minute walkthrough" — smaller, muted color, centered
- **Video container:** max-width 960px, centered, 16:9 aspect ratio, border-radius 12px, subtle box-shadow to give it depth
- **Below the video:** A single line of feature keywords separated by dots or pipes — "Repair Orders · Digital Inspections · Parts · Scheduling · Payments · All Connected" — small text, muted, centered
- **Responsive:** On mobile (< 768px), the video should go full-width with 16px side padding. The text above and below should scale down appropriately.

### CSS Reference

```css
.video-section {
  padding: 60px 24px;
  text-align: center;
}

.video-section h2 {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 8px;
}

.video-section .subtitle {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 32px;
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.video-features {
  margin-top: 24px;
  font-size: 14px;
  color: #9ca3af;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .video-section {
    padding: 40px 16px;
  }
  .video-section h2 {
    font-size: 24px;
  }
  .video-section .subtitle {
    font-size: 14px;
  }
  .video-container {
    border-radius: 8px;
  }
}
```

## React Component (if homepage uses React)

```jsx
function DemoVideoSection() {
  return (
    <section className="video-section">
      <h2>See PCB Auto in Action</h2>
      <p className="subtitle">
        Everything your shop needs — in one 2-minute walkthrough
      </p>
      <div className="video-container">
        <iframe
          src="https://player.vimeo.com/video/1163077090?h=8af78ee4f6&title=0&byline=0&portrait=0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="video-features">
        Repair Orders · Digital Inspections · Parts Ordering · Scheduling · Payments · All Connected
      </p>
    </section>
  );
}
```

## Do NOT

- Do NOT autoplay the video — let the user click play
- Do NOT add a custom play button overlay that blocks the Vimeo player controls
- Do NOT set a fixed pixel width/height — use aspect-ratio: 16/9 for responsive behavior
- Do NOT hide or minimize this section — it should be prominent and easy to find
- Do NOT use Vimeo's old-style embed with fixed dimensions (width="640" height="360")

## Test Checklist

- [ ] Video plays when clicked on desktop (Chrome, Safari, Firefox)
- [ ] Video plays on mobile (iOS Safari, Android Chrome)
- [ ] Video is responsive — fills container width up to 960px, scales down on mobile
- [ ] 16:9 aspect ratio maintained at all screen sizes (no black bars, no stretching)
- [ ] Video section is visible without excessive scrolling on the homepage
- [ ] Fullscreen button works
- [ ] Page load is not slowed significantly (iframe loads lazily)
