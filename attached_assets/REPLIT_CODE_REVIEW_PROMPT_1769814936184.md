# Replit: Use Claude Opus 4.5 to Review All Code

Copy this prompt into Replit. Your Anthropic API key is already saved in Secrets.

---

## PROMPT START

Build a code review system using Claude Opus 4.5. The API key is stored in Replit Secrets as `ANTHROPIC_API_KEY`.

**Create this file: `code-reviewer.js`**

```javascript
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Use Claude Opus 4.5 - the most advanced model
const MODEL = 'claude-opus-4-20250514';

// Get all code files recursively
function getAllFiles(dir, extensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json']) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
        files.push(...getAllFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

// Main review function
async function reviewAllCode() {
  console.log('🔍 CLAUDE OPUS 4.5 CODE REVIEW\n');
  
  const files = getAllFiles('.');
  console.log(`Found ${files.length} files to review\n`);
  
  // Build code context
  let codeContext = '';
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.length < 50000) { // Skip very large files
      codeContext += `\n### FILE: ${file}\n\`\`\`\n${content}\n\`\`\`\n`;
    }
  }
  
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 12000,
    messages: [{
      role: 'user',
      content: `You are an expert code reviewer. Analyze this entire codebase thoroughly.

${codeContext}

---

## PROVIDE A COMPREHENSIVE CODE REVIEW:

### 🔴 CRITICAL ERRORS
Issues that will crash the app or cause security problems:
- For each: File, Line, Problem, Fix

### 🟠 BUGS & LOGIC ERRORS  
Code that will behave incorrectly:
- For each: File, Line, Problem, Fix

### 🟡 CODE QUALITY ISSUES
Maintainability and best practice problems:
- Duplicated code
- Functions too long
- Poor naming
- Missing types
- Dead code

### 🟢 PERFORMANCE IMPROVEMENTS
- Unnecessary re-renders
- Missing memoization
- Inefficient algorithms
- Bundle size issues

### 🔵 SECURITY RECOMMENDATIONS
- Input validation
- Authentication
- Data exposure
- API security

### 📊 SUMMARY
- Total issues by severity
- Code quality score (1-10)
- Top 5 priority fixes
- Architecture suggestions

Be specific with file names and line numbers. Provide actual code fixes.`
    }]
  });
  
  const review = response.content[0].text;
  
  // Save to file
  const date = new Date().toISOString().split('T')[0];
  fs.writeFileSync(`code-review-${date}.md`, `# Code Review - ${date}\n\n${review}`);
  
  console.log(review);
  console.log(`\n✅ Review saved to code-review-${date}.md`);
}

reviewAllCode().catch(console.error);
```

---

## RUN THE REVIEW

```bash
# Install the SDK first
npm install @anthropic-ai/sdk

# Run the review
node code-reviewer.js
```

---

## ADD TO PACKAGE.JSON

```json
{
  "scripts": {
    "review": "node code-reviewer.js"
  }
}
```

Then just run: `npm run review`

---

## WHAT IT CHECKS

| Category | What Claude Looks For |
|----------|----------------------|
| 🔴 Critical | Crashes, security holes, data loss |
| 🟠 Bugs | Logic errors, null handling, race conditions |
| 🟡 Quality | DRY violations, complexity, naming |
| 🟢 Performance | Re-renders, memoization, algorithms |
| 🔵 Security | Injection, XSS, exposed secrets |

---

## SAMPLE OUTPUT

```markdown
# Code Review - 2026-01-30

### 🔴 CRITICAL ERRORS

**File: src/api/signnow.js, Line 45**
- Problem: API key hardcoded in source
- Fix: Move to environment variable
```javascript
// Before
const API_KEY = 'sk-abc123';

// After  
const API_KEY = process.env.SIGNNOW_API_KEY;
```

### 🟠 BUGS

**File: src/components/Form.jsx, Line 78**
- Problem: Missing null check on user object
- Fix:
```javascript
// Before
const name = user.name;

// After
const name = user?.name || 'Unknown';
```

### 📊 SUMMARY
- Critical: 2
- Bugs: 5  
- Quality: 12
- Performance: 3
- Score: 7/10
- Top Fix: Remove hardcoded API keys immediately
```

---

## PROMPT END
