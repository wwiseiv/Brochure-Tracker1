# FIX THE FLYER LAYOUT — IT GENERATED BUT LOOKS BAD

The flyer pipeline is WORKING now — great job. But the visual layout has serious readability problems. Here's exactly what needs to change. DO NOT break the generation pipeline while making these fixes — the PDF creation, file saving, and serving all work. Only change the PDF LAYOUT code in the builder.

---

## PROBLEM 1: Benefit text is unreadable on top of the photo

The 6 numbered benefit points are overlaid directly on the hero image with no background treatment. On a busy photo (like a liquor store with bottles everywhere), the text is completely lost.

**FIX:** The benefits section MUST NOT overlap the hero image. Separate them into distinct sections:

```
CORRECT LAYOUT (top to bottom):

┌─────────────────────────────────────────────┐
│ [PC Bancard Logo]              [Industry]   │  ← Header bar (dark navy/indigo)
├─────────────────────────────────────────────┤
│                                             │
│  HERO IMAGE (full width, about 200px tall)  │  ← Image is a BANNER, not full-page
│  with dark gradient overlay (50-70% black)  │
│                                             │
│  ═══ BIG HEADLINE TEXT ═══                  │  ← White text ON the darkened image
│  ─── subheadline ───                        │  ← Only headline + subhead on image
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  WHY MERCHANTS CHOOSE US                    │  ← Section header on WHITE/light bg
│  ─────────────────────                      │
│                                             │
│  ✓ Benefit 1          ✓ Benefit 2           │  ← Two-column grid
│                                             │  ← On SOLID background (white or
│  ✓ Benefit 3          ✓ Benefit 4           │     very light gray) so text is
│                                             │     perfectly readable
│  ✓ Benefit 5          ✓ Benefit 6           │
│                                             │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │  GET YOUR FREE ANALYSIS             │    │  ← CTA box (indigo/purple bg)
│  │  See your potential savings...       │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  [Logo]  WILLIAM WISE               │    │  ← Contact card CENTERED,
│  │  Payment Consultant                  │    │     full width, prominent
│  │  (317) 331-8472                      │    │
│  │  wwiseiv@icloud.com                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│ [Visa][MC][Amex][Disc]  © 2026 PCBancard    │  ← Footer
└─────────────────────────────────────────────┘
```

**KEY RULES:**
- The hero image is a BANNER (roughly top 25-30% of the page), NOT a full-page background
- ONLY the headline and subheadline go on top of the image, with a strong dark overlay so white text pops
- ALL benefit/bullet text goes on a clean solid-color background (white, very light gray, or very light blue) with dark text
- NEVER put paragraph text on top of a photograph

---

## PROBLEM 2: Hero image overlay is too transparent

The current overlay on the image is barely there, so the headline at the top is hard to read too.

**FIX:** When drawing the hero image, add a gradient overlay:
- Top of image: 70% black opacity (so the headline text is crisp white on near-dark)
- Bottom of image: 40% black opacity (natural fade)

In PDFKit, draw a filled rectangle over the image with opacity:
```javascript
// After drawing the hero image:
doc.save();
doc.opacity(0.6);  // 60% opacity black overlay
doc.rect(0, heroY, pageWidth, heroHeight).fill('#1a1a2e');
doc.restore();
// Then draw headline text in white on top
```

---

## PROBLEM 3: Contact card is too small and off to the side

The agent's contact info is tiny and pushed to the right corner. This is the person the prospect needs to CALL — it should be prominent.

**FIX:** Make the contact section full-width and centered:
- Light gray or white card background spanning the full page width (with padding)
- Agent name in LARGE bold text (18-20pt)
- "Payment Consultant" subtitle below in regular weight
- Phone and email clearly displayed with adequate spacing
- Optionally: PC Bancard small logo to the left of the contact info
- The whole card should have a subtle border or shadow effect (a thin colored line on top works in PDFKit)

---

## PROBLEM 4: No visible PC Bancard logo at the top

The logo should appear in the top header area.

**FIX:** Check if the PC Bancard logo file exists in the project. Search for files named like `pcbancard-logo`, `logo.png`, `pcb-logo`, etc. in:
- `/public/`
- `/public/images/`
- `/uploads/`
- `/assets/`
- `/static/`

If the logo exists, draw it in the top-left corner of the header bar (about 120x40px). If no logo file is found, render "PCBancard" as styled text (bold, white, on the dark header) as a fallback.

---

## PROBLEM 5: Overall spacing and proportion

The current layout gives too much real estate to the image and not enough to the content that actually sells.

**FIX — Approximate vertical space allocation for letter size (792pt height):**
- Header bar with logo: ~50pt
- Hero image banner with headline: ~200pt (about 25% of page)
- Benefits section: ~220pt (this is the SELLING content — give it room)
- CTA box: ~70pt
- Contact card: ~100pt
- Footer with payment logos: ~50pt
- Margins and spacing eat the remaining ~100pt

---

## SUMMARY OF CHANGES

1. **Separate the image from the benefits** — benefits go on clean solid background, NOT on the photo
2. **Darken the image overlay** — 60%+ opacity so headline text is crisp
3. **Make the hero image a banner** — top ~25% of page, not a full-page background
4. **Center and enlarge the contact card** — full width, big name, clear phone/email
5. **Add the PC Bancard logo** to the header or find it in the project files
6. **Better vertical spacing** — give selling content (benefits) more room than the image

**TEST after making changes.** Generate a new flyer and verify:
- [ ] All 6 benefit points are easily readable on a clean background
- [ ] Headline is crisp and clear on the darkened image banner
- [ ] Agent name, phone, and email are prominent and centered
- [ ] Logo appears at the top
- [ ] The overall layout looks professional and balanced — not image-heavy
- [ ] The PDF still generates without errors (don't break the pipeline!)
