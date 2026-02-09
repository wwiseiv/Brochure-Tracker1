# Replit Prompt: Add Responsive Video Section to PCBISV.com Landing Page

## What to Build

Add a responsive Vimeo video embed to the landing page of the Field Sales Intelligence Suite (PCBISV.com). The video is a platform overview and should appear prominently near the top of the page — directly below the existing "Get Started Free" button/hero section.

## Video Details

- **Vimeo URL:** https://vimeo.com/1163436271
- **Aspect ratio:** 16:9
- **Embed method:** Use Vimeo's oEmbed/iframe player (not a raw video tag)

## Placement

The video section goes **immediately after the hero section** (the one with the "Field Sales Intelligence Suite" headline, tagline, and "Get Started Free" button — see the existing layout). It should feel like a natural continuation of the hero — not a jarring break. The hero introduces the product, and the video shows it in action.

## Design Requirements

### Video Container
- Wrap the iframe in a section with a subtle background differentiation from the hero (e.g., a very light gradient, soft card shadow, or a slight background color shift) so it reads as its own content block without feeling disconnected.
- Add a short headline above the video — something like **"See It in Action"** or **"Watch the Platform Tour"** — styled consistently with the existing page typography (the site uses a purple/indigo brand color for accents).
- Optionally add a one-line subtitle beneath the headline: *"A 4-minute walkthrough of every tool in your sales toolkit."*
- Center everything horizontally.

### Responsive Sizing — CRITICAL
The video must look great on desktop, tablet, and mobile. Use a responsive 16:9 container pattern:

**Desktop (>1024px):**
- Max-width of the video container: ~900px or ~70% of the viewport width, whichever is smaller. Do NOT let it stretch full-width on large screens — it should feel intentionally framed, not like a background video.
- Rounded corners on the iframe container (border-radius: 12-16px) with a subtle box-shadow to give it a polished, card-like feel consistent with the rest of the UI.

**Tablet (768px–1024px):**
- Video container should be ~85-90% of viewport width.
- Maintain rounded corners and shadow.

**Mobile (<768px):**
- Video container should be ~95% of viewport width (with small horizontal padding).
- Reduce or remove rounded corners so it feels more immersive on small screens.
- Make sure the video is still easily tappable/playable — no overlapping elements.

### 16:9 Responsive Aspect Ratio
Use the standard responsive embed technique:
```css
.video-wrapper {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
  overflow: hidden;
  border-radius: 12px; /* adjust per breakpoint */
}
.video-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
```

Or if using modern CSS, `aspect-ratio: 16/9` on the iframe container works too — but verify cross-browser support.

### Vimeo Iframe Embed
```html
<iframe 
  src="https://player.vimeo.com/video/1163436271?badge=0&autopause=0&player_id=0&app_id=58479" 
  width="100%" 
  height="100%" 
  frameborder="0" 
  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" 
  title="PCBancard Field Sales Intelligence Suite Overview"
  loading="lazy"
></iframe>
```

Use `loading="lazy"` so the iframe doesn't block initial page load.

### Visual Polish
- Add vertical spacing (padding) above and below the video section — at least 48px on desktop, 32px on mobile — so it breathes.
- Consider a very subtle entrance animation (fade-in or slide-up on scroll) if the rest of the site uses scroll animations. If not, skip it — don't introduce a new pattern.
- The section background should be slightly different from the hero above it. Options: a very faint gray (#F8F9FC), or keep the same background but add a horizontal divider or spacing that creates visual separation.

### Accessibility
- The iframe must have a `title` attribute (included above).
- Ensure sufficient color contrast on the headline and subtitle text.
- The video section should be keyboard-navigable.

## What NOT to Do
- Do NOT autoplay the video. Let the user click play.
- Do NOT add a custom play button overlay — just use the native Vimeo player controls.
- Do NOT make the video full-bleed/full-width on desktop. It should feel contained and intentional.
- Do NOT add a separate "Watch Video" CTA button that opens a modal. Embed it inline.
- Do NOT lazy-load in a way that causes layout shift — the container should reserve the correct 16:9 space before the iframe loads.

## Summary

Add a new responsive section directly below the hero on the PCBISV.com landing page. It should contain a centered headline, optional subtitle, and a 16:9 Vimeo embed (video ID: 1163436271) in a rounded, shadowed container that scales gracefully from mobile to desktop. Keep it consistent with the existing purple/indigo brand aesthetic and the clean, card-based UI style already on the site.
