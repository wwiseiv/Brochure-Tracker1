# Teach Me the Presentation — Replit Build Specification

## Overview

Build an AI-powered presentation training system that teaches sales agents how to deliver the PCBancard Dual Pricing presentation to merchants. The system breaks down the complete presentation into learnable modules, explains the psychology behind each element, provides practice scenarios, and tracks mastery progression.

**Target User:** New and experienced PCBancard sales agents
**Primary Goal:** Transform agents from script readers into persuasion masters who understand WHY each element works

---

## Document Integration

This system requires two uploaded knowledge documents:
1. **Master Sales Script** — Complete word-for-word scripts for all presentation videos
2. **Persuasion Audit** — Psychological analysis of each script element with mechanisms, triggers, and strategic intent

The AI will parse these documents to generate:
- Structured learning modules
- Practice scenarios
- Comprehension quizzes
- Role-play simulations

---

## Information Architecture

### Learning Hierarchy

```
PRESENTATION MASTERY
├── Module 1: The Psychology Foundation
│   ├── Lesson 1.1: Why This Presentation Works
│   ├── Lesson 1.2: The Merchant's Mental State
│   ├── Lesson 1.3: The 8-Video Persuasion Arc
│   └── Quiz: Foundation Check
│
├── Module 2: Opening & Problem Awareness
│   ├── Lesson 2.1: The Visceral Opening
│   ├── Lesson 2.2: Fee Quantification (Anchoring)
│   ├── Lesson 2.3: The Story Proof (Marcus)
│   ├── Lesson 2.4: Identity Activation (6 AM Scene)
│   ├── Practice: Deliver the Problem Statement
│   └── Quiz: Opening Mastery
│
├── Module 3: Solution Positioning
│   ├── Lesson 3.1: Three Options Framework
│   ├── Lesson 3.2: Competitor Disqualification
│   ├── Lesson 3.3: Dual Pricing as Complete Solution
│   ├── Practice: Present the Three Options
│   └── Quiz: Solution Positioning
│
├── Module 4: Objection Prevention
│   ├── Lesson 4.1: The Customer Reaction Fear
│   ├── Lesson 4.2: Social Proof & Time Decay
│   ├── Lesson 4.3: The Math Reframe (1 in 100)
│   ├── Practice: Handle "My customers will be mad"
│   └── Quiz: Objection Prevention
│
├── Module 5: Story Proof & Transformation
│   ├── Lesson 5.1: Hero's Journey Structure
│   ├── Lesson 5.2: The Profit Flywheel Concept
│   ├── Lesson 5.3: Counterfactual Fear
│   ├── Practice: Tell Mike's Story
│   └── Quiz: Story Mastery
│
├── Module 6: Process & Risk Reversal
│   ├── Lesson 6.1: Friction Removal
│   ├── Lesson 6.2: The 90-Day Promise
│   ├── Lesson 6.3: Authority & Compliance
│   ├── Practice: Present the Process
│   └── Quiz: Process & Trust
│
├── Module 7: Solution Fit (Contextual)
│   ├── Lesson 7.1: In-Store Solutions
│   ├── Lesson 7.2: Mobile/Field Solutions
│   ├── Lesson 7.3: Online/Remote Solutions
│   ├── Practice: Match Solution to Business
│   └── Quiz: Solution Fit
│
├── Module 8: Close & Community
│   ├── Lesson 8.1: Values Alignment
│   ├── Lesson 8.2: Referral Introduction
│   ├── Lesson 8.3: The Complete CTA
│   ├── Practice: Close the Conversation
│   └── Quiz: Closing Mastery
│
└── Final Assessment: Full Presentation Simulation
```

---

## Core Features

### Feature 1: Interactive Lesson Player

Each lesson contains:
1. **Concept Introduction** — What this element is
2. **The Script** — Exact words from the presentation
3. **The Psychology** — Why these words work
4. **The Timing** — When to deploy this element
5. **Common Mistakes** — What to avoid
6. **Practice Prompt** — Try it yourself

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Module 2: Opening & Problem Awareness                                      │
│  Lesson 2.1: The Visceral Opening                            [← Prev][Next →]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📖 WHAT YOU'LL LEARN                                               │   │
│  │                                                                      │   │
│  │  The opening 25 seconds determine whether a merchant keeps watching  │   │
│  │  or mentally checks out. This lesson teaches you how to activate    │   │
│  │  visceral emotion before logic kicks in.                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎯 THE SCRIPT                                                       │   │
│  │                                                                      │   │
│  │  "Ever close the month—staring at the deposit screen, adding it up  │   │
│  │   twice—and still feel that quiet knot in your stomach, like you    │   │
│  │   worked another month for almost nothing?"                         │   │
│  │                                                                      │   │
│  │  [🔊 Listen]  [📝 Copy Script]                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🧠 WHY IT WORKS                                                     │   │
│  │                                                                      │   │
│  │  MECHANISM: Loss Aversion Activation                                │   │
│  │                                                                      │   │
│  │  This opening bypasses logical evaluation and hits the amygdala     │   │
│  │  directly. Key psychological triggers:                              │   │
│  │                                                                      │   │
│  │  • "Quiet knot" — Visceral, physical language creates felt          │   │
│  │    experience, not just intellectual understanding                  │   │
│  │                                                                      │   │
│  │  • "Adding it up twice" — Specific detail signals authenticity;     │   │
│  │    the merchant has DONE this exact thing                           │   │
│  │                                                                      │   │
│  │  • "Worked for almost nothing" — Frames the problem as injustice,   │   │
│  │    not just inefficiency. Unfairness is more motivating than loss.  │   │
│  │                                                                      │   │
│  │  Research basis: Kahneman's Prospect Theory shows losses feel 2x    │   │
│  │  more painful than equivalent gains. We activate loss BEFORE        │   │
│  │  presenting the solution.                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⏱️ WHEN TO USE THIS                                                 │   │
│  │                                                                      │   │
│  │  TIMING: First 25 seconds of any presentation or conversation       │   │
│  │                                                                      │   │
│  │  IN VIDEO BROCHURE: This plays automatically as the opener          │   │
│  │                                                                      │   │
│  │  IN PERSON: Use when the merchant gives you their attention.        │   │
│  │  Don't rush. Let the pause after "almost nothing" land.             │   │
│  │                                                                      │   │
│  │  ON A CALL: Adapt to: "Have you ever looked at your statement and   │   │
│  │  felt like something's not adding up?"                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ COMMON MISTAKES                                                  │   │
│  │                                                                      │   │
│  │  ✗ Rushing through it — The emotion needs time to land              │   │
│  │  ✗ Adding qualifiers — Don't say "some owners feel..." Be direct    │   │
│  │  ✗ Jumping to solution — Let them sit in the problem first          │   │
│  │  ✗ Flat delivery — Your tone should match the weight of the words   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎤 PRACTICE THIS                                                    │   │
│  │                                                                      │   │
│  │  Record yourself delivering this opening. Focus on:                 │   │
│  │  • Pace (slow, deliberate)                                          │   │
│  │  • Pause after "almost nothing"                                     │   │
│  │  • Tone (empathetic, not salesy)                                    │   │
│  │                                                                      │   │
│  │  [🎙️ Record Practice]  [▶️ Hear Example]                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                              [Mark Complete ✓]                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Feature 2: The "Why Behind the What" Deep Dives

For each major presentation element, provide expandable deep-dive sections:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔬 DEEP DIVE: Anchoring Psychology                              [Collapse] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHY WE USE SPECIFIC DOLLAR AMOUNTS                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  The script says "$17,412" — not "about $17,000" or "over $17K"            │
│                                                                             │
│  This precision serves multiple purposes:                                   │
│                                                                             │
│  1. CREDIBILITY SIGNAL                                                      │
│     Specific numbers feel calculated, not estimated. The merchant           │
│     unconsciously thinks "they actually ran the math."                      │
│                                                                             │
│  2. MEMORABILITY                                                            │
│     Round numbers slide off. Odd numbers stick. "$17,412" will be          │
│     remembered when "$17,000" would be forgotten.                           │
│                                                                             │
│  3. TANGIBLE CONVERSION                                                     │
│     "That's my truck payment" converts abstract fees into a                │
│     physical asset the merchant can visualize losing.                       │
│                                                                             │
│  HOW TO APPLY THIS:                                                         │
│  When you run a merchant's numbers, use the EXACT figure.                   │
│  "$847 per month" is more powerful than "about $850."                       │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  RESEARCH: Anchoring is one of the most robust findings in behavioral      │
│  economics. Tversky & Kahneman (1974) demonstrated that arbitrary          │
│  numbers influence subsequent judgments, even when people know the         │
│  anchor is irrelevant. Our anchors are highly relevant—making them         │
│  even more powerful.                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Feature 3: Psychological Trigger Reference Library

Searchable database of all psychological mechanisms used:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🧠 Psychological Trigger Library                    🔍 [Search triggers...] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FILTER BY: [All] [Loss Aversion] [Social Proof] [Authority] [Scarcity]   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LOSS AVERSION                                           [Expand ▼] │   │
│  │  "People feel losses 2x more than equivalent gains"                 │   │
│  │  Used in: Opening, Fee Quantification, Counterfactual               │   │
│  │  Example: "Like someone reached into the register..."               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ANCHORING                                               [Expand ▼] │   │
│  │  "First number heard influences all subsequent judgments"           │   │
│  │  Used in: Marcus story, Fee math, Profit Flywheel                   │   │
│  │  Example: "$17,412... That's my truck payment"                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  NARRATIVE TRANSPORT                                     [Expand ▼] │   │
│  │  "Story absorption bypasses analytical resistance"                  │   │
│  │  Used in: Mike's journey, Rosa's clarity, All merchant stories      │   │
│  │  Example: "Coffee going cold on the dash..."                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  IDENTITY ACTIVATION                                     [Expand ▼] │   │
│  │  "Once identity is activated, actions must be consistent"           │   │
│  │  Used in: 6 AM Scene, "You're the kind of owner..."                 │   │
│  │  Example: "You're not here because you're excited..."               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  COUNTERFACTUAL FEAR                                     [Expand ▼] │   │
│  │  "Vivid 'what if I don't act' scenarios create urgency"             │   │
│  │  Used in: "The Other Version" sequence                              │   │
│  │  Example: "Lisa would've left... locker cleaned out by Tuesday"     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  RISK REVERSAL                                           [Expand ▼] │   │
│  │  "Removing risk removes the last barrier to action"                 │   │
│  │  Used in: 90-Day Promise, "Pressure is on us"                       │   │
│  │  Example: "For years, you've taken the risk alone..."               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [View All 15 Triggers →]                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Feature 4: Objection Mastery Training

Complete objection catalog with psychological handling strategies:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚔️ Objection Mastery                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CRITICAL OBJECTIONS (Must Master First)                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  #1 "My customers will get mad / I'll lose customers"               │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │   │
│  │  SEVERITY: 🔴 CRITICAL — This stops more deals than any other       │   │
│  │                                                                      │   │
│  │  WHY MERCHANTS FEEL THIS:                                           │   │
│  │  They've built relationships over years. The thought of a regular  │   │
│  │  giving them "that look" at the register triggers social pain.     │   │
│  │                                                                      │   │
│  │  HOW THE PRESENTATION HANDLES IT:                                   │   │
│  │                                                                      │   │
│  │  1. ACKNOWLEDGMENT (Name the fear)                                  │   │
│  │     "What will my customers think? Good. That's the question every │   │
│  │      smart owner asks."                                             │   │
│  │                                                                      │   │
│  │  2. SOCIAL PROOF (Someone like them tried it)                       │   │
│  │     "Marcus asked it too, before he switched. First week, he       │   │
│  │      braced for complaints."                                        │   │
│  │                                                                      │   │
│  │  3. TIME DECAY (Fear fades faster than expected)                    │   │
│  │     "By week three, he stopped thinking about it."                  │   │
│  │                                                                      │   │
│  │  4. NORMALIZATION (It's already everywhere)                         │   │
│  │     "They see two prices at gas stations, auto shops, restaurants." │   │
│  │                                                                      │   │
│  │  5. MATH REFRAME (Risk is smaller than imagined)                    │   │
│  │     "You'd have to lose 1 in 4 to break even. Reality? 1 in 100."  │   │
│  │                                                                      │   │
│  │  6. REGRET REVERSAL (The only regret is waiting)                    │   │
│  │     "Only regret Marcus has now? Waiting six months worrying        │   │
│  │      about a conversation that never happened."                     │   │
│  │                                                                      │   │
│  │  YOUR PRACTICE RESPONSE:                                            │   │
│  │  "I get it — that's the first thing every smart owner asks. Let me │   │
│  │   tell you what actually happens. [Then flow through the sequence]" │   │
│  │                                                                      │   │
│  │  [🎤 Practice This Objection]  [📊 See Success Rate Data]           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  #2 "This is illegal / Visa will fine me"          [Expand ▼]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  #3 "I already use Square/Toast/Clover"            [Expand ▼]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  #4 "Contracts trap you / cancellation fees"       [Expand ▼]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SECONDARY OBJECTIONS                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [View all 15 objections with handling strategies →]                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Feature 5: AI Role-Play Simulator

Interactive practice with AI playing the merchant:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎭 Presentation Simulator                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO: First Meeting — Tire Shop Owner                                  │
│  DIFFICULTY: ⭐⭐⭐ Medium (Skeptical but open)                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  👤 MERCHANT (Tony - Auto Shop Owner)                               │   │
│  │  ────────────────────────────────────────────────────────────────   │   │
│  │  "Look, I've had three different reps come through here this       │   │
│  │   month. They all say they can save me money. What makes you       │   │
│  │   any different?"                                                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  YOUR RESPONSE:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  [Type your response here...]                                       │   │
│  │                                                                      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Send Response]    [💡 Get Hint]    [📖 See Recommended Approach]          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  COACHING PANEL                                                             │
│                                                                             │
│  TRIGGERS TO USE HERE:                                                      │
│  • Skepticism Permission ("Good. You should be skeptical.")                │
│  • Differentiation (Not lower rates — complete solution)                   │
│  • Proof Offer (Run the numbers, see the difference)                       │
│                                                                             │
│  WHAT NOT TO DO:                                                            │
│  ✗ Don't get defensive about other reps                                    │
│  ✗ Don't make vague "we're better" claims                                  │
│  ✗ Don't skip to rates without establishing the problem                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Scenario Library:**

| Scenario | Merchant Type | Difficulty | Key Challenge |
|----------|--------------|------------|---------------|
| Cold Walk-In | Restaurant Owner | ⭐⭐ | Getting attention |
| Skeptical Veteran | Auto Shop (20 yrs) | ⭐⭐⭐ | "Heard it all before" |
| Square Loyalist | Coffee Shop | ⭐⭐⭐ | System switching fear |
| Price Shopper | Convenience Store | ⭐⭐ | Rate-focused mindset |
| Spouse Delegation | Salon Owner | ⭐⭐⭐⭐ | "Need to ask my husband" |
| Contract Burned | Food Truck | ⭐⭐⭐ | Previous bad experience |
| Premium Concern | Boutique | ⭐⭐⭐⭐ | "My customers expect..." |
| Time Crusher | Busy Deli | ⭐⭐⭐⭐⭐ | Only has 2 minutes |

---

### Feature 6: Flow & Timing Mastery

Visual timeline showing emotional arc and transition points:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📈 Presentation Flow — Emotional Arc                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TENSION ↑                                                                  │
│     █                                                                       │
│     █ ████                                                                  │
│     █ ████ ███                    ████                                      │
│     █ ████ ███ █               ███████                                      │
│     █ ████ ███ █ █          ██████████  ███                                │
│  ───█─████─███─█─█─██────██████████████─███─████───────────────────────    │
│     █ ████ ███ █ █ ██ ██ █████████████  ███ ████ ████                      │
│     █ ████ ███ █ █ ██ ██ █████████████  ███ ████ ████ ████ ████            │
│  ───────────────────────────────────────────────────────────────────────    │
│  RELIEF ↓                                                                   │
│                                                                             │
│  ──┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬──   │
│    │    │    │    │    │    │    │    │    │    │    │    │    │    │      │
│   0:00 0:45 1:30 2:15 3:00 4:00 5:00 6:00 8:00 9:30 10:30 11:30 12:00     │
│    │    │    │    │    │    │    │    │    │    │    │    │    │          │
│    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼          │
│  Open Marcus 6AM  Opts Dual Mrs.J Skip Mike High- Fly-  Other Resolve    │
│  Hook Story Scene      Pricing     Ahead Intro lighter wheel Version      │
│                                                                             │
│  [Click any point to see what's happening and why]                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

KEY TRANSITIONS (Click to Learn):

┌──────────────────┬─────────────────────────────────────────────────────────┐
│ TRANSITION       │ WHAT'S HAPPENING                                        │
├──────────────────┼─────────────────────────────────────────────────────────┤
│ Problem → Hope   │ After maximum pain (Marcus/truck), introduce "3 ways"   │
│                  │ This is the first moment of agency — don't rush it      │
├──────────────────┼─────────────────────────────────────────────────────────┤
│ Solution → Fear  │ After presenting Dual Pricing, address customer fear    │
│                  │ Acknowledge before they have to voice it                │
├──────────────────┼─────────────────────────────────────────────────────────┤
│ Story → Math     │ Mike's emotional journey THEN Profit Flywheel numbers   │
│                  │ Heart first, head second                                │
├──────────────────┼─────────────────────────────────────────────────────────┤
│ Hope → Fear      │ "The Other Version" — counterfactual after flywheel    │
│                  │ They're feeling good; now show what they'd lose        │
├──────────────────┼─────────────────────────────────────────────────────────┤
│ Fear → Safety    │ 90-Day Promise immediately follows counterfactual       │
│                  │ Maximum motivation + zero risk = action                 │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

---

### Feature 7: Script Reference with Annotations

Full script browser with psychological annotations:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📜 Annotated Script Browser                     Video: [V1: Hello    ▼]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TOGGLE: [📝 Script Only] [🧠 With Psychology] [⏱️ With Timing]             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [0:00-0:25] THE VISCERAL OPENING                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                             │
│  "Ever close the month—staring at the deposit screen, adding it up         │
│   twice—and still feel that quiet knot in your stomach, like you worked    │
│   another month for almost nothing?"                                        │
│                                                                             │
│     🧠 MECHANISM: Loss Aversion Activation                                  │
│     📍 PURPOSE: Bypass logic, hit emotion first                            │
│     ⚡ KEY PHRASES:                                                         │
│        • "quiet knot" — visceral, physical                                 │
│        • "adding it up twice" — specific, authentic                        │
│        • "almost nothing" — injustice framing                              │
│                                                                             │
│  "You're not imagining it. And it's not because you're doing something     │
│   wrong. It's not your fault."                                              │
│                                                                             │
│     🧠 MECHANISM: Absolution / External Attribution                        │
│     📍 PURPOSE: Remove guilt, maintain self-esteem while accepting problem │
│     ⚡ KEY PHRASES:                                                         │
│        • "not your fault" — blame externalized to processors               │
│                                                                             │
│  "Something's taking a piece of every sale before you ever see it."        │
│                                                                             │
│     🧠 MECHANISM: Theft Reframe                                            │
│     📍 PURPOSE: Position fees as active taking, not passive cost           │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [0:25-0:45] FEE QUANTIFICATION                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                             │
│  "Every card you accept—dip, tap, swipe—three to four percent quietly      │
│   comes off the top. Not into your pocket. Not into your business.         │
│   Into someone else's."                                                     │
│                                                                             │
│     🧠 MECHANISM: Anaphora (Repetition) + Contrast                         │
│     📍 PURPOSE: Rhythmic emphasis on where money ISN'T going               │
│     ⚡ KEY PHRASES:                                                         │
│        • "dip, tap, swipe" — all methods = no escape                       │
│        • "Not into... Not into... Into..." — rhythmic contrast             │
│                                                                             │
│  [Continue reading ↓]                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Feature 8: Comprehension Quizzes

Knowledge checks after each module:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✅ Module 2 Quiz: Opening & Problem Awareness         Question 3 of 8     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHY does the script use "$17,412" instead of "about $17,000"?             │
│                                                                             │
│  ○ A) It's the exact number from Marcus's actual statement                 │
│                                                                             │
│  ○ B) Specific numbers create credibility and memorability;                │
│       round numbers feel estimated                                          │
│                                                                             │
│  ○ C) Legal requirements mandate exact figures                             │
│                                                                             │
│  ○ D) It's easier to remember odd numbers                                  │
│                                                                             │
│                                                                             │
│  [Submit Answer]                                                            │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Progress: ████████░░░░░░░░ 38%                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Quiz Question Types:**
- Multiple choice (concept understanding)
- Fill-in-the-blank (script memorization)
- Sequence ordering (presentation flow)
- Scenario matching (which technique for which situation)
- "What would you say?" (open response, AI graded)

---

### Feature 9: Progress Dashboard

Track learning progress and identify weak areas:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 Your Presentation Mastery Progress                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OVERALL MASTERY: 67%  ████████████████░░░░░░░░                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MODULE PROGRESS                                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ✅ Module 1: Psychology Foundation        100% ████████████████████ │   │
│  │  ✅ Module 2: Opening & Problem            95%  ███████████████████░ │   │
│  │  ✅ Module 3: Solution Positioning         88%  █████████████████░░░ │   │
│  │  🔄 Module 4: Objection Prevention         72%  ██████████████░░░░░░ │   │
│  │  🔄 Module 5: Story Proof                  45%  █████████░░░░░░░░░░░ │   │
│  │  ⬜ Module 6: Process & Risk Reversal       0%  ░░░░░░░░░░░░░░░░░░░░ │   │
│  │  ⬜ Module 7: Solution Fit                  0%  ░░░░░░░░░░░░░░░░░░░░ │   │
│  │  ⬜ Module 8: Close & Community             0%  ░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SKILL BREAKDOWN                                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Script Knowledge      ████████████████████░░ 85%                   │   │
│  │  Psychology Theory     █████████████████░░░░░ 78%                   │   │
│  │  Objection Handling    ██████████████░░░░░░░░ 65%    ⚠️ Focus Area  │   │
│  │  Timing & Flow         ████████████░░░░░░░░░░ 55%    ⚠️ Focus Area  │   │
│  │  Role-Play Performance ████████░░░░░░░░░░░░░░ 40%    🔴 Needs Work  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RECOMMENDED NEXT:                                                          │
│  → Complete Module 5 (Story Proof) — 3 lessons remaining                   │
│  → Practice "Customer will be mad" objection in simulator                  │
│  → Review Timing Deep Dive for flow mastery                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Feature 10: Quick Reference Cards

Printable/saveable cards for field use:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📇 Quick Reference Cards                              [Print All] [Save]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                  │
│  │  THE OPENING HOOK       │  │  THREE OPTIONS          │                  │
│  │  ───────────────────    │  │  ───────────────────    │                  │
│  │                         │  │                         │                  │
│  │  "Ever close the month  │  │  1. Interchange-Plus    │                  │
│  │   —staring at the       │  │     True cost + fixed   │                  │
│  │   deposit screen—and    │  │     For premium brands  │                  │
│  │   still feel that quiet │  │                         │                  │
│  │   knot in your          │  │  2. Surcharging         │                  │
│  │   stomach?"             │  │     ⚠️ Can't do debit   │                  │
│  │                         │  │     Federal law blocks  │                  │
│  │  WHY: Loss aversion     │  │                         │                  │
│  │  PAUSE after "stomach"  │  │  3. Dual Pricing ✓      │                  │
│  │                         │  │     Credit AND debit    │                  │
│  │  [📋 Copy] [🖨️ Print]   │  │     The complete fix    │                  │
│  └─────────────────────────┘  └─────────────────────────┘                  │
│                                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                  │
│  │  CUSTOMER FEAR HANDLER  │  │  THE 90-DAY PROMISE     │                  │
│  │  ───────────────────    │  │  ───────────────────    │                  │
│  │                         │  │                         │                  │
│  │  1. "Good question"     │  │  "For years, you've     │                  │
│  │  2. "Marcus asked too"  │  │   taken the risk alone. │                  │
│  │  3. "Week 1: braced"    │  │   So we're flipping     │                  │
│  │  4. "Week 3: forgot"    │  │   that."                │                  │
│  │  5. Gas station normal  │  │                         │                  │
│  │  6. "1 in 100, not 1/4" │  │  • Adjust or switch     │                  │
│  │  7. "Only regret:       │  │  • No cancellation fee  │                  │
│  │      waiting"           │  │  • No penalties         │                  │
│  │                         │  │  • Terms in writing     │                  │
│  │  [📋 Copy] [🖨️ Print]   │  │                         │                  │
│  └─────────────────────────┘  └─────────────────────────┘                  │
│                                                                             │
│  [View All 12 Cards →]                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### User Progress Schema

```javascript
const AgentProgressSchema = {
  agentId: string,
  
  // Module Progress
  modules: [{
    moduleId: string,
    status: 'not_started' | 'in_progress' | 'completed',
    percentComplete: number,
    lessons: [{
      lessonId: string,
      completed: boolean,
      completedAt: timestamp,
      practiceAttempts: number,
      practiceScore: number
    }],
    quizzes: [{
      quizId: string,
      attempts: number,
      bestScore: number,
      lastAttemptAt: timestamp
    }]
  }],
  
  // Skill Scores
  skills: {
    scriptKnowledge: number,      // 0-100
    psychologyTheory: number,     // 0-100
    objectionHandling: number,    // 0-100
    timingFlow: number,           // 0-100
    rolePlayPerformance: number   // 0-100
  },
  
  // Practice History
  rolePlaySessions: [{
    scenarioId: string,
    completedAt: timestamp,
    score: number,
    feedback: string,
    triggersUsed: [string],
    mistakesMade: [string]
  }],
  
  // Achievements
  badges: [string],
  
  // Overall
  overallMastery: number,
  lastActivityAt: timestamp,
  totalTimeSpent: number // minutes
};
```

### Content Schema

```javascript
const LessonSchema = {
  id: string,
  moduleId: string,
  title: string,
  order: number,
  
  // Content Sections
  concept: {
    title: string,
    body: string
  },
  script: {
    text: string,
    audioUrl: string | null,
    videoTimestamp: string
  },
  psychology: {
    mechanism: string,
    explanation: string,
    researchBasis: string | null
  },
  timing: {
    when: string,
    inVideo: string,
    inPerson: string,
    onCall: string
  },
  mistakes: [string],
  practicePrompt: string,
  
  // Metadata
  estimatedMinutes: number,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
};

const ObjectionSchema = {
  id: string,
  objection: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  merchantFeeling: string,
  
  handlingSequence: [{
    step: number,
    technique: string,
    script: string,
    psychology: string
  }],
  
  practiceResponse: string,
  
  whereInPresentation: [string], // Video/timestamp references
  relatedTriggers: [string]
};

const ScenarioSchema = {
  id: string,
  title: string,
  merchantName: string,
  businessType: string,
  difficulty: number, // 1-5
  
  setup: string,
  merchantPersonality: string,
  keyChallenge: string,
  
  conversationTree: [{
    merchantMessage: string,
    recommendedApproach: string,
    triggersToUse: [string],
    mistakesToAvoid: [string],
    nextStates: [string] // Possible branches
  }],
  
  successCriteria: [string]
};
```

---

## AI Integration

### Document Parsing

When documents are uploaded, the AI should:

1. **Parse the Script Document:**
   - Identify video sections (V1-V8)
   - Extract timestamped paragraphs
   - Identify speaker transitions
   - Extract merchant stories and names

2. **Parse the Persuasion Audit:**
   - Map psychological mechanisms to script sections
   - Extract objection catalog
   - Identify trigger patterns
   - Extract recommended patches/improvements

3. **Generate Cross-References:**
   - Link each script paragraph to its psychological analysis
   - Build objection → handling technique mappings
   - Create trigger → example mappings

### AI Chat Coach

```javascript
// System prompt for the AI coach
const coachSystemPrompt = `
You are an expert sales presentation coach for PCBancard's Dual Pricing program. 
You have deep knowledge of:

1. The complete 8-video presentation script
2. The psychological mechanisms behind each element
3. All 15+ objections and their handling sequences
4. The timing and flow of effective delivery

Your role is to:
- Answer questions about WHY elements work
- Help agents practice specific sections
- Provide feedback on their delivery
- Suggest improvements based on psychological principles

Always reference specific script language and explain the underlying psychology.
Be encouraging but precise in your feedback.
`;
```

### Role-Play AI

```javascript
// Merchant persona configuration
const merchantPersonas = {
  skepticalVeteran: {
    traits: ['been burned before', 'direct', 'time-conscious'],
    objectionPatterns: ['heard it all before', 'what makes you different'],
    buyingSignals: ['asks specific questions', 'mentions current problems'],
    difficultyLevel: 3
  },
  squareLoyalist: {
    traits: ['tech-forward', 'values simplicity', 'brand loyal'],
    objectionPatterns: ['I love my system', 'don\'t want to switch'],
    buyingSignals: ['mentions fees frustration', 'asks about integration'],
    difficultyLevel: 3
  },
  // ... more personas
};
```

---

## Mobile Considerations

1. **Lesson cards** instead of long-scroll on mobile
2. **Audio playback** for script sections (hands-free learning)
3. **Quick quiz mode** for commute/downtime
4. **Offline access** to reference cards
5. **Voice recording** for practice with playback
6. **Swipe navigation** between lessons

---

## Gamification Elements

### Badges

| Badge | Requirement |
|-------|-------------|
| 🎯 Problem Master | Complete Module 2 with 90%+ |
| 🛡️ Objection Slayer | Handle all 4 critical objections in simulator |
| 📖 Script Scholar | 100% on script knowledge quiz |
| 🧠 Psychology Pro | Complete all Deep Dives |
| 🎭 Role-Play Rookie | Complete 5 simulations |
| 🎭 Role-Play Expert | Score 85%+ on 10 simulations |
| ⚡ Speed Learner | Complete 3 modules in one day |
| 🏆 Presentation Master | 100% overall mastery |

### Leaderboard (Optional)

- Weekly completion rankings
- Quiz score rankings
- Role-play performance rankings
- Team comparisons (for managers)

---

## Integration Points

### With Recruitment System
- New agent onboarding automatically assigns Module 1
- Training completion status visible in candidate pipeline
- Manager dashboard shows team training progress

### With Q&A Chatbot
- Link from chatbot answers to relevant training modules
- "Learn more about this" deeplinks

### With Income Estimator
- After completing training, show personalized income projection
- "Now that you know the presentation, see what you can earn"

---

## Success Metrics

Track and display:
- Average time to complete training
- Quiz score distributions
- Most-failed quiz questions (content improvement signal)
- Role-play scenario completion rates
- Correlation between training completion and field performance

---

## Implementation Priority

### Phase 1 (MVP)
1. Lesson player with script + psychology
2. Quiz system
3. Progress tracking
4. Quick reference cards

### Phase 2
1. AI role-play simulator
2. Flow visualization
3. Deep dive library
4. Audio/video integration

### Phase 3
1. Gamification (badges, leaderboard)
2. Manager dashboard
3. Performance correlation
4. Advanced analytics
