# PCBancard "Teach Me the Presentation" - Complete Update Package
## For Replit AI Agent Implementation

---

# OVERVIEW

You are updating the "Teach Me the Presentation" training section in the PCBancard Field Sales Intelligence app. This guide ensures you make changes safely without breaking existing functionality.

## What This Update Does:
1. **Brand Cleanup**: Removes all references to "Propelr", "SignaPay", "PayLo" → replaces with "PCBancard" and "Dual Pricing"
2. **Enhanced Content**: Adds psychology explanations, practice drills, AI coaching prompts, and quizzes
3. **New UI Components**: Knowledge checks, practice sections, psychology tags (all backward-compatible)

---

# PHASE 1: RECONNAISSANCE (DO FIRST - BEFORE ANY CHANGES)

## 1.1 Search for Old Brand Names

Run these commands and document every match:

```bash
grep -rn -i "propelr" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.css"
grep -rn -i "signapay" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.css"  
grep -rn -i "paylo" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.css"
```

## 1.2 Find Training Data Files

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) | xargs grep -l -i "lesson\|module\|talktrack\|whyItWorks"
```

## 1.3 Document Current Schema

Open the data file and record:
- What interface/type defines a Lesson?
- What fields does it have?
- How are modules structured?
- What IDs are used for routes?

## 1.4 Find UI Components

```bash
grep -rn "Lesson\|Module\|talkTrack\|whyItWorks" --include="*.tsx" --include="*.jsx" | head -50
```

---

# PHASE 2: BRAND REPLACEMENTS

## 2.1 Replacement Rules (EXACT)

| Find | Replace With |
|------|--------------|
| `Propelr` | `PCBancard` |
| `Propeller` | `PCBancard` |
| `propelr` | `PCBancard` |
| `SignaPay` | `PCBancard` |
| `Signapay` | `PCBancard` |
| `signapay` | `PCBancard` |
| `PayLo` | `Dual Pricing` |
| `PAYLO` | `Dual Pricing` |
| `paylo` | `Dual Pricing` |
| `Pay-Lo` | `Dual Pricing` |

## 2.2 Format Standards

**PCBancard**: Capital P, capital C, capital B, lowercase "ancard". NO spaces.
- ✅ `PCBancard`
- ❌ `PC Bancard`, `Pcbancard`, `pcbancard`

**Dual Pricing**: Capital D, capital P, with space.
- ✅ `Dual Pricing`
- ❌ `DualPricing`, `dual pricing`, `Dual-Pricing`

## 2.3 Standard Definitions

Use this exact text when explaining Dual Pricing:
> "With Dual Pricing, you offer two prices—one for cash, one for cards. It's fully automated. The system does the math. Customers see both options and decide how they want to pay."

For fee percentages, use: "3 to 4 percent" (not "2 to 3 percent")

## 2.4 Verify Zero Remaining

After replacements, this MUST return nothing:
```bash
grep -rn -i "propelr\|signapay\|paylo" --include="*.ts" --include="*.tsx" --include="*.json"
```

---

# PHASE 3: SCHEMA UPDATES

## 3.1 Extended Lesson Interface

Add these OPTIONAL fields to the existing Lesson interface:

```typescript
interface Lesson {
  // KEEP ALL EXISTING FIELDS (id, title, script/talkTrack, whyItWorks, etc.)
  
  // ADD THESE NEW OPTIONAL FIELDS:
  psychologyTag?: string;
  
  keyQuestions?: Array<{
    question: string;
    purpose: string;
  }>;
  
  whyItWorksEnhanced?: {
    merchantMindset: string;
    commonMistake: string;
    howPhrasingPreventsResistance: string;
    skipConsequence: string;
  };
  
  practice?: {
    title: string;
    duration: string;
    steps: string[];
    roleplayPrompt: string;
    badExample: string;
    goodExample: string;
    aiCoachingPrompt: string;
  };
  
  knowledgeCheck?: Array<{
    id: string;
    question: string;
    type: 'multiple_choice' | 'short_answer' | 'scenario';
    options?: string[];
    correctAnswer: number | string;
    explanation: string;
  }>;
}

interface Module {
  // KEEP ALL EXISTING FIELDS
  
  // ADD THESE NEW OPTIONAL FIELDS:
  description?: string;
  objectives?: string[];
  masteryQuiz?: Array<{
    id: string;
    question: string;
    type: 'multiple_choice' | 'short_answer' | 'scenario';
    options?: string[];
    correctAnswer: number | string;
    explanation: string;
  }>;
  passStandard?: string;
}
```

---

# PHASE 4: UI COMPONENTS

## 4.1 Psychology Tag Component

```tsx
// Add to lesson display - only shows if psychologyTag exists
{lesson.psychologyTag && (
  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 border border-purple-300 rounded-full text-sm text-purple-700 mb-4">
    <span>🧠</span>
    <span>{lesson.psychologyTag}</span>
  </div>
)}
```

## 4.2 Key Questions Section

```tsx
{lesson.keyQuestions && lesson.keyQuestions.length > 0 && (
  <section className="mt-6">
    <h3 className="font-semibold text-lg mb-3">Key Questions to Ask</h3>
    <div className="space-y-3">
      {lesson.keyQuestions.map((q, i) => (
        <div key={i} className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r">
          <p className="font-medium">{q.question}</p>
          <p className="text-sm text-gray-600 mt-1">{q.purpose}</p>
        </div>
      ))}
    </div>
  </section>
)}
```

## 4.3 Enhanced Why It Works

```tsx
{lesson.whyItWorksEnhanced ? (
  <section className="mt-6">
    <h3 className="font-semibold text-lg mb-3">Why It Works</h3>
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded">
        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Merchant's Mindset</h4>
        <p>{lesson.whyItWorksEnhanced.merchantMindset}</p>
      </div>
      <div className="p-4 bg-red-50 rounded">
        <h4 className="text-sm font-medium text-red-500 uppercase tracking-wide mb-2">Common Mistake</h4>
        <p>{lesson.whyItWorksEnhanced.commonMistake}</p>
      </div>
      <div className="p-4 bg-green-50 rounded">
        <h4 className="text-sm font-medium text-green-600 uppercase tracking-wide mb-2">How Phrasing Prevents Resistance</h4>
        <p>{lesson.whyItWorksEnhanced.howPhrasingPreventsResistance}</p>
      </div>
      <div className="p-4 bg-orange-50 rounded">
        <h4 className="text-sm font-medium text-orange-600 uppercase tracking-wide mb-2">What Happens If You Skip This</h4>
        <p>{lesson.whyItWorksEnhanced.skipConsequence}</p>
      </div>
    </div>
  </section>
) : lesson.whyItWorks && (
  // FALLBACK: Render existing whyItWorks as before (backward compatible)
  <section className="mt-6">
    <h3 className="font-semibold text-lg mb-3">Why It Works</h3>
    <p>{lesson.whyItWorks}</p>
  </section>
)}
```

## 4.4 Practice Section

```tsx
{lesson.practice && (
  <section className="mt-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl">
    <h3 className="font-semibold text-lg mb-4">🎯 Practice This</h3>
    
    <div className="flex justify-between items-center mb-4">
      <span className="font-medium">{lesson.practice.title}</span>
      <span className="text-sm text-gray-600">⏱️ {lesson.practice.duration}</span>
    </div>
    
    <div className="mb-4">
      <h4 className="font-medium mb-2">Steps:</h4>
      <ol className="list-decimal list-inside space-y-1">
        {lesson.practice.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
    
    <div className="mb-4 p-4 bg-white rounded border-l-4 border-blue-500">
      <h4 className="font-medium mb-2">Roleplay Prompt:</h4>
      <p className="italic">"{lesson.practice.roleplayPrompt}"</p>
    </div>
    
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h4 className="font-medium text-red-700 mb-2">❌ Bad Example:</h4>
        <p className="text-sm">{lesson.practice.badExample}</p>
      </div>
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <h4 className="font-medium text-green-700 mb-2">✅ Good Example:</h4>
        <p className="text-sm">{lesson.practice.goodExample}</p>
      </div>
    </div>
    
    <div className="p-4 bg-slate-100 rounded">
      <h4 className="font-medium mb-2">AI Coaching Prompt:</h4>
      <p className="text-sm text-gray-600 mb-2">Copy this prompt into the dictation box to get AI feedback:</p>
      <div className="relative">
        <pre className="p-3 bg-slate-800 text-slate-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
          {lesson.practice.aiCoachingPrompt}
        </pre>
        <button 
          onClick={() => navigator.clipboard.writeText(lesson.practice.aiCoachingPrompt)}
          className="absolute top-2 right-2 px-2 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-500"
        >
          📋 Copy
        </button>
      </div>
    </div>
  </section>
)}
```

## 4.5 Knowledge Check Quiz

```tsx
// Create as a separate component file: KnowledgeCheck.tsx

import { useState } from 'react';

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'short_answer' | 'scenario';
  options?: string[];
  correctAnswer: number | string;
  explanation: string;
}

export function KnowledgeCheck({ questions, title = "Knowledge Check" }: { questions: QuizQuestion[], title?: string }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  
  const handleSelect = (qId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [qId]: answer }));
    setRevealed(prev => ({ ...prev, [qId]: true }));
  };
  
  return (
    <section className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="font-semibold text-lg mb-4">📝 {title}</h3>
      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Question {idx + 1}</p>
            <p className="font-medium mb-3">{q.question}</p>
            
            {q.type === 'multiple_choice' && q.options && (
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => (
                  <button
                    key={optIdx}
                    onClick={() => handleSelect(q.id, optIdx)}
                    disabled={revealed[q.id]}
                    className={`w-full text-left p-3 border rounded transition-colors ${
                      revealed[q.id] && optIdx === q.correctAnswer
                        ? 'bg-green-100 border-green-500'
                        : answers[q.id] === optIdx && revealed[q.id]
                        ? 'bg-red-100 border-red-500'
                        : 'bg-white border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            
            {q.type === 'short_answer' && (
              <div>
                <textarea 
                  className="w-full p-3 border border-gray-200 rounded mb-2"
                  placeholder="Type your answer..."
                  rows={3}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                />
                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [q.id]: true }))}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Check Answer
                </button>
              </div>
            )}
            
            {revealed[q.id] && (
              <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                {q.type === 'short_answer' && (
                  <p className="mb-2"><strong>Model Answer:</strong> {q.correctAnswer}</p>
                )}
                <p><strong>Explanation:</strong> {q.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// Usage in lesson component:
// {lesson.knowledgeCheck && <KnowledgeCheck questions={lesson.knowledgeCheck} />}
```

---

# PHASE 5: CONTENT DATA

## 5.1 Module Structure (8 Modules)

```
Module 1: Psychology Foundation (3 lessons)
Module 2: Opening and Problem Awareness (4 lessons)  
Module 3: Solution Positioning (3 lessons)
Module 4: Objection Prevention (3 lessons)
Module 5: Story, Proof, and Transformation (3 lessons)
Module 6: Process and Risk Reversal (3 lessons)
Module 7: Solution Fit - Contextual (3 lessons)
Module 8: Closing and Community (3 lessons)
```

## 5.2 Sample Lesson Data (Module 2, Lesson 1)

```typescript
{
  id: 'lesson-2-1',  // KEEP EXISTING ID
  title: 'The Visceral Opening',
  psychologyTag: 'Loss Aversion Anchoring',
  
  whatYoullLearn: [
    "How to make merchants FEEL their losses before seeing numbers",
    "The exact words that bypass logical resistance",
    "Why 'it's not your fault' is the most powerful line"
  ],
  
  talkTrack: `Ever close the month—staring at the deposit screen, adding it up twice—and still feel that quiet knot in your stomach? Like you worked another month for almost nothing?

You're not imagining it. And it's not because you're doing something wrong. It's not your fault.

Something's taking a piece of every sale before you ever see it. Most owners don't know how much. The ones who find out get quiet for a second—like they're adding up years of work they never got paid for.`,
  
  keyQuestions: [
    {
      question: "Ever have that feeling at the end of the month—looking at the deposit and knowing something's off?",
      purpose: "Invites them to share their own version of the feeling"
    },
    {
      question: "Do you know what you're actually paying to accept cards?",
      purpose: "Plants curiosity without sounding like a pitch"
    }
  ],
  
  whyItWorksEnhanced: {
    merchantMindset: "They've normalized fees as 'cost of business.' This de-normalizes it by connecting to daily emotional experience.",
    commonMistake: "Starting with facts and percentages. '3-4%' is abstract. 'Knot in your stomach' is visceral.",
    howPhrasingPreventsResistance: "'It's not your fault' removes shame. 'Most owners don't know' normalizes their ignorance.",
    skipConsequence: "Without emotional activation, everything that follows is just information. Information doesn't drive decisions—feelings do."
  },
  
  whenToUse: "First 30-60 seconds of any presentation. Before ANY mention of rates, programs, or savings.",
  
  commonMistakes: [
    "Jumping to '3-4%' before they feel the loss",
    "Saying 'I can save you money' (sounds like a pitch)",
    "Skipping 'it's not your fault' (leaves shame barrier in place)"
  ],
  
  practice: {
    title: "60-Second Emotion Drill",
    duration: "3 minutes",
    steps: [
      "Set a 60-second timer",
      "Deliver the visceral opening without mentioning Dual Pricing, savings, or any solution",
      "If you mention ANY solution before 60 seconds, restart",
      "Record yourself and listen: Does it sound like a pitch or a conversation?"
    ],
    roleplayPrompt: "I'm the merchant. Make me FEEL my problem without telling me about your product.",
    badExample: "I'm with PCBancard and we have a program that can save you 3-4% on every transaction.",
    goodExample: "Ever close the month, look at your deposit, and feel like something's missing? Like you worked harder than the number shows?",
    aiCoachingPrompt: "You are the merchant. I will deliver my opening. Do NOT let me talk about any solution for the first 60 seconds. If I mention Dual Pricing, savings, rates, or any product, interrupt me and say 'You're pitching already—I don't trust pitches.' Score me 1-10 on: (1) Did I make you FEEL something? (2) Did I avoid pitching? (3) Did I make it about YOU?"
  },
  
  knowledgeCheck: [
    {
      id: 'q2-1-1',
      question: "What makes 'knot in your stomach' more effective than '3-4%'?",
      type: 'multiple_choice',
      options: [
        "It's more dramatic",
        "It connects to an emotion they've actually felt, not abstract math",
        "It sounds more professional",
        "It's easier to remember"
      ],
      correctAnswer: 1,
      explanation: "Visceral language connects to real emotional experience. Percentages are abstract; physical sensations are felt."
    },
    {
      id: 'q2-1-2',
      question: "Why is 'it's not your fault' powerful?",
      type: 'short_answer',
      correctAnswer: "It removes shame. Merchants often feel stupid for not knowing what they're paying. By removing blame, you lower the defensive barrier.",
      explanation: "Shame creates defensiveness. 'It's not your fault' turns potential embarrassment into shared understanding."
    }
  ]
}
```

---

# PHASE 6: TESTING CHECKLIST

## 6.1 Build Test
```bash
npm run build  # Must succeed with no errors
```

## 6.2 Brand Verification
```bash
grep -rn -i "propelr\|signapay\|paylo" --include="*.ts" --include="*.tsx" --include="*.json"
# Must return NOTHING
```

## 6.3 Manual Testing

```
□ Module 1 loads
□ Module 2 loads  
□ Module 3 loads
□ Module 4 loads
□ Module 5 loads
□ Module 6 loads
□ Module 7 loads
□ Module 8 loads
□ All lessons render
□ TTS (speaker) works
□ Copy button works
□ Dictation box works
□ AI Feedback works
□ Navigation works
□ Mark Complete works
□ Progress tracking works
□ Psychology tags show
□ Key Questions section shows
□ Practice sections show  
□ Quiz questions work
□ Mobile layout works
□ "PCBancard" displays correctly
□ "Dual Pricing" displays correctly
□ Fee range is "3 to 4%"
```

---

# CHANGE LOG TEMPLATE

After completing all changes, document them:

```markdown
## Change Log - [DATE]

### Files Modified:
- [list all files]

### Brand Replacements:
- X occurrences of "Propelr" → "PCBancard"
- X occurrences of "SignaPay" → "PCBancard"
- X occurrences of "PayLo" → "Dual Pricing"

### Schema Changes:
- Added optional fields: psychologyTag, keyQuestions, whyItWorksEnhanced, practice, knowledgeCheck

### New Components:
- KnowledgeCheck.tsx
- Updated lesson rendering with conditional sections

### Not Changed:
- File structure
- Routing
- Existing IDs
- TTS implementation
- Copy functionality
- Dictation functionality

### Testing Completed:
- Build: ✅
- Brand verification: ✅
- Manual testing: ✅
```

---

# CRITICAL SAFETY RULES

1. **PRESERVE IDs** - Existing lesson and module IDs must not change (routes depend on them)
2. **ADD, DON'T REMOVE** - Add new optional fields; never remove existing fields
3. **CONDITIONAL RENDERING** - New UI only shows when new data exists
4. **BACKWARD COMPATIBLE** - App must work even if new fields are empty
5. **TEST INCREMENTALLY** - Test after each major change
6. **ZERO OLD BRANDS** - Triple-check that Propelr/SignaPay/PayLo are completely gone
