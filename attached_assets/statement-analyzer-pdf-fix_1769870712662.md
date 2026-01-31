# URGENT FIX: Statement Analyzer — PDF Text Extraction Failing

## Current Error

```
500: {"error":"No text could be extracted from the files"}
```

## The Problem

The PDF has text (it's a CardConnect statement with clear data), but pdf-parse is failing. This is usually caused by:

1. **pdf-parse not installed** or wrong version
2. **Buffer not passed correctly** (getting undefined or empty)
3. **pdf-parse crashing silently** on certain PDF formats
4. **File path vs buffer confusion** — reading wrong thing

---

## Step 1: Add Diagnostic Logging

First, find where the extraction happens and add this logging:

```javascript
async function extractTextFromPDF(file) {
  console.log('=== PDF EXTRACTION DEBUG ===');
  
  // Log what we received
  console.log('File object keys:', Object.keys(file));
  console.log('File details:', {
    name: file.originalname || file.name || 'unknown',
    size: file.size,
    mimetype: file.mimetype || file.type,
    hasBuffer: !!file.buffer,
    hasPath: !!file.path,
    bufferLength: file.buffer?.length
  });
  
  // Get buffer - try multiple methods
  let buffer;
  
  if (file.buffer && file.buffer.length > 0) {
    buffer = file.buffer;
    console.log('Using file.buffer directly');
  } else if (file.path) {
    const fs = require('fs');
    if (fs.existsSync(file.path)) {
      buffer = fs.readFileSync(file.path);
      console.log('Read buffer from file.path:', file.path);
    } else {
      console.error('File path does not exist:', file.path);
    }
  } else if (typeof file === 'string') {
    // Maybe we got a path string directly
    const fs = require('fs');
    if (fs.existsSync(file)) {
      buffer = fs.readFileSync(file);
      console.log('Read buffer from path string');
    }
  }
  
  if (!buffer) {
    console.error('FAILED: Could not get buffer from file');
    throw new Error('Could not read file buffer');
  }
  
  console.log('Buffer obtained, length:', buffer.length);
  console.log('First 20 bytes:', buffer.slice(0, 20).toString('hex'));
  
  // Check if it's actually a PDF
  const header = buffer.slice(0, 5).toString();
  console.log('File header:', header);
  
  if (header !== '%PDF-') {
    console.error('WARNING: File does not start with %PDF- header');
    console.log('Actual header bytes:', buffer.slice(0, 10).toString('hex'));
  }
  
  // Now try extraction...
}
```

---

## Step 2: Robust PDF Extraction with Fallbacks

```javascript
const fs = require('fs');
const path = require('path');

// We'll try multiple methods
let pdfParse;
try {
  pdfParse = require('pdf-parse');
  console.log('pdf-parse loaded successfully');
} catch (e) {
  console.error('pdf-parse not available:', e.message);
}

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
  console.log('Anthropic SDK loaded successfully');
} catch (e) {
  console.error('Anthropic SDK not available:', e.message);
}

/**
 * Extract text from PDF with multiple fallback methods
 */
async function extractPDFText(fileInput) {
  // Normalize input to buffer
  const buffer = await getBuffer(fileInput);
  
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty or invalid file buffer');
  }
  
  console.log(`Processing PDF: ${buffer.length} bytes`);
  
  // Method 1: Try pdf-parse
  if (pdfParse) {
    try {
      console.log('Attempting pdf-parse extraction...');
      const result = await pdfParse(buffer);
      
      if (result.text && result.text.trim().length > 50) {
        console.log(`pdf-parse SUCCESS: extracted ${result.text.length} chars`);
        return {
          method: 'pdf-parse',
          text: result.text,
          pages: result.numpages,
          info: result.info
        };
      } else {
        console.log('pdf-parse returned insufficient text:', result.text?.length || 0);
      }
    } catch (parseError) {
      console.error('pdf-parse FAILED:', parseError.message);
    }
  }
  
  // Method 2: Try Claude's native PDF support
  if (Anthropic) {
    try {
      console.log('Attempting Claude PDF extraction...');
      const text = await extractWithClaude(buffer);
      
      if (text && text.length > 50) {
        console.log(`Claude SUCCESS: extracted ${text.length} chars`);
        return {
          method: 'claude-vision',
          text: text
        };
      }
    } catch (claudeError) {
      console.error('Claude extraction FAILED:', claudeError.message);
    }
  }
  
  // Method 3: Try pdfjs-dist (if available)
  try {
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    console.log('Attempting pdfjs-dist extraction...');
    
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    let text = '';
    
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    
    if (text.trim().length > 50) {
      console.log(`pdfjs-dist SUCCESS: extracted ${text.length} chars`);
      return {
        method: 'pdfjs-dist',
        text: text,
        pages: doc.numPages
      };
    }
  } catch (pdfjsError) {
    console.log('pdfjs-dist not available or failed:', pdfjsError.message);
  }
  
  // All methods failed
  throw new Error('All PDF extraction methods failed. The PDF may be image-based or corrupted.');
}

/**
 * Get buffer from various input types
 */
async function getBuffer(input) {
  // Already a buffer
  if (Buffer.isBuffer(input)) {
    return input;
  }
  
  // Multer file object
  if (input.buffer) {
    return input.buffer;
  }
  
  // File with path (multer disk storage)
  if (input.path && fs.existsSync(input.path)) {
    return fs.readFileSync(input.path);
  }
  
  // Raw path string
  if (typeof input === 'string' && fs.existsSync(input)) {
    return fs.readFileSync(input);
  }
  
  // ArrayBuffer or Uint8Array (from browser)
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  
  if (input instanceof Uint8Array) {
    return Buffer.from(input);
  }
  
  // Base64 string
  if (typeof input === 'string' && input.length > 100) {
    // Check if it's base64
    if (/^[A-Za-z0-9+/]+=*$/.test(input.replace(/\s/g, ''))) {
      return Buffer.from(input, 'base64');
    }
  }
  
  console.error('Unknown input type:', typeof input, Object.keys(input || {}));
  return null;
}

/**
 * Use Claude to extract text from PDF
 */
async function extractWithClaude(buffer) {
  const anthropic = new Anthropic();
  const base64 = buffer.toString('base64');
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64
            }
          },
          {
            type: "text",
            text: "Extract ALL text from this PDF document. Return the complete text content, preserving the structure as much as possible. Include all numbers, dates, and data."
          }
        ]
      }
    ]
  });
  
  return response.content[0].text;
}

module.exports = { extractPDFText, getBuffer };
```

---

## Step 3: Complete Statement Analyzer

```javascript
const { extractPDFText, getBuffer } = require('./pdf-extractor');

/**
 * Analyze a merchant processing statement
 */
async function analyzeStatement(file) {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic();
  
  // Step 1: Get the file extension
  const filename = file.originalname || file.name || 'unknown.pdf';
  const ext = path.extname(filename).toLowerCase();
  
  console.log(`Analyzing: ${filename} (${ext})`);
  
  // Step 2: Handle based on file type
  let analysisInput;
  
  if (ext === '.pdf') {
    // Extract text from PDF
    const extraction = await extractPDFText(file);
    console.log(`Extraction method: ${extraction.method}`);
    
    if (extraction.method === 'claude-vision') {
      // Already processed by Claude, now just structure it
      analysisInput = { type: 'text', content: extraction.text };
    } else {
      analysisInput = { type: 'text', content: extraction.text };
    }
    
  } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    // Image - must use vision
    const buffer = await getBuffer(file);
    const base64 = buffer.toString('base64');
    const mimeType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', 
      '.png': 'image/png',
      '.webp': 'image/webp'
    }[ext];
    
    analysisInput = { type: 'image', base64, mimeType };
    
  } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
    // Spreadsheet - parse directly
    const XLSX = require('xlsx');
    const buffer = await getBuffer(file);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    let text = '';
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      text += `=== Sheet: ${sheetName} ===\n`;
      text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
    }
    
    analysisInput = { type: 'text', content: text };
    
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
  
  // Step 3: Send to Claude for structured extraction
  let messages;
  
  if (analysisInput.type === 'text') {
    messages = [
      {
        role: "user",
        content: `Analyze this merchant processing statement and extract all data.

STATEMENT CONTENT:
${analysisInput.content}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "merchant": {
    "name": "string",
    "address": "string",
    "merchant_number": "string"
  },
  "processor": "string",
  "statement_period": {
    "start": "string",
    "end": "string"
  },
  "summary": {
    "total_volume": number,
    "total_transactions": number,
    "total_fees": number,
    "effective_rate_percent": number,
    "amount_funded": number
  },
  "card_breakdown": [
    {
      "card_type": "string",
      "volume": number,
      "transactions": number,
      "average_ticket": number
    }
  ],
  "fee_summary": {
    "interchange": number,
    "markup_discount": number,
    "dues_assessments": number,
    "per_item_fees": number,
    "monthly_fees": number,
    "other_fees": number
  },
  "detailed_fees": [
    {
      "description": "string",
      "amount": number
    }
  ]
}`
      }
    ];
  } else {
    // Image input
    messages = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: analysisInput.mimeType,
              data: analysisInput.base64
            }
          },
          {
            type: "text",
            text: `This is a photo of a merchant processing statement. Analyze it and extract all visible data.

Return ONLY valid JSON with: merchant info, statement period, total volume, transactions, fees, effective rate, card breakdown, and fee details.`
          }
        ]
      }
    ];
  }
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: messages
  });
  
  // Parse response
  const content = response.content[0].text;
  
  // Extract JSON (handle potential markdown wrapping)
  let jsonStr = content;
  
  // Remove markdown code blocks if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Try to find raw JSON
    const rawMatch = content.match(/\{[\s\S]*\}/);
    if (rawMatch) {
      jsonStr = rawMatch[0];
    }
  }
  
  try {
    const data = JSON.parse(jsonStr);
    return {
      success: true,
      data: data
    };
  } catch (parseError) {
    console.error('JSON parse error:', parseError.message);
    console.error('Raw content:', content.substring(0, 500));
    return {
      success: false,
      error: 'Failed to parse AI response',
      raw: content
    };
  }
}

module.exports = { analyzeStatement };
```

---

## Step 4: API Route Handler

```javascript
const express = require('express');
const multer = require('multer');
const { analyzeStatement } = require('./statement-analyzer');

const router = express.Router();

// Configure multer - use memory storage for easier buffer access
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024  // 20MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported`));
    }
  }
});

router.post('/analyze-statement', upload.single('file'), async (req, res) => {
  try {
    console.log('=== STATEMENT ANALYSIS REQUEST ===');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer,
      bufferLength: req.file.buffer?.length
    });
    
    const result = await analyzeStatement(req.file);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error, details: result.raw });
    }
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
```

---

## Installation Commands

Run these in Replit shell:

```bash
# Primary PDF parser
npm install pdf-parse

# Backup PDF parser  
npm install pdfjs-dist

# Claude SDK (for fallback)
npm install @anthropic-ai/sdk

# Excel parsing
npm install xlsx

# File uploads
npm install multer
```

---

## Quick Fix for Replit Agent

Copy this prompt to Replit:

---

**The statement analyzer is failing with "No text could be extracted from the files". Fix it with this approach:**

1. **Check if pdf-parse is installed**: `npm install pdf-parse`

2. **Make sure multer uses memory storage** so we get the buffer directly:
```javascript
const upload = multer({ storage: multer.memoryStorage() });
```

3. **Add fallback to Claude's native PDF support** when pdf-parse fails:
```javascript
// If pdf-parse returns empty or fails, use Claude:
const base64 = buffer.toString('base64');
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 }
      },
      { type: "text", text: "Extract all text from this PDF." }
    ]
  }]
});
```

4. **Add logging** to see exactly where it's failing:
```javascript
console.log('Buffer length:', buffer?.length);
console.log('PDF header:', buffer?.slice(0, 5).toString());
```

---

## Expected Result for Brickworks Dental

When working, the analyzer should return:

```json
{
  "merchant": {
    "name": "Brickworks Dental",
    "address": "5429 Harding Hwy Ste 101, Mays Landing NJ 08330-2263",
    "merchant_number": "5180897322021480"
  },
  "processor": "CardConnect Direct",
  "statement_period": {
    "start": "12/01/25",
    "end": "12/31/25"
  },
  "summary": {
    "total_volume": 99682.53,
    "total_transactions": 402,
    "total_fees": 3307.19,
    "effective_rate_percent": 3.32,
    "amount_funded": 96375.34
  },
  "card_breakdown": [
    { "card_type": "Visa", "volume": 35772.42, "transactions": 110 },
    { "card_type": "Visa Debit", "volume": 30362.85, "transactions": 155 },
    { "card_type": "MasterCard", "volume": 16650.62, "transactions": 68 },
    { "card_type": "MC Debit", "volume": 6026.34, "transactions": 31 },
    { "card_type": "Amex", "volume": 6207.76, "transactions": 17 },
    { "card_type": "Discover", "volume": 4662.54, "transactions": 21 }
  ]
}
```
