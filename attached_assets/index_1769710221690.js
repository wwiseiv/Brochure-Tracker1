// =====================================================
// PCBancard AI Coaching App - Complete Server
// Includes: Role-Play, RAG Knowledge, Daily Edge
// =====================================================

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const cron = require('node-cron');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// API Clients
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// File upload config
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// =====================================================
// DAILY EDGE MODULE ROUTES
// =====================================================
const dailyEdgeRoutes = require('./routes/daily-edge');
app.use('/api/daily-edge', dailyEdgeRoutes(pool));

// =====================================================
// GOOGLE DRIVE SYNC (from previous implementation)
// =====================================================
let GoogleDriveSync = null;
try {
  const { google } = require('googleapis');
  const pdf = require('pdf-parse');

  class DriveSync {
    constructor() {
      if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT not configured');
      }
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
      });
      this.drive = google.drive({ version: 'v3', auth });
      this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    }

    async listFilesRecursive(folderId = this.folderId, category = '') {
      const results = [];
      try {
        const response = await this.drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType, modifiedTime)',
          pageSize: 100
        });

        for (const file of response.data.files || []) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            const subFiles = await this.listFilesRecursive(file.id, file.name);
            results.push(...subFiles);
          } else {
            results.push({ ...file, category: this.normalizeCategory(category) });
          }
        }
      } catch (err) {
        console.error('Error listing files:', err.message);
      }
      return results;
    }

    normalizeCategory(folderName) {
      const lower = folderName.toLowerCase();
      if (lower.includes('objection')) return 'objection_handling';
      if (lower.includes('cold') || lower.includes('script')) return 'cold_calling';
      if (lower.includes('clos')) return 'closing';
      if (lower.includes('compliance') || lower.includes('pci')) return 'compliance';
      if (lower.includes('paylo') || lower.includes('pricing') || lower.includes('dual')) return 'pricing';
      if (lower.includes('success') || lower.includes('transcript') || lower.includes('win')) return 'success_stories';
      if (lower.includes('daily') || lower.includes('edge') || lower.includes('motivation')) return 'daily_edge';
      return 'product_knowledge';
    }

    async getFileContent(fileId, mimeType) {
      try {
        if (mimeType === 'application/vnd.google-apps.document') {
          const response = await this.drive.files.export({ fileId, mimeType: 'text/plain' }, { responseType: 'text' });
          return response.data;
        } else if (mimeType === 'application/pdf') {
          const response = await this.drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
          const pdfData = await pdf(Buffer.from(response.data));
          return pdfData.text;
        } else if (mimeType.startsWith('text/') || mimeType === 'application/vnd.google-apps.spreadsheet') {
          if (mimeType === 'application/vnd.google-apps.spreadsheet') {
            const response = await this.drive.files.export({ fileId, mimeType: 'text/csv' }, { responseType: 'text' });
            return response.data;
          }
          const response = await this.drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
          return response.data;
        }
      } catch (err) {
        console.error(`Error getting content for ${fileId}:`, err.message);
      }
      return null;
    }

    async syncToKnowledgeBase(force = false) {
      const results = { processed: 0, updated: 0, skipped: 0, errors: [] };
      const files = await this.listFilesRecursive();

      for (const file of files) {
        try {
          const source = `gdrive:${file.id}`;
          const existing = await pool.query('SELECT id, updated_at FROM knowledge_content WHERE source = $1', [source]);

          if (existing.rows.length > 0 && !force) {
            const dbTime = new Date(existing.rows[0].updated_at).getTime();
            const fileTime = new Date(file.modifiedTime).getTime();
            if (fileTime <= dbTime) {
              results.skipped++;
              continue;
            }
          }

          const content = await this.getFileContent(file.id, file.mimeType);
          if (!content || content.length < 50) {
            results.skipped++;
            continue;
          }

          // Chunk long content
          const chunks = chunkContent(content, 1500, 200);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkSource = chunks.length > 1 ? `${source}:chunk${i}` : source;
            const chunkTitle = chunks.length > 1 ? `${file.name} (Part ${i + 1})` : file.name;

            const embedding = await generateEmbedding(chunk);

            if (existing.rows.length > 0 && i === 0) {
              await pool.query(`
                UPDATE knowledge_content 
                SET content = $1, embedding = $2::vector, updated_at = NOW(), category = $3
                WHERE source = $4
              `, [chunk, `[${embedding.join(',')}]`, file.category, source]);
              results.updated++;
            } else {
              await pool.query(`
                INSERT INTO knowledge_content (title, content, content_type, category, embedding, source)
                VALUES ($1, $2, $3, $4, $5::vector, $6)
                ON CONFLICT (source) DO UPDATE SET content = $2, embedding = $5::vector, updated_at = NOW()
              `, [chunkTitle, chunk, inferContentType(file.name), file.category, `[${embedding.join(',')}]`, chunkSource]);
              results.processed++;
            }
          }
        } catch (err) {
          results.errors.push({ file: file.name, error: err.message });
        }
      }
      return results;
    }
  }

  GoogleDriveSync = DriveSync;
} catch (err) {
  console.log('Google Drive sync not available:', err.message);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.slice(0, 8000)
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('Embedding error:', err.message);
    return new Array(1536).fill(0);
  }
}

function chunkContent(text, maxLength = 1500, overlap = 200) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLength;
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      end = Math.max(lastPeriod, lastNewline, start + maxLength / 2);
    }
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }
  return chunks;
}

function inferContentType(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('script')) return 'script';
  if (lower.includes('objection')) return 'objection';
  if (lower.includes('faq') || lower.includes('question')) return 'faq';
  if (lower.includes('transcript') || lower.includes('call')) return 'transcript';
  return 'training';
}

async function searchKnowledge(query, limit = 4) {
  try {
    const embedding = await generateEmbedding(query);
    
    // Try vector search first
    try {
      const result = await pool.query(`
        SELECT id, title, content, category, 
               1 - (embedding <=> $1::vector) as similarity
        FROM knowledge_content
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `, [`[${embedding.join(',')}]`, limit]);
      
      if (result.rows.length > 0) return result.rows;
    } catch (err) {
      console.log('Vector search failed, using text search');
    }
    
    // Fallback to text search
    const result = await pool.query(`
      SELECT id, title, content, category,
             ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as similarity
      FROM knowledge_content
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
      ORDER BY similarity DESC
      LIMIT $2
    `, [query, limit]);
    
    return result.rows;
  } catch (err) {
    console.error('Search error:', err.message);
    return [];
  }
}

// =====================================================
// CORE API ROUTES
// =====================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    modules: {
      roleplay: true,
      knowledge: true,
      daily_edge: true,
      drive_sync: !!GoogleDriveSync
    }
  });
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const knowledge = await pool.query('SELECT category, COUNT(*) as count FROM knowledge_content GROUP BY category');
    const sessions = await pool.query('SELECT COUNT(*) as total, AVG(score) as avg_score FROM chat_sessions WHERE score IS NOT NULL');
    const scenarios = await pool.query('SELECT COUNT(*) as count FROM roleplay_scenarios');
    const dailyEdge = await pool.query('SELECT belief, COUNT(*) as count FROM daily_edge_content GROUP BY belief');
    
    res.json({
      knowledge_by_category: knowledge.rows,
      sessions: sessions.rows[0],
      scenarios: scenarios.rows[0].count,
      daily_edge_by_belief: dailyEdge.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// GOOGLE DRIVE SYNC ROUTES
// =====================================================

app.post('/api/admin/sync-drive', async (req, res) => {
  if (!GoogleDriveSync) {
    return res.status(400).json({ error: 'Google Drive sync not configured' });
  }
  try {
    const sync = new GoogleDriveSync();
    const results = await sync.syncToKnowledgeBase(req.body.force);
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/sync-status', (req, res) => {
  res.json({
    enabled: !!GoogleDriveSync,
    folder_id: process.env.GOOGLE_DRIVE_FOLDER_ID ? 'configured' : 'not set',
    service_account: process.env.GOOGLE_SERVICE_ACCOUNT ? 'configured' : 'not set'
  });
});

// =====================================================
// KNOWLEDGE BASE ROUTES
// =====================================================

app.post('/api/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    const results = await searchKnowledge(query, limit);
    res.json({ query, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/content', async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    let query = 'SELECT id, title, content_type, category, created_at FROM knowledge_content';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    res.json({ content: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/content/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, content_type, category, tags } = req.body;
    let content = req.body.content;
    
    if (req.file) {
      content = req.file.buffer.toString('utf-8');
    }
    
    if (!content || content.length < 10) {
      return res.status(400).json({ error: 'Content too short' });
    }
    
    const embedding = await generateEmbedding(content);
    
    const result = await pool.query(`
      INSERT INTO knowledge_content (title, content, content_type, category, tags, embedding)
      VALUES ($1, $2, $3, $4, $5, $6::vector)
      RETURNING id, title, category
    `, [title, content, content_type || 'training', category || 'product_knowledge', tags || [], `[${embedding.join(',')}]`]);
    
    res.json({ success: true, content: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/content/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    let imported = 0;
    
    for (const item of items) {
      const embedding = await generateEmbedding(item.content);
      await pool.query(`
        INSERT INTO knowledge_content (title, content, content_type, category, tags, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
      `, [item.title, item.content, item.content_type || 'training', item.category || 'product_knowledge', item.tags || [], `[${embedding.join(',')}]`]);
      imported++;
    }
    
    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/content/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM knowledge_content WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category, COUNT(*) as count, MAX(created_at) as last_updated
      FROM knowledge_content
      GROUP BY category
      ORDER BY count DESC
    `);
    res.json({ categories: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// ROLE-PLAY SCENARIO ROUTES
// =====================================================

app.get('/api/scenarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roleplay_scenarios ORDER BY difficulty, name');
    res.json({ scenarios: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scenarios', async (req, res) => {
  try {
    const { name, description, persona_prompt, difficulty, category } = req.body;
    const result = await pool.query(`
      INSERT INTO roleplay_scenarios (name, description, persona_prompt, difficulty, category)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, persona_prompt, difficulty || 'intermediate', category || 'general']);
    res.json({ success: true, scenario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// ROLE-PLAY SESSION ROUTES
// =====================================================

app.post('/api/session/start', async (req, res) => {
  try {
    const { user_id, scenario_id } = req.body;
    
    const scenario = await pool.query('SELECT * FROM roleplay_scenarios WHERE id = $1', [scenario_id]);
    if (scenario.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    const session = await pool.query(`
      INSERT INTO chat_sessions (user_id, scenario_type)
      VALUES ($1, $2)
      RETURNING *
    `, [user_id, scenario.rows[0].name]);
    
    res.json({
      session: session.rows[0],
      scenario: scenario.rows[0],
      instructions: `You are now practicing with: ${scenario.rows[0].name}. ${scenario.rows[0].description}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/session/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    
    // Get session and scenario
    const sessionResult = await pool.query('SELECT * FROM chat_sessions WHERE id = $1', [sessionId]);
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = sessionResult.rows[0];
    
    const scenarioResult = await pool.query('SELECT * FROM roleplay_scenarios WHERE name = $1', [session.scenario_type]);
    const scenario = scenarioResult.rows[0];
    
    // Save user message
    await pool.query('INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)', [sessionId, 'user', content]);
    
    // Get conversation history
    const historyResult = await pool.query('SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at', [sessionId]);
    
    // Search knowledge base for relevant content
    const relevantKnowledge = await searchKnowledge(content, 4);
    const knowledgeContext = relevantKnowledge.map(k => `[${k.category}] ${k.content}`).join('\n\n');
    
    // Build messages for Claude
    const systemPrompt = `You are playing TWO roles:

1. IN-CHARACTER ROLE: ${scenario?.persona_prompt || 'A potential merchant customer considering payment processing services.'}

2. COACH ROLE: After your in-character response, provide brief coaching feedback.

[COACHING CONTEXT - Use this to inform your coaching feedback]
${knowledgeContext || 'No specific knowledge available for this topic.'}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
[Your in-character response as the merchant]

---COACH---
[1-2 sentences of coaching feedback referencing the knowledge base if relevant]`;

    const messages = historyResult.rows.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));
    messages.push({ role: 'user', content });
    
    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });
    
    const fullResponse = response.content[0].text;
    
    // Parse response
    const parts = fullResponse.split('---COACH---');
    const merchantResponse = parts[0].trim();
    const coachFeedback = parts[1]?.trim() || '';
    
    // Save assistant message
    await pool.query('INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)', [sessionId, 'assistant', merchantResponse]);
    
    res.json({
      merchant_response: merchantResponse,
      coach_feedback: coachFeedback,
      knowledge_used: relevantKnowledge.map(k => ({ id: k.id, title: k.title, category: k.category }))
    });
  } catch (err) {
    console.error('Message error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/session/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get all messages
    const messages = await pool.query('SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at', [sessionId]);
    const session = await pool.query('SELECT * FROM chat_sessions WHERE id = $1', [sessionId]);
    
    if (messages.rows.length < 2) {
      return res.status(400).json({ error: 'Not enough conversation to evaluate' });
    }
    
    // Get evaluation from Claude
    const conversation = messages.rows.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    
    const evalResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Evaluate this sales role-play conversation. The rep was practicing: ${session.rows[0].scenario_type}

CONVERSATION:
${conversation}

Provide:
1. SCORE: A number from 1-100
2. STRENGTHS: 2-3 things they did well
3. IMPROVEMENTS: 2-3 specific areas to work on
4. RECOMMENDATION: One specific technique or script they should practice next

Format as JSON: { "score": number, "strengths": [], "improvements": [], "recommendation": "" }`
      }]
    });
    
    let evaluation;
    try {
      const jsonMatch = evalResponse.content[0].text.match(/\{[\s\S]*\}/);
      evaluation = JSON.parse(jsonMatch[0]);
    } catch (e) {
      evaluation = { score: 70, strengths: ['Completed the role-play'], improvements: ['Keep practicing'], recommendation: 'Continue building rapport' };
    }
    
    // Update session
    await pool.query(`
      UPDATE chat_sessions 
      SET ended_at = NOW(), score = $1, feedback = $2
      WHERE id = $3
    `, [evaluation.score, JSON.stringify(evaluation), sessionId]);
    
    res.json({
      session_id: sessionId,
      evaluation,
      message_count: messages.rows.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/session/:sessionId', async (req, res) => {
  try {
    const session = await pool.query('SELECT * FROM chat_sessions WHERE id = $1', [req.params.sessionId]);
    const messages = await pool.query('SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at', [req.params.sessionId]);
    
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      session: session.rows[0],
      messages: messages.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:userId/sessions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, scenario_type, started_at, ended_at, score
      FROM chat_sessions
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT 20
    `, [req.params.userId]);
    res.json({ sessions: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, 
             COUNT(cs.id) as sessions_completed,
             AVG(cs.score)::INT as avg_score,
             MAX(cs.score) as best_score
      FROM users u
      JOIN chat_sessions cs ON u.id = cs.user_id
      WHERE cs.score IS NOT NULL
      GROUP BY u.id, u.name
      ORDER BY avg_score DESC, sessions_completed DESC
      LIMIT 10
    `);
    res.json({ leaderboard: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// SCHEDULED TASKS
// =====================================================

// Sync Google Drive every hour
if (GoogleDriveSync) {
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled Drive sync...');
    try {
      const sync = new GoogleDriveSync();
      const results = await sync.syncToKnowledgeBase();
      console.log('Sync complete:', results);
    } catch (err) {
      console.error('Scheduled sync failed:', err.message);
    }
  });
}

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         PCBancard AI Coaching Server v3.0                 ║
╠═══════════════════════════════════════════════════════════╣
║  Modules:                                                 ║
║  ✓ Role-Play Training                                     ║
║  ✓ RAG Knowledge Base                                     ║
║  ✓ Daily Edge (Winner's Code)                             ║
║  ${GoogleDriveSync ? '✓' : '✗'} Google Drive Sync                                     ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║  • /api/daily-edge/*     - Daily motivation content       ║
║  • /api/session/*        - Role-play sessions             ║
║  • /api/search           - Knowledge search               ║
║  • /api/scenarios        - Training scenarios             ║
╚═══════════════════════════════════════════════════════════╝
  Server running on port ${PORT}
  `);
});
