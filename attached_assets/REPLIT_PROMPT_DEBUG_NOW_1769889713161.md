# URGENT: Debug Prospect Finder 500 Error

## THE PROBLEM
The search keeps returning `500: {"error":"Search failed. Please try again."}` but we can't see the REAL error.

## STEP 1: Find the actual error NOW

Look at the server console/logs RIGHT NOW. The real error is being caught and hidden. We need to see it.

Find the search route handler (likely in `server/routes/prospects.ts` or similar) and look for the catch block.

## STEP 2: Add detailed error logging

Find the POST `/api/prospects/search` route and update the error handling to show the REAL error:

```typescript
app.post('/api/prospects/search', requireAuth, async (req, res) => {
  try {
    console.log('=== SEARCH REQUEST STARTED ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { zipCode, businessTypes, radius, maxResults } = req.body;
    
    // Check inputs
    if (!zipCode) {
      console.log('ERROR: Missing zipCode');
      return res.status(400).json({ error: 'ZIP code required' });
    }
    if (!businessTypes?.length) {
      console.log('ERROR: Missing businessTypes');
      return res.status(400).json({ error: 'Business types required' });
    }
    
    console.log('Inputs valid, calling search service...');
    
    const results = await searchLocalBusinesses({
      zipCode,
      businessTypes,
      radius: radius || 10,
      maxResults: maxResults || 25
    });
    
    console.log('=== SEARCH SUCCESS ===');
    console.log('Found', results.totalFound, 'businesses');
    
    res.json(results);
    
  } catch (error: any) {
    // LOG THE REAL ERROR
    console.log('=== SEARCH FAILED ===');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
    console.log('Full error:', error);
    
    // Return the real error in development
    res.status(500).json({ 
      error: 'Search failed. Please try again.',
      debug: {
        message: error.message,
        name: error.name
      }
    });
  }
});
```

## STEP 3: Add logging to the search service

Find the search service function and add logging at EVERY step:

```typescript
export async function searchLocalBusinesses(params: SearchParams) {
  console.log('--- searchLocalBusinesses called ---');
  console.log('Params:', JSON.stringify(params, null, 2));
  
  // Check API key
  const apiKey = process.env.XAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  console.log('API Key exists:', !!apiKey);
  console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');
  
  if (!apiKey) {
    console.log('!!! NO API KEY FOUND !!!');
    throw new Error('No API key configured. Set XAI_API_KEY or ANTHROPIC_API_KEY in Secrets.');
  }
  
  // Determine which API to use
  const useGrok = !!process.env.XAI_API_KEY;
  console.log('Using Grok:', useGrok);
  
  const url = useGrok 
    ? 'https://api.x.ai/v1/chat/completions'
    : 'https://api.anthropic.com/v1/messages';
  
  console.log('API URL:', url);
  
  // Build request
  const requestBody = useGrok ? {
    model: "grok-3-fast",
    messages: [
      { role: "user", content: `Find businesses near ${params.zipCode}` }
    ],
    max_tokens: 2048
  } : {
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      { role: "user", content: `Find businesses near ${params.zipCode}` }
    ]
  };
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  const headers = useGrok ? {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  } : {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  };
  
  console.log('Making API request...');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('Response body (first 500 chars):', responseText.substring(0, 500));
    
    if (!response.ok) {
      console.log('!!! API RETURNED ERROR !!!');
      throw new Error(`API error ${response.status}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    console.log('Parsed response successfully');
    
    // Return placeholder for now to test connection
    return {
      businesses: [],
      totalFound: 0
    };
    
  } catch (fetchError: any) {
    console.log('!!! FETCH ERROR !!!');
    console.log('Fetch error message:', fetchError.message);
    throw fetchError;
  }
}
```

## STEP 4: Check Replit Secrets

Go to the Secrets panel (lock icon) and verify:

1. **Is XAI_API_KEY set?** 
   - Should start with something like `xai-` or be a long string
   
2. **Is ANTHROPIC_API_KEY set?**
   - Should start with `sk-ant-`

3. **Are there any typos?**
   - No extra spaces
   - No quotes around the value
   - Correct key name (case sensitive)

## STEP 5: Test API keys directly

Add a test endpoint to verify the API keys work:

```typescript
// Add this temporary test route
app.get('/api/test-api-keys', async (req, res) => {
  const results: any = {
    xai: { exists: false, works: false },
    anthropic: { exists: false, works: false }
  };
  
  // Test xAI
  if (process.env.XAI_API_KEY) {
    results.xai.exists = true;
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "grok-3-fast",
          messages: [{ role: "user", content: "Say hello" }],
          max_tokens: 10
        })
      });
      results.xai.status = response.status;
      results.xai.works = response.ok;
      if (!response.ok) {
        results.xai.error = await response.text();
      }
    } catch (e: any) {
      results.xai.error = e.message;
    }
  }
  
  // Test Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    results.anthropic.exists = true;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 10,
          messages: [{ role: "user", content: "Say hello" }]
        })
      });
      results.anthropic.status = response.status;
      results.anthropic.works = response.ok;
      if (!response.ok) {
        results.anthropic.error = await response.text();
      }
    } catch (e: any) {
      results.anthropic.error = e.message;
    }
  }
  
  res.json(results);
});
```

Then visit: `https://brochuretracker.com/api/test-api-keys`

## STEP 6: Report back

After adding the logging, try the search again and tell me:

1. What appears in the server console?
2. What does `/api/test-api-keys` return?
3. Are any API keys actually set in Secrets?

## COMMON CAUSES

| Error | Meaning | Fix |
|-------|---------|-----|
| "No API key configured" | Missing env var | Add to Secrets |
| "401 Unauthorized" | Invalid key | Check key is correct |
| "403 Forbidden" | Key lacks permissions | Check xAI/Anthropic account |
| "404 Not Found" | Wrong endpoint URL | Check API URL |
| "429 Too Many Requests" | Rate limited | Wait and retry |
| "fetch is not defined" | Node version issue | Import node-fetch |
| "Network error" | Can't reach API | Check Replit network |

## MOST LIKELY ISSUE

The API key is probably not set correctly in Replit Secrets. Double-check:

1. Go to Secrets (lock icon in left sidebar)
2. Look for `XAI_API_KEY` or `ANTHROPIC_API_KEY`
3. If missing, add it
4. **IMPORTANT: After adding, you MUST restart the server** (Stop → Run)

Secrets are only loaded when the server starts. If you added a key but didn't restart, it won't work.
