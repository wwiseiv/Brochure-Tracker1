import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "certificates");

function svgToPng(svgString: string, width: number = 1024): Buffer {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: "width" as const, value: width },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

function generateAndSave(svgString: string, outputPath: string, width: number = 1024): void {
  const fullPath = path.join(OUTPUT_DIR, outputPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const png = svgToPng(svgString, width);
  fs.writeFileSync(fullPath, png);
  console.log(`Generated: ${outputPath}`);
}

function laurelLeaf(cx: number, cy: number, angle: number, scale: number = 1, color: string): string {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const w = 8 * scale;
  const h = 22 * scale;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}" fill="${color}" transform="rotate(${angle},${cx},${cy})" opacity="0.9"/>`;
}

function beadedRing(cx: number, cy: number, radius: number, count: number, beadR: number, color: string): string {
  let beads = "";
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    beads += `<circle cx="${x}" cy="${y}" r="${beadR}" fill="${color}"/>`;
  }
  return beads;
}

function star5(cx: number, cy: number, outerR: number, innerR: number, fill: string): string {
  let points = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points += `${x},${y} `;
  }
  return `<polygon points="${points.trim()}" fill="${fill}"/>`;
}

function laurelWreath(cx: number, cy: number, radius: number, leafCount: number, leafColor: string, highlightColor: string, withBerries: boolean = false): string {
  let svg = "";
  const halfCount = Math.floor(leafCount / 2);
  for (let i = 0; i < halfCount; i++) {
    const t = (i / (halfCount - 1));
    const startAngle = 200;
    const endAngle = 340;
    const angle = startAngle + t * (endAngle - startAngle);
    const rad = (angle * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    const leafAngle = angle + 90;
    svg += laurelLeaf(x, y, leafAngle, 1, i % 3 === 0 ? highlightColor : leafColor);
    if (withBerries && i % 4 === 2) {
      svg += `<circle cx="${x}" cy="${y}" r="4" fill="${highlightColor}" opacity="0.7"/>`;
    }
  }
  for (let i = 0; i < halfCount; i++) {
    const t = (i / (halfCount - 1));
    const startAngle = -20;
    const endAngle = -160;
    const angle = startAngle + t * (endAngle - startAngle);
    const rad = (angle * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    const leafAngle = angle - 90;
    svg += laurelLeaf(x, y, leafAngle, 1, i % 3 === 0 ? highlightColor : leafColor);
    if (withBerries && i % 4 === 2) {
      svg += `<circle cx="${x}" cy="${y}" r="4" fill="${highlightColor}" opacity="0.7"/>`;
    }
  }
  svg += `<path d="M${cx - 15},${cy + radius - 5} Q${cx},${cy + radius + 15} ${cx + 15},${cy + radius - 5}" stroke="${highlightColor}" stroke-width="3" fill="none"/>`;
  return svg;
}

function barChartIcon(cx: number, cy: number, color: string, shadowColor: string): string {
  const bars = [
    { x: cx - 40, h: 40 },
    { x: cx - 10, h: 65 },
    { x: cx + 20, h: 90 },
  ];
  let svg = "";
  for (const bar of bars) {
    svg += `<rect x="${bar.x}" y="${cy - bar.h / 2}" width="22" height="${bar.h}" rx="3" fill="${color}" stroke="${shadowColor}" stroke-width="1.5"/>`;
  }
  svg += `<line x1="${cx - 50}" y1="${cy + 50}" x2="${cx + 55}" y2="${cy + 50}" stroke="${shadowColor}" stroke-width="2"/>`;
  return svg;
}

function curvedText(text: string, cx: number, cy: number, radius: number, startAngle: number, endAngle: number, fontSize: number, fill: string, id: string): string {
  const pathD = describeArc(cx, cy, radius, startAngle, endAngle);
  return `
    <defs><path id="${id}" d="${pathD}"/></defs>
    <text font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${fill}" letter-spacing="6">
      <textPath href="#${id}" startOffset="50%" text-anchor="middle">${text}</textPath>
    </text>`;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function shieldPath(cx: number, cy: number, w: number, h: number): string {
  const top = cy - h / 2;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const bottom = cy + h / 2;
  const midBottom = cy + h * 0.25;
  return `M${left},${top + 20} Q${left},${top} ${left + 20},${top} L${right - 20},${top} Q${right},${top} ${right},${top + 20} L${right},${midBottom} Q${right},${bottom - 30} ${cx},${bottom} Q${left},${bottom - 30} ${left},${midBottom} Z`;
}

function generateBronzeMedallion(): string {
  const cx = 512, cy = 512, r = 450;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="bronzeField" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#CD9B1D"/>
      <stop offset="100%" stop-color="#8B6914"/>
    </radialGradient>
    <filter id="bronzeShadow"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/></filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#bronzeField)" stroke="#8B6914" stroke-width="20" filter="url(#bronzeShadow)"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 25}" fill="none" stroke="#A07818" stroke-width="2"/>
  ${beadedRing(cx, cy, r - 15, 80, 3, "#A07818")}
  ${laurelWreath(cx, cy, r - 60, 28, "#6B4F12", "#A07818")}
  ${barChartIcon(cx, cy - 20, "#F5DEB3", "#6B4F12")}
  ${star5(cx, cy - r + 80, 25, 10, "#F5DEB3")}
  ${curvedText("BRONZE", cx, cy, r - 100, 210, 330, 40, "#F5DEB3", "bronzeTextPath")}
  </svg>`;
}

function generateSilverMedallion(): string {
  const cx = 512, cy = 512, r = 450;
  let radialLines = "";
  for (let i = 0; i < 36; i++) {
    const angle = (i * 10 * Math.PI) / 180;
    const x1 = cx + 80 * Math.cos(angle);
    const y1 = cy + 80 * Math.sin(angle);
    const x2 = cx + 160 * Math.cos(angle);
    const y2 = cy + 160 * Math.sin(angle);
    radialLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8A8A9E" stroke-width="1" opacity="0.3"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="silverField" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#C0C0D0"/>
      <stop offset="100%" stop-color="#5A5A6E"/>
    </radialGradient>
    <filter id="silverShadow"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/></filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#silverField)" stroke="#5A5A6E" stroke-width="20" filter="url(#silverShadow)"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 25}" fill="none" stroke="#8A8A9E" stroke-width="2"/>
  ${beadedRing(cx, cy, r - 15, 80, 3, "#8A8A9E")}
  ${radialLines}
  ${laurelWreath(cx, cy, r - 60, 34, "#5A5A6E", "#8A8A9E", true)}
  ${barChartIcon(cx, cy - 20, "#E8E8F0", "#5A5A6E")}
  ${star5(cx - 30, cy - r + 80, 20, 8, "#E8E8F0")}
  ${star5(cx, cy - r + 65, 25, 10, "#E8E8F0")}
  ${star5(cx + 30, cy - r + 80, 20, 8, "#E8E8F0")}
  ${curvedText("SILVER", cx, cy, r - 100, 210, 330, 40, "#E8E8F0", "silverTextPath")}
  </svg>`;
}

function generateGoldMedallion(): string {
  const cx = 512, cy = 512, r = 450;
  let guilloche = "";
  for (let i = 0; i < 60; i++) {
    const offset = i * 3;
    guilloche += `<circle cx="${cx + offset % 20 - 10}" cy="${cy + offset % 15 - 7}" r="${180 + i * 2}" fill="none" stroke="#DAA520" stroke-width="0.5" opacity="0.15"/>`;
  }
  let ropeRing = "";
  for (let i = 0; i < 120; i++) {
    const angle = (i / 120) * Math.PI * 2;
    const rr = r - 40 + Math.sin(i * 0.5) * 4;
    const x = cx + rr * Math.cos(angle);
    const y = cy + rr * Math.sin(angle);
    ropeRing += `<circle cx="${x}" cy="${y}" r="2.5" fill="${i % 2 === 0 ? '#DAA520' : '#B8860B'}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="goldField" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#8B6914"/>
    </radialGradient>
    <filter id="goldShadow"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/></filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#goldField)" stroke="#8B6914" stroke-width="20" filter="url(#goldShadow)"/>
  ${beadedRing(cx, cy, r - 15, 90, 3.5, "#DAA520")}
  ${ropeRing}
  <clipPath id="goldClip"><circle cx="${cx}" cy="${cy}" r="${r - 50}"/></clipPath>
  <g clip-path="url(#goldClip)">${guilloche}</g>
  ${laurelWreath(cx, cy, r - 70, 36, "#8B6914", "#DAA520", true)}
  ${barChartIcon(cx, cy - 10, "#FFF2CC", "#8B6914")}
  <g transform="translate(${cx - 12},${cy - 85})">
    <polygon points="12,0 16,8 24,8 18,14 20,22 12,18 4,22 6,14 0,8 8,8" fill="#FFF2CC" stroke="#8B6914" stroke-width="1"/>
  </g>
  ${star5(cx, cy - r + 70, 30, 12, "#FFF2CC")}
  ${star5(cx - 45, cy - r + 90, 18, 7, "#FFF2CC")}
  ${star5(cx + 45, cy - r + 90, 18, 7, "#FFF2CC")}
  ${curvedText("GOLD", cx, cy, r - 110, 220, 320, 44, "#FFF2CC", "goldTextPath")}
  </svg>`;
}

function generatePlatinumMedallion(): string {
  const cx = 512, cy = 512, r = 450;
  let guilloche = "";
  for (let i = 0; i < 80; i++) {
    const offset = i * 2.5;
    guilloche += `<circle cx="${cx + (offset % 24) - 12}" cy="${cy + (offset % 18) - 9}" r="${160 + i * 2}" fill="none" stroke="#A0A0B8" stroke-width="0.4" opacity="0.12"/>`;
  }
  let scalloped = "";
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const x = cx + (r - 5) * Math.cos(angle);
    const y = cy + (r - 5) * Math.sin(angle);
    scalloped += `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#6B6B7B" stroke-width="1.5"/>`;
  }
  let ropeRing = "";
  for (let i = 0; i < 140; i++) {
    const angle = (i / 140) * Math.PI * 2;
    const rr = r - 35 + Math.sin(i * 0.5) * 4;
    const x = cx + rr * Math.cos(angle);
    const y = cy + rr * Math.sin(angle);
    ropeRing += `<circle cx="${x}" cy="${y}" r="2" fill="${i % 2 === 0 ? '#A0A0B8' : '#6B6B7B'}"/>`;
  }
  let purpleAccents = "";
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = cx + (r - 70) * Math.cos(angle);
    const y = cy + (r - 70) * Math.sin(angle);
    purpleAccents += `<circle cx="${x}" cy="${y}" r="8" fill="#6366F1" opacity="0.7"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="platField" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#D4D4E8"/>
      <stop offset="100%" stop-color="#6B6B7B"/>
    </radialGradient>
    <filter id="platShadow"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/></filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#platField)" stroke="#6B6B7B" stroke-width="20" filter="url(#platShadow)"/>
  ${scalloped}
  ${ropeRing}
  ${beadedRing(cx, cy, r - 55, 100, 2.5, "#A0A0B8")}
  <clipPath id="platClip"><circle cx="${cx}" cy="${cy}" r="${r - 60}"/></clipPath>
  <g clip-path="url(#platClip)">${guilloche}</g>
  ${laurelWreath(cx, cy, r - 80, 38, "#6B6B7B", "#A0A0B8", true)}
  ${purpleAccents}
  <g transform="translate(${cx},${cy - 10})">
    <path d="M-45,-40 L45,-40 L50,20 L30,30 Q0,55 -30,30 L-50,20 Z" fill="#F0F0FF" stroke="#6B6B7B" stroke-width="2"/>
    <line x1="0" y1="25" x2="0" y2="-15" stroke="#6366F1" stroke-width="4"/>
    <polygon points="0,-35 8,-15 -8,-15" fill="#6366F1"/>
    <line x1="-30" y1="0" x2="30" y2="0" stroke="#6B6B7B" stroke-width="2"/>
    <circle cx="0" cy="-35" r="5" fill="#F0F0FF" stroke="#6366F1" stroke-width="1.5"/>
  </g>
  <g transform="translate(${cx},${cy - r + 70})">
    <polygon points="0,-20 6,-8 18,-10 10,0 12,12 0,8 -12,12 -10,0 -18,-10 -6,-8" fill="#F0F0FF" stroke="#6B6B7B" stroke-width="1"/>
    <rect x="-22" y="-25" width="44" height="8" rx="2" fill="#A0A0B8"/>
    <polygon points="-18,-25 -14,-32 -8,-25" fill="#F0F0FF"/>
    <polygon points="-4,-25 0,-35 4,-25" fill="#F0F0FF"/>
    <polygon points="8,-25 14,-32 18,-25" fill="#F0F0FF"/>
  </g>
  ${curvedText("PLATINUM", cx, cy, r - 115, 200, 340, 38, "#F0F0FF", "platTextPath")}
  </svg>`;
}

function generateShieldBadge(
  iconContent: string,
  gradStart: string = "#6366F1",
  gradEnd: string = "#4F46E5",
  borderColor: string = "#6366F1"
): string {
  const cx = 256, cy = 256;
  const sp = shieldPath(cx, cy, 380, 420);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${gradStart}"/>
      <stop offset="100%" stop-color="${gradEnd}"/>
    </linearGradient>
    <filter id="badgeInnerShadow">
      <feOffset dx="0" dy="3"/>
      <feGaussianBlur stdDeviation="4"/>
      <feComposite operator="out" in="SourceGraphic"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.15"/></feComponentTransfer>
    </filter>
    <filter id="badgeShadow"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.25)"/></filter>
  </defs>
  <path d="${sp}" fill="url(#badgeGrad)" stroke="${borderColor}" stroke-width="6" filter="url(#badgeShadow)"/>
  <path d="${sp}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2" transform="translate(2,2) scale(0.99)"/>
  ${iconContent}
  </svg>`;
}

function generateCircleBadge(
  iconContent: string,
  gradStart: string = "#818CF8",
  gradEnd: string = "#6366F1",
  borderColor: string = "#6366F1"
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="cirBadgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${gradStart}"/>
      <stop offset="100%" stop-color="${gradEnd}"/>
    </linearGradient>
    <filter id="cirBadgeShadow"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.25)"/></filter>
  </defs>
  <circle cx="256" cy="256" r="220" fill="url(#cirBadgeGrad)" stroke="${borderColor}" stroke-width="6" filter="url(#cirBadgeShadow)"/>
  <circle cx="256" cy="256" r="195" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
  ${iconContent}
  </svg>`;
}

function generateBoltBadge(iconContent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <filter id="boltShadow"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.25)"/></filter>
  </defs>
  <path d="M290,30 L340,30 L260,240 L340,240 L200,490 L240,280 L160,280 Z" fill="url(#boltGrad)" stroke="#B45309" stroke-width="6" stroke-linejoin="round" filter="url(#boltShadow)"/>
  <path d="M290,45 L330,45 L255,245 L330,245 L210,470 L245,285 L170,285 Z" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
  ${iconContent}
  </svg>`;
}

function generateProblemMasterBadge(): string {
  const icon = `
    <g transform="translate(256,240)">
      <rect x="-50" y="-30" width="70" height="90" rx="5" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <line x1="-35" y1="-10" x2="5" y2="-10" stroke="#6366F1" stroke-width="2" opacity="0.5"/>
      <line x1="-35" y1="5" x2="5" y2="5" stroke="#6366F1" stroke-width="2" opacity="0.5"/>
      <line x1="-35" y1="20" x2="-5" y2="20" stroke="#6366F1" stroke-width="2" opacity="0.5"/>
      <line x1="-35" y1="35" x2="5" y2="35" stroke="#6366F1" stroke-width="2" opacity="0.5"/>
      <circle cx="35" cy="15" r="40" fill="none" stroke="#FFFFFF" stroke-width="4"/>
      <circle cx="35" cy="15" r="38" fill="none" stroke="#F59E0B" stroke-width="2" opacity="0.6"/>
      <line x1="63" y1="43" x2="85" y2="65" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
      <circle cx="35" cy="15" r="15" fill="#F59E0B" opacity="0.2"/>
    </g>`;
  return generateShieldBadge(icon);
}

function generateObjectionSlayerBadge(): string {
  const icon = `
    <g transform="translate(256,235)">
      <ellipse cx="-20" cy="10" rx="50" ry="40" fill="rgba(255,255,255,0.85)"/>
      <path d="M-60,30 L-70,55 L-40,35" fill="rgba(255,255,255,0.85)"/>
      <text x="-28" y="22" font-family="Arial" font-size="32" font-weight="bold" fill="#EF4444">X</text>
      <line x1="30" y1="-60" x2="-10" y2="50" stroke="#F59E0B" stroke-width="8" stroke-linecap="round"/>
      <line x1="25" y1="-55" x2="40" y2="-70" stroke="#F59E0B" stroke-width="5" stroke-linecap="round"/>
      <line x1="35" y1="-50" x2="50" y2="-55" stroke="#F59E0B" stroke-width="4" stroke-linecap="round"/>
      <line x1="-5" y1="40" x2="-20" y2="60" stroke="#F59E0B" stroke-width="4" stroke-linecap="round"/>
    </g>`;
  return generateShieldBadge(icon);
}

function generateScriptScholarBadge(): string {
  const icon = `
    <g transform="translate(256,240)">
      <path d="M-55,40 L-55,-30 Q-55,-40 -45,-40 L25,-40 Q35,-40 35,-30 L35,40 Q35,50 25,50 L-10,50 Q-55,50 -55,40 Z" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      <path d="M35,40 Q35,50 45,50 L55,50 Q65,50 65,40 L65,-20" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
      <line x1="-35" y1="-20" x2="15" y2="-20" stroke="#6366F1" stroke-width="2" opacity="0.4"/>
      <line x1="-35" y1="-5" x2="15" y2="-5" stroke="#6366F1" stroke-width="2" opacity="0.4"/>
      <line x1="-35" y1="10" x2="15" y2="10" stroke="#6366F1" stroke-width="2" opacity="0.4"/>
      <line x1="-35" y1="25" x2="5" y2="25" stroke="#6366F1" stroke-width="2" opacity="0.4"/>
      <circle cx="30" cy="-20" r="22" fill="#F59E0B" opacity="0.9"/>
      <polyline points="21,-20 28,-12 42,-28" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
  return generateShieldBadge(icon);
}

function generatePsychologyProBadge(): string {
  const icon = `
    <g transform="translate(256,235)">
      <path d="M-10,-60 Q-50,-55 -55,-10 Q-60,30 -30,50 L-15,55 L-10,40 Q-10,60 10,55 Q30,50 20,30" fill="rgba(255,255,255,0.85)" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <circle cx="-25" cy="-15" r="5" fill="#3B82F6"/>
      <circle cx="0" cy="-30" r="5" fill="#3B82F6"/>
      <circle cx="-35" cy="10" r="4" fill="#3B82F6"/>
      <circle cx="-10" cy="5" r="5" fill="#3B82F6"/>
      <circle cx="-20" cy="25" r="4" fill="#3B82F6"/>
      <line x1="-25" y1="-15" x2="0" y2="-30" stroke="#3B82F6" stroke-width="1.5" opacity="0.7"/>
      <line x1="-25" y1="-15" x2="-35" y2="10" stroke="#3B82F6" stroke-width="1.5" opacity="0.7"/>
      <line x1="-25" y1="-15" x2="-10" y2="5" stroke="#3B82F6" stroke-width="1.5" opacity="0.7"/>
      <line x1="-10" y1="5" x2="-20" y2="25" stroke="#3B82F6" stroke-width="1.5" opacity="0.7"/>
      <line x1="-35" y1="10" x2="-20" y2="25" stroke="#3B82F6" stroke-width="1.5" opacity="0.7"/>
      <g transform="translate(40,15) scale(0.8)">
        <ellipse cx="0" cy="5" rx="12" ry="18" fill="#F59E0B"/>
        <circle cx="0" cy="-18" r="10" fill="#F59E0B"/>
        <rect x="-2" y="-5" width="4" height="20" fill="#4F46E5"/>
      </g>
    </g>`;
  return generateShieldBadge(icon);
}

function generateRoleplayRookieBadge(): string {
  const icon = `
    <g transform="translate(256,240)">
      <ellipse cx="-25" cy="-10" rx="50" ry="35" fill="rgba(255,255,255,0.85)"/>
      <path d="M-65,10 L-75,35 L-45,15" fill="rgba(255,255,255,0.85)"/>
      <ellipse cx="25" cy="10" rx="45" ry="32" fill="rgba(255,255,255,0.7)"/>
      <path d="M60,28 L72,50 L42,32" fill="rgba(255,255,255,0.7)"/>
      <text x="10" y="55" font-family="Arial" font-size="28" font-weight="bold" fill="#C0C0D0">5</text>
    </g>
    <g transform="translate(256,410)">
      <path d="M-60,0 L-70,-15 L70,-15 L60,0 Z" fill="rgba(255,255,255,0.3)"/>
      <line x1="-50" y1="-8" x2="50" y2="-8" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    </g>`;
  return generateCircleBadge(icon);
}

function generateRoleplayExpertBadge(): string {
  const icon = `
    <g transform="translate(256,225)">
      <ellipse cx="-30" cy="-15" rx="48" ry="33" fill="rgba(255,255,255,0.85)"/>
      <path d="M-68,5 L-78,30 L-48,10" fill="rgba(255,255,255,0.85)"/>
      <ellipse cx="30" cy="5" rx="48" ry="33" fill="rgba(255,255,255,0.85)"/>
      <path d="M68,23 L80,48 L48,27" fill="rgba(255,255,255,0.85)"/>
      ${star5(0, -15, 28, 11, "#F59E0B")}
      <text x="-22" y="65" font-family="Arial" font-size="22" font-weight="bold" fill="#F59E0B">85+</text>
    </g>
    <g transform="translate(256,410)">
      <path d="M-70,0 Q-75,-20 0,-20 Q75,-20 70,0 Z" fill="#F59E0B" opacity="0.8"/>
      <path d="M-60,-5 Q-65,-18 0,-18 Q65,-18 60,-5 Z" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    </g>`;
  return generateShieldBadge(icon);
}

function generateSpeedLearnerBadge(): string {
  const icon = `
    <g transform="translate(250,220)">
      <circle cx="0" cy="0" r="45" fill="rgba(255,255,255,0.15)" stroke="#FFFFFF" stroke-width="3"/>
      <circle cx="0" cy="0" r="40" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <line x1="0" y1="0" x2="0" y2="-30" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="20" y2="10" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="4" fill="#FFFFFF"/>
      <text x="-8" y="70" font-family="Arial" font-size="26" font-weight="bold" fill="#FFFFFF">3</text>
      <line x1="50" y1="-15" x2="65" y2="-15" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
      <line x1="48" y1="-5" x2="60" y2="-5" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
      <line x1="45" y1="5" x2="55" y2="5" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
    </g>`;
  return generateBoltBadge(icon);
}

function generatePresentationMasterBadge(): string {
  let starsArc = "";
  for (let i = 0; i < 5; i++) {
    const angle = -30 + i * 15;
    const rad = (angle * Math.PI) / 180;
    const x = 256 + 120 * Math.cos(rad - Math.PI / 2);
    const y = 130 + 120 * Math.sin(rad - Math.PI / 2) + 60;
    starsArc += star5(x, y, 14, 6, "#F59E0B");
  }
  const icon = `
    <g transform="translate(256,250)">
      <rect x="-35" y="-10" width="70" height="50" rx="4" fill="rgba(255,255,255,0.85)"/>
      <rect x="-25" y="40" width="50" height="8" rx="2" fill="rgba(255,255,255,0.7)"/>
      <rect x="-15" y="48" width="30" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
      <g transform="translate(0,-40)">
        <ellipse cx="0" cy="0" rx="28" ry="18" fill="none" stroke="#F59E0B" stroke-width="2.5"/>
        <path d="M-22,10 Q-28,18 -18,18 Q0,18 18,18 Q28,18 22,10" fill="none" stroke="#F59E0B" stroke-width="2"/>
      </g>
    </g>
    ${starsArc}
    <path d="${shieldPath(256, 256, 400, 440)}" fill="none" stroke="#F59E0B" stroke-width="2" opacity="0.4"/>`;
  return generateShieldBadge(icon);
}

function generateCertificateBorder(): string {
  const w = 3300, h = 2550;
  const bw = 150;
  let corners = "";
  const cornerSize = 300;
  function cornerOrnament(tx: number, ty: number, rot: number): string {
    return `<g transform="translate(${tx},${ty}) rotate(${rot})">
      <path d="M0,0 Q30,-50 80,-70 Q60,-40 70,-10 Q40,-30 0,0" fill="none" stroke="#F59E0B" stroke-width="3"/>
      <path d="M0,0 Q-10,-40 20,-80 Q10,-30 50,-50 Q20,-20 0,0" fill="none" stroke="#F59E0B" stroke-width="2" opacity="0.7"/>
      <circle cx="50" cy="-50" r="8" fill="none" stroke="#F59E0B" stroke-width="2"/>
      <circle cx="50" cy="-50" r="3" fill="#F59E0B"/>
      <path d="M10,-10 Q40,-60 90,-80" fill="none" stroke="#6366F1" stroke-width="2" opacity="0.5"/>
      <path d="M5,-5 C20,-35 50,-55 85,-65" fill="none" stroke="#6366F1" stroke-width="1.5" opacity="0.4"/>
    </g>`;
  }
  corners += cornerOrnament(bw + 20, bw + 20, 0);
  corners += cornerOrnament(w - bw - 20, bw + 20, 90);
  corners += cornerOrnament(w - bw - 20, h - bw - 20, 180);
  corners += cornerOrnament(bw + 20, h - bw - 20, 270);

  let topDivider = `<g transform="translate(${w / 2},${bw + 40})">
    <line x1="-200" y1="0" x2="200" y2="0" stroke="#6366F1" stroke-width="1.5"/>
    <circle cx="0" cy="0" r="6" fill="#F59E0B"/>
    <path d="M-40,-8 Q0,-20 40,-8" fill="none" stroke="#F59E0B" stroke-width="2"/>
    <path d="M-40,8 Q0,20 40,8" fill="none" stroke="#F59E0B" stroke-width="2"/>
    <circle cx="-60" cy="0" r="3" fill="#6366F1"/>
    <circle cx="60" cy="0" r="3" fill="#6366F1"/>
  </g>`;
  let bottomDivider = `<g transform="translate(${w / 2},${h - bw - 40})">
    <line x1="-200" y1="0" x2="200" y2="0" stroke="#6366F1" stroke-width="1.5"/>
    <circle cx="0" cy="0" r="6" fill="#F59E0B"/>
    <path d="M-40,-8 Q0,-20 40,-8" fill="none" stroke="#F59E0B" stroke-width="2"/>
    <path d="M-40,8 Q0,20 40,8" fill="none" stroke="#F59E0B" stroke-width="2"/>
    <circle cx="-60" cy="0" r="3" fill="#6366F1"/>
    <circle cx="60" cy="0" r="3" fill="#6366F1"/>
  </g>`;

  let frameLines = "";
  const segments = 40;
  for (let i = 0; i < segments; i++) {
    const x = bw + (i / segments) * (w - 2 * bw);
    frameLines += `<line x1="${x}" y1="${bw / 2 - 15}" x2="${x}" y2="${bw / 2 + 15}" stroke="#6366F1" stroke-width="1" opacity="0.3"/>`;
    frameLines += `<line x1="${x}" y1="${h - bw / 2 - 15}" x2="${x}" y2="${h - bw / 2 + 15}" stroke="#6366F1" stroke-width="1" opacity="0.3"/>`;
  }
  for (let i = 0; i < 30; i++) {
    const y = bw + (i / 30) * (h - 2 * bw);
    frameLines += `<line x1="${bw / 2 - 15}" y1="${y}" x2="${bw / 2 + 15}" y2="${y}" stroke="#6366F1" stroke-width="1" opacity="0.3"/>`;
    frameLines += `<line x1="${w - bw / 2 - 15}" y1="${y}" x2="${w - bw / 2 + 15}" y2="${y}" stroke="#6366F1" stroke-width="1" opacity="0.3"/>`;
  }

  let watermark = "";
  for (let i = 0; i < 20; i++) {
    const cx = w / 2 + (i % 5 - 2) * 200;
    const cy = h / 2 + (Math.floor(i / 5) - 2) * 200;
    watermark += `<circle cx="${cx}" cy="${cy}" r="${100 + i * 15}" fill="none" stroke="#6366F1" stroke-width="0.5" opacity="0.03"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="#FFFFFF"/>
  ${watermark}
  <rect x="${bw / 2}" y="${bw / 2}" width="${w - bw}" height="${h - bw}" fill="none" stroke="#6366F1" stroke-width="4" rx="8"/>
  <rect x="${bw / 2 + 20}" y="${bw / 2 + 20}" width="${w - bw - 40}" height="${h - bw - 40}" fill="none" stroke="#F59E0B" stroke-width="1.5" rx="4"/>
  <rect x="${bw + 30}" y="${bw + 30}" width="${w - 2 * bw - 60}" height="${h - 2 * bw - 60}" fill="none" stroke="#6366F1" stroke-width="3" rx="2"/>
  ${frameLines}
  ${corners}
  ${topDivider}
  ${bottomDivider}
  </svg>`;
}

function generateCertifiedPartnerSeal(): string {
  const cx = 400, cy = 400, r = 350;
  let ropeRing = "";
  for (let i = 0; i < 100; i++) {
    const angle = (i / 100) * Math.PI * 2;
    const rr = r - 40 + Math.sin(i * 0.6) * 5;
    const x = cx + rr * Math.cos(angle);
    const y = cy + rr * Math.sin(angle);
    ropeRing += `<circle cx="${x}" cy="${y}" r="3" fill="${i % 2 === 0 ? '#6366F1' : '#4F46E5'}"/>`;
  }
  let bottomStars = "";
  for (let i = 0; i < 5; i++) {
    const angle = 200 + i * 28;
    const p = polarToCartesian(cx, cy, r - 22, angle);
    bottomStars += star5(p.x, p.y, 10, 4, "#F59E0B");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <radialGradient id="sealGrad" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </radialGradient>
    <filter id="sealBevel">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
      <feSpecularLighting in="blur" surfaceScale="5" specularConstant="0.5" specularExponent="15" result="spec"><fePointLight x="400" y="200" z="300"/></feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
      <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.5" k4="0"/>
    </filter>
    <filter id="sealShadow"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.3)"/></filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sealGrad)" stroke="#6366F1" stroke-width="8" filter="url(#sealShadow)"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 15}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  ${ropeRing}
  ${beadedRing(cx, cy, r - 55, 60, 3, "rgba(255,255,255,0.3)")}
  <circle cx="${cx}" cy="${cy}" r="${r - 70}" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <defs><path id="sealTopText" d="${describeArc(cx, cy, r - 22, 150, 30)}"/></defs>
  <text font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold" fill="#F59E0B" letter-spacing="4">
    <textPath href="#sealTopText" startOffset="50%" text-anchor="middle">CERTIFIED PARTNER</textPath>
  </text>
  ${bottomStars}
  <g transform="translate(${cx},${cy})">
    <path d="M-50,10 L-60,-10 L-50,-5 L-35,-20 Q0,-45 35,-20 L50,-5 L60,-10 L50,10 Q40,25 25,30 L15,50 Q0,60 -15,50 L-25,30 Q-40,25 -50,10 Z" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2"/>
    <polyline points="-15,10 -5,22 20,-10" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  </svg>`;
}

function generateEquipIQSeal(): string {
  const cx = 400, cy = 400, r = 350;
  let circuitLines = "";
  const circuitColor = "#3B82F6";
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x1 = cx + 100 * Math.cos(angle);
    const y1 = cy + 100 * Math.sin(angle);
    const x2 = cx + 180 * Math.cos(angle);
    const y2 = cy + 180 * Math.sin(angle);
    circuitLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${circuitColor}" stroke-width="2" opacity="0.4"/>`;
    circuitLines += `<circle cx="${x2}" cy="${y2}" r="5" fill="${circuitColor}" opacity="0.5"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <radialGradient id="eqGrad" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#3730A3"/>
    </radialGradient>
    <filter id="eqShadow"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.3)"/></filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#eqGrad)" stroke="#6366F1" stroke-width="6" filter="url(#eqShadow)"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 30}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
  ${beadedRing(cx, cy, r - 45, 50, 3, "rgba(255,255,255,0.25)")}
  <circle cx="${cx}" cy="${cy}" r="${r - 60}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
  ${circuitLines}
  <g transform="translate(${cx},${cy})">
    <rect x="-40" y="-55" width="80" height="100" rx="8" fill="rgba(255,255,255,0.9)" stroke="#3B82F6" stroke-width="2"/>
    <rect x="-30" y="-40" width="60" height="40" rx="4" fill="#3B82F6" opacity="0.3"/>
    <rect x="-20" y="10" width="15" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
    <rect x="5" y="10" width="15" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
    <rect x="-20" y="25" width="40" height="8" rx="2" fill="#3B82F6" opacity="0.3"/>
    <rect x="-10" y="45" width="20" height="15" rx="3" fill="#6B7280"/>
  </g>
  <g transform="translate(${cx + 55},${cy - 35})">
    <circle cx="0" cy="0" r="22" fill="#F59E0B"/>
    <polyline points="-8,2 -2,10 12,-6" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs><path id="eqTopText" d="${describeArc(cx, cy, r - 18, 150, 30)}"/></defs>
  <text font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" fill="#F59E0B" letter-spacing="3">
    <textPath href="#eqTopText" startOffset="50%" text-anchor="middle">EQUIPIQ CERTIFIED</textPath>
  </text>
  <defs><path id="eqBotText" d="${describeArc(cx, cy, r - 18, 210, 330)}"/></defs>
  <text font-family="Arial, Helvetica, sans-serif" font-size="18" fill="rgba(255,255,255,0.6)" letter-spacing="2">
    <textPath href="#eqBotText" startOffset="50%" text-anchor="middle">EQUIPMENT KNOWLEDGE</textPath>
  </text>
  </svg>`;
}

function generateStageIcon(stageNum: number, iconContent: string, goldProminent: boolean = false): string {
  const cx = 128, cy = 128, r = 110;
  const bgColor = goldProminent ? "#F59E0B" : "#6366F1";
  const bgEnd = goldProminent ? "#D97706" : "#4F46E5";
  const accentColor = goldProminent ? "#6366F1" : "#F59E0B";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="stageGrad${stageNum}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${bgColor}"/>
      <stop offset="100%" stop-color="${bgEnd}"/>
    </linearGradient>
    <filter id="stageShadow${stageNum}"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)"/></filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#stageGrad${stageNum})" stroke="${bgColor}" stroke-width="4" filter="url(#stageShadow${stageNum})"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 8}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
  ${iconContent}
  <text x="${cx + 35}" y="${cy - 30}" font-family="Arial" font-size="28" font-weight="bold" fill="rgba(255,255,255,0.9)">${stageNum}</text>
  <g transform="translate(${cx + 35},${cy + 40})">
    <circle cx="0" cy="0" r="12" fill="${accentColor}"/>
    <polyline points="-5,1 -2,5 6,-4" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  </svg>`;
}

function generateStage1(): string {
  const icon = `
    <g transform="translate(105,120)">
      <rect x="0" y="-25" width="30" height="55" rx="3" fill="rgba(255,255,255,0.85)" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      <rect x="25" y="-15" width="8" height="12" rx="1" fill="rgba(255,255,255,0.6)"/>
      <circle cx="15" cy="18" r="5" fill="#F59E0B"/>
    </g>`;
  return generateStageIcon(1, icon);
}

function generateStage2(): string {
  const icon = `
    <g transform="translate(95,115)">
      <rect x="0" y="-15" width="35" height="40" rx="3" fill="rgba(255,255,255,0.8)" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      <rect x="5" y="-5" width="8" height="15" fill="#F59E0B" opacity="0.7"/>
      <rect x="15" y="-10" width="8" height="20" fill="#F59E0B" opacity="0.8"/>
      <rect x="25" y="-15" width="8" height="25" fill="#F59E0B" opacity="0.9"/>
      <circle cx="40" cy="5" r="18" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
      <line x1="52" y1="17" x2="62" y2="27" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    </g>`;
  return generateStageIcon(2, icon);
}

function generateStage3(): string {
  const icon = `
    <g transform="translate(95,120)">
      <path d="M15,-30 L25,-20 L35,-25 L32,-12 L40,-5 L28,0 L25,15 L15,5 L5,15 L8,0 L-5,-5 L8,-12 L5,-25 Z" fill="#FFFFFF" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      <rect x="5" y="15" width="25" height="20" rx="3" fill="rgba(255,255,255,0.8)"/>
      <rect x="10" y="35" width="15" height="5" rx="1" fill="rgba(255,255,255,0.6)"/>
    </g>`;
  return generateStageIcon(3, icon, true);
}

export const assetManifest = {
  version: "1.0.0",
  generated: new Date().toISOString(),
  basePath: "/certificates",
  assets: {
    "border.master": {
      file: "borders/certificate-border-template.png",
      type: "border",
      displayName: "Master Certificate Border",
      dimensions: { width: 3300, height: 2550 },
    },
    "tier.bronze": {
      file: "medallions/tier-bronze-medallion.png",
      type: "tier",
      displayName: "Bronze Tier",
      tier_level: 1,
      dimensions: { width: 1024, height: 1024 },
      colors: { primary: "#CD9B1D", dark: "#6B4F12", light: "#F5DEB3" },
    },
    "tier.silver": {
      file: "medallions/tier-silver-medallion.png",
      type: "tier",
      displayName: "Silver Tier",
      tier_level: 2,
      dimensions: { width: 1024, height: 1024 },
      colors: { primary: "#C0C0D0", dark: "#5A5A6E", light: "#E8E8F0" },
    },
    "tier.gold": {
      file: "medallions/tier-gold-medallion.png",
      type: "tier",
      displayName: "Gold Tier",
      tier_level: 3,
      dimensions: { width: 1024, height: 1024 },
      colors: { primary: "#FFD700", dark: "#8B6914", light: "#FFF2CC" },
    },
    "tier.platinum": {
      file: "medallions/tier-platinum-medallion.png",
      type: "tier",
      displayName: "Platinum Tier",
      tier_level: 4,
      dimensions: { width: 1024, height: 1024 },
      colors: { primary: "#D4D4E8", dark: "#6B6B7B", light: "#F0F0FF", accent: "#6366F1" },
    },
    "badge.problem_master": {
      file: "badges/badge-problem-master.png",
      type: "badge",
      displayName: "Problem Master",
      requirement: "Complete Module 2 with 90%+",
      dimensions: { width: 512, height: 512 },
      shape: "shield",
    },
    "badge.objection_slayer": {
      file: "badges/badge-objection-slayer.png",
      type: "badge",
      displayName: "Objection Slayer",
      requirement: "Handle all 4 critical objections in simulator",
      dimensions: { width: 512, height: 512 },
      shape: "shield",
    },
    "badge.script_scholar": {
      file: "badges/badge-script-scholar.png",
      type: "badge",
      displayName: "Script Scholar",
      requirement: "100% on script knowledge quiz",
      dimensions: { width: 512, height: 512 },
      shape: "shield",
    },
    "badge.psychology_pro": {
      file: "badges/badge-psychology-pro.png",
      type: "badge",
      displayName: "Psychology Pro",
      requirement: "Complete all Deep Dives",
      dimensions: { width: 512, height: 512 },
      shape: "shield",
    },
    "badge.roleplay_rookie": {
      file: "badges/badge-roleplay-rookie.png",
      type: "badge",
      displayName: "Role-Play Rookie",
      requirement: "Complete 5 simulations",
      dimensions: { width: 512, height: 512 },
      shape: "circle",
    },
    "badge.roleplay_expert": {
      file: "badges/badge-roleplay-expert.png",
      type: "badge",
      displayName: "Role-Play Expert",
      requirement: "Score 85%+ on 10 simulations",
      dimensions: { width: 512, height: 512 },
      shape: "shield",
    },
    "badge.speed_learner": {
      file: "badges/badge-speed-learner.png",
      type: "badge",
      displayName: "Speed Learner",
      requirement: "Complete 3 modules in one day",
      dimensions: { width: 512, height: 512 },
      shape: "bolt",
    },
    "badge.presentation_master": {
      file: "badges/badge-presentation-master.png",
      type: "badge",
      displayName: "Presentation Master",
      requirement: "100% overall mastery across all modules",
      dimensions: { width: 512, height: 512 },
      shape: "shield",
    },
    "seal.certified_partner": {
      file: "seals/seal-certified-partner.png",
      type: "seal",
      displayName: "Certified Partner",
      dimensions: { width: 800, height: 800 },
    },
    "seal.equipiq_certified": {
      file: "seals/seal-equipiq-certified.png",
      type: "seal",
      displayName: "EquipIQ Certified",
      dimensions: { width: 800, height: 800 },
    },
    "stage.1.prospecting": {
      file: "stages/stage-1-prospecting.png",
      type: "stage",
      displayName: "Prospecting Complete",
      stageNumber: 1,
      dimensions: { width: 256, height: 256 },
    },
    "stage.2.discovery": {
      file: "stages/stage-2-discovery.png",
      type: "stage",
      displayName: "Discovery & Presentation Complete",
      stageNumber: 2,
      dimensions: { width: 256, height: 256 },
    },
    "stage.3.close": {
      file: "stages/stage-3-close.png",
      type: "stage",
      displayName: "Close & Follow-Up Complete",
      stageNumber: 3,
      dimensions: { width: 256, height: 256 },
    },
  },
};

export function getAssetManifest() {
  return assetManifest;
}

export function resolveAssetPath(assetId: string): string {
  const asset = (assetManifest.assets as Record<string, any>)[assetId];
  if (!asset) throw new Error(`Unknown assetId: ${assetId}`);
  return path.join(OUTPUT_DIR, asset.file);
}

export async function generateAllAssets(): Promise<void> {
  console.log("Generating all certificate assets...");

  const dirs = ["medallions", "badges", "seals", "stages", "borders"];
  for (const dir of dirs) {
    const fullDir = path.join(OUTPUT_DIR, dir);
    if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
  }

  generateAndSave(generateBronzeMedallion(), "medallions/tier-bronze-medallion.png", 1024);
  generateAndSave(generateSilverMedallion(), "medallions/tier-silver-medallion.png", 1024);
  generateAndSave(generateGoldMedallion(), "medallions/tier-gold-medallion.png", 1024);
  generateAndSave(generatePlatinumMedallion(), "medallions/tier-platinum-medallion.png", 1024);

  generateAndSave(generateProblemMasterBadge(), "badges/badge-problem-master.png", 512);
  generateAndSave(generateObjectionSlayerBadge(), "badges/badge-objection-slayer.png", 512);
  generateAndSave(generateScriptScholarBadge(), "badges/badge-script-scholar.png", 512);
  generateAndSave(generatePsychologyProBadge(), "badges/badge-psychology-pro.png", 512);
  generateAndSave(generateRoleplayRookieBadge(), "badges/badge-roleplay-rookie.png", 512);
  generateAndSave(generateRoleplayExpertBadge(), "badges/badge-roleplay-expert.png", 512);
  generateAndSave(generateSpeedLearnerBadge(), "badges/badge-speed-learner.png", 512);
  generateAndSave(generatePresentationMasterBadge(), "badges/badge-presentation-master.png", 512);

  generateAndSave(generateCertificateBorder(), "borders/certificate-border-template.png", 3300);

  generateAndSave(generateCertifiedPartnerSeal(), "seals/seal-certified-partner.png", 800);
  generateAndSave(generateEquipIQSeal(), "seals/seal-equipiq-certified.png", 800);

  generateAndSave(generateStage1(), "stages/stage-1-prospecting.png", 256);
  generateAndSave(generateStage2(), "stages/stage-2-discovery.png", 256);
  generateAndSave(generateStage3(), "stages/stage-3-close.png", 256);

  const manifestWithTimestamp = {
    ...assetManifest,
    generated: new Date().toISOString(),
  };
  const manifestPath = path.join(OUTPUT_DIR, "certificate-assets.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifestWithTimestamp, null, 2));
  console.log(`Asset manifest written to: ${manifestPath}`);
  console.log("All 18 certificate assets generated successfully.");
}
