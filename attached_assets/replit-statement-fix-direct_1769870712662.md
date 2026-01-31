# REPLIT AGENT: Fix Statement Analyzer

## Error
```
500: {"error":"No text could be extracted from the files"}
```

## Root Cause
The PDF buffer isn't reaching the pdf-parse library correctly. Either:
- Multer is using disk storage instead of memory storage
- The buffer is getting lost between upload and processing
- pdf-parse isn't handling this PDF format

## IMMEDIATE FIX

### 1. Check multer configuration
Find where multer is configured and change to memory storage:

```javascript
// WRONG - disk storage loses easy buffer access
const upload = multer({ dest: 'uploads/' });

// CORRECT - memory storage gives us the buffer directly
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});
```

### 2. Add Claude as primary PDF handler (most reliable)

Replace the PDF extraction code with this:

```javascript
const Anthropic = require('@anthropic-ai/sdk');

async function extractDataFromPDF(file) {
  // Get buffer
  let buffer;
  if (file.buffer) {
    buffer = file.buffer;
  } else if (file.path) {
    buffer = require('fs').readFileSync(file.path);
  }
  
  if (!buffer || buffer.length === 0) {
    throw new Error('Could not read file buffer');
  }
  
  console.log('PDF buffer size:', buffer.length);
  
  // Use Claude's native PDF support - most reliable
  const anthropic = new Anthropic();
  const base64 = buffer.toString('base64');
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
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
            text: `Analyze this merchant processing statement. Extract and return ONLY valid JSON:
{
  "merchant_name": "",
  "merchant_address": "",
  "processor": "",
  "statement_period": "",
  "total_volume": 0,
  "total_transactions": 0,
  "total_fees": 0,
  "effective_rate": 0,
  "amount_funded": 0,
  "card_breakdown": [
    {"card_type": "", "volume": 0, "transactions": 0}
  ]
}`
          }
        ]
      }
    ]
  });
  
  // Parse JSON from response
  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Could not parse response');
}
```

### 3. Handle images (JPG/PNG) separately

```javascript
async function extractDataFromImage(file) {
  let buffer;
  if (file.buffer) {
    buffer = file.buffer;
  } else if (file.path) {
    buffer = require('fs').readFileSync(file.path);
  }
  
  const ext = file.originalname.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp'
  };
  
  const anthropic = new Anthropic();
  const base64 = buffer.toString('base64');
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeTypes[ext] || 'image/jpeg',
              data: base64
            }
          },
          {
            type: "text",
            text: "This is a photo of a merchant statement. Extract all data as JSON."
          }
        ]
      }
    ]
  });
  
  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}
```

### 4. Handle Excel files directly

```javascript
const XLSX = require('xlsx');

async function extractDataFromExcel(file) {
  let buffer;
  if (file.buffer) {
    buffer = file.buffer;
  } else if (file.path) {
    buffer = require('fs').readFileSync(file.path);
  }
  
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  // Convert to text for AI analysis
  let text = '';
  for (const sheetName of workbook.SheetNames) {
    text += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]) + '\n';
  }
  
  // Send to Claude for interpretation
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `This is spreadsheet data from a merchant statement. Extract key data as JSON:\n\n${text}`
      }
    ]
  });
  
  const responseText = response.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}
```

### 5. Main router function

```javascript
async function analyzeStatement(file) {
  const filename = file.originalname || file.name;
  const ext = filename.split('.').pop().toLowerCase();
  
  console.log(`Processing: ${filename} (${ext})`);
  
  try {
    switch (ext) {
      case 'pdf':
        return await extractDataFromPDF(file);
      
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return await extractDataFromImage(file);
      
      case 'xlsx':
      case 'xls':
      case 'csv':
        return await extractDataFromExcel(file);
      
      default:
        throw new Error(`Unsupported: ${ext}`);
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}
```

## Install Dependencies

```bash
npm install @anthropic-ai/sdk xlsx multer
```

## Environment Variable

Make sure ANTHROPIC_API_KEY is set in Replit Secrets.

## Test With

Upload the Brickworks Dental PDF (Statement_Location_5180897322021480_20251231.pdf)

Expected output:
- Merchant: Brickworks Dental
- Volume: $99,682.53
- Transactions: 402
- Fees: $3,307.19
- Rate: 3.32%
