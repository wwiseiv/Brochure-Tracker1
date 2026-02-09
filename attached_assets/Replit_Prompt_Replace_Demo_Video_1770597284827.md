# REPLIT TASK: Replace Demo Video on PCB Auto Homepage

## What To Do
Find the existing Vimeo video embed on the homepage and replace it with the new video. Remove the old video completely. Do not leave any reference to the old video ID anywhere in the codebase.

## Old Video (REMOVE THIS)
The current embed looks something like this:
```
https://player.vimeo.com/video/1163077090?h=8af78ee4f6&title=0&byline=0&portrait=0
```
Video ID: `1163077090`

Search the entire codebase for this video ID (`1163077090`) and remove every reference to it.

## New Video (REPLACE WITH THIS)
The new Vimeo share URL is:
```
https://vimeo.com/1163099932/37a0e865bc?share=copy&fl=sv&fe=ci
```

The correct **embed URL** for the iframe is:
```
https://player.vimeo.com/video/1163099932?h=37a0e865bc&title=0&byline=0&portrait=0&autoplay=0
```

Video ID: `1163099932`
Hash: `37a0e865bc`

## Embed Code
Replace the existing iframe with:
```html
<iframe
  src="https://player.vimeo.com/video/1163099932?h=37a0e865bc&title=0&byline=0&portrait=0&autoplay=0"
  width="100%"
  height="100%"
  frameborder="0"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  style="border-radius: 12px;"
></iframe>
```

## Where To Look
- Check the homepage component/page (likely `index.html`, `Home.tsx`, `HomePage.tsx`, or similar)
- Check any constants or config files that might store the video URL
- Check any CSS or styled components that reference the video section
- Search globally for `1163077090` to catch every instance

## DO NOT
- ❌ Remove the video section container, wrapper, or styling — only swap the video source
- ❌ Change the video section layout or positioning
- ❌ Break the responsive behavior of the video embed
- ❌ Leave any reference to the old video ID `1163077090` anywhere in the project

## Test
After making the change:
1. Load the homepage
2. Confirm the new video appears and plays correctly
3. Confirm the video is responsive (scales properly on mobile/tablet/desktop)
4. Search the codebase for `1163077090` — should return zero results
