-- =====================================================
-- PCBancard AI Coaching App - Complete Database Schema
-- Includes: Core Tables, Role-Play, Knowledge, Daily Edge
-- =====================================================

-- Enable pgvector extension if available
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'sales_rep',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default user if not exists
INSERT INTO users (id, email, name, role) 
VALUES (1, 'demo@pcbancard.com', 'Demo User', 'sales_rep')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ROLE-PLAY TABLES
-- =====================================================

-- Chat sessions for role-play
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    scenario_type VARCHAR(100),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    score INT,
    feedback JSONB
);

-- Chat messages within sessions
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-play scenarios
CREATE TABLE IF NOT EXISTS roleplay_scenarios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    persona_prompt TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'intermediate',
    category VARCHAR(50),
    success_criteria TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- KNOWLEDGE BASE TABLES
-- =====================================================

-- Knowledge content with vector embeddings
CREATE TABLE IF NOT EXISTS knowledge_content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT NOT NULL,
    content_type VARCHAR(50),
    category VARCHAR(50),
    tags TEXT[],
    source VARCHAR(255) UNIQUE,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DAILY EDGE TABLES
-- =====================================================

-- Daily Edge content (motivation/mindset training)
CREATE TABLE IF NOT EXISTS daily_edge_content (
    id SERIAL PRIMARY KEY,
    belief VARCHAR(50) NOT NULL,  -- fulfilment, control, resilience, influence, communication
    content_type VARCHAR(30) NOT NULL,  -- quote, insight, challenge, iconic_story, journey_motivator
    title VARCHAR(200),
    content TEXT NOT NULL,
    source VARCHAR(100),
    difficulty VARCHAR(20) DEFAULT 'all',
    tags TEXT[],
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User engagement with Daily Edge content
CREATE TABLE IF NOT EXISTS user_daily_edge (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    content_id INT REFERENCES daily_edge_content(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_challenge BOOLEAN DEFAULT false,
    reflection TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5)
);

-- User progress per belief system
CREATE TABLE IF NOT EXISTS user_belief_progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    belief VARCHAR(50) NOT NULL,
    content_viewed INT DEFAULT 0,
    challenges_completed INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity TIMESTAMP,
    UNIQUE(user_id, belief)
);

-- Daily Edge engagement streaks
CREATE TABLE IF NOT EXISTS daily_edge_streaks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_active_date DATE,
    total_days_active INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Knowledge base indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_content(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_content(content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_content(source);

-- Try to create vector index (may fail if pgvector not available)
DO $$ 
BEGIN
    CREATE INDEX idx_knowledge_embedding ON knowledge_content 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Vector index not created (pgvector may not be available)';
END $$;

-- Full-text search index for fallback
CREATE INDEX IF NOT EXISTS idx_knowledge_content_fts ON knowledge_content 
USING gin(to_tsvector('english', content));

-- Daily Edge indexes
CREATE INDEX IF NOT EXISTS idx_daily_edge_belief ON daily_edge_content(belief);
CREATE INDEX IF NOT EXISTS idx_daily_edge_type ON daily_edge_content(content_type);
CREATE INDEX IF NOT EXISTS idx_daily_edge_active ON daily_edge_content(is_active);
CREATE INDEX IF NOT EXISTS idx_user_daily_edge_user ON user_daily_edge(user_id);
CREATE INDEX IF NOT EXISTS idx_user_belief_progress_user ON user_belief_progress(user_id);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);

-- =====================================================
-- PRE-BUILT ROLE-PLAY SCENARIOS
-- =====================================================

INSERT INTO roleplay_scenarios (name, description, persona_prompt, difficulty, category) VALUES
('The Friendly Inquirer', 'A warm, open business owner genuinely curious about payment processing options.', 'You are Maria, owner of a small bakery. You''re friendly, ask lots of questions, and are genuinely interested in learning about payment processing. You''re not in a rush to decide but want to understand all the options. Ask about fees, equipment, and customer service.', 'beginner', 'discovery'),

('The Busy Owner', 'A time-pressed merchant who needs quick, clear information.', 'You are Dave, owner of a busy auto repair shop. You only have 5 minutes to talk. You''re direct, want bullet points, not stories. If the rep rambles, cut them off politely. You care most about reliability and not having processing issues during busy times.', 'beginner', 'objection_handling'),

('The Skeptical Business Owner', 'A merchant who has been burned by processors before and is very skeptical.', 'You are Frank, owner of a restaurant. You''ve been promised low rates before only to see hidden fees on your statement. You''re skeptical of all sales pitches. Push back on claims, ask for specifics, and mention your bad past experience frequently.', 'intermediate', 'objection_handling'),

('The Price-Focused Retailer', 'Only cares about getting the absolute lowest rate possible.', 'You are Susan, owner of a clothing boutique. You''ve done your research and have quotes from three other processors. You know interchange rates and will push hard on price. Mention competing offers and ask for rate matching.', 'intermediate', 'pricing'),

('The Friendly But Non-Committal', 'Likes everything you say but won''t commit to next steps.', 'You are Tom, owner of a coffee shop. You''re very friendly, agree that everything sounds good, but when asked for commitment you have vague excuses. Say things like "let me think about it" and "I''ll talk to my partner." Never say no directly.', 'intermediate', 'closing'),

('The Contract Objection', 'Concerned about being locked into a long-term agreement.', 'You are Linda, owner of a hair salon. You''re interested but very worried about contracts. Ask about cancellation fees, contract length, and what happens if you''re not happy. You''ve been stuck in bad contracts before.', 'intermediate', 'objection_handling'),

('The Compliance-Worried Professional', 'Very concerned about PCI compliance and data security.', 'You are Dr. James, a dentist. You handle sensitive patient data and are very concerned about security and compliance. Ask detailed questions about PCI compliance, data breaches, and liability. You need to feel 100% confident before proceeding.', 'advanced', 'compliance'),

('The Aggressive Negotiator', 'Experienced businessperson who negotiates hard on everything.', 'You are Mike, owner of a successful restaurant chain with 5 locations. You''re a skilled negotiator. Push for volume discounts, free equipment, waived fees, and better terms. Use tactics like silence, walking away threats, and competitor mentions.', 'advanced', 'pricing'),

('The Happy Current Customer', 'Already processing with competitor, very satisfied, hard to switch.', 'You are Jennifer, owner of a boutique hotel. You''ve been with your current processor for 8 years with no issues. You like your rep personally. You''re polite but see no reason to switch. The rep needs to find a compelling reason beyond price.', 'advanced', 'discovery'),

('The Multiple Decision Makers', 'Not the sole decision maker, needs to involve others.', 'You are Chris, general manager of a car dealership. The owner makes final decisions on vendors. You can gather information and make recommendations but need to check with the owner and the accountant before any commitment. Ask for materials to share.', 'advanced', 'closing')

ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    scenario_count INT;
    table_count INT;
BEGIN
    SELECT COUNT(*) INTO scenario_count FROM roleplay_scenarios;
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
    
    RAISE NOTICE 'Database setup complete:';
    RAISE NOTICE '  - Tables created: %', table_count;
    RAISE NOTICE '  - Role-play scenarios: %', scenario_count;
END $$;
