-- =====================================================
-- DAILY EDGE MODULE - Database Schema
-- The Winner's Code / Sales Mindset Training
-- =====================================================

-- Daily Edge Content Table
-- Stores all motivation content organized by belief system
CREATE TABLE IF NOT EXISTS daily_edge_content (
    id SERIAL PRIMARY KEY,
    belief VARCHAR(50) NOT NULL,  -- fulfilment, control, resilience, influence, communication
    content_type VARCHAR(30) NOT NULL,  -- quote, insight, challenge, iconic_story, journey_motivator
    title VARCHAR(200),
    content TEXT NOT NULL,
    source VARCHAR(100),  -- "The Salesperson's Secret Code", person name for iconic stories
    difficulty VARCHAR(20) DEFAULT 'all',  -- beginner, intermediate, advanced, all
    tags TEXT[],
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Daily Edge Progress
-- Tracks which content users have seen and their engagement
CREATE TABLE IF NOT EXISTS user_daily_edge (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    content_id INT REFERENCES daily_edge_content(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_challenge BOOLEAN DEFAULT false,
    reflection TEXT,  -- User's notes/thoughts on the content
    rating INT CHECK (rating >= 1 AND rating <= 5)  -- 1-5 star rating
);

-- User Belief Progress
-- Tracks overall progress through each belief system
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

-- Daily Edge Streaks
-- Tracks consecutive days of engagement
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_edge_belief ON daily_edge_content(belief);
CREATE INDEX IF NOT EXISTS idx_daily_edge_type ON daily_edge_content(content_type);
CREATE INDEX IF NOT EXISTS idx_daily_edge_active ON daily_edge_content(is_active);
CREATE INDEX IF NOT EXISTS idx_user_daily_edge_user ON user_daily_edge(user_id);
CREATE INDEX IF NOT EXISTS idx_user_belief_progress_user ON user_belief_progress(user_id);

-- =====================================================
-- VIEWS
-- =====================================================

-- View: Today's content rotation (rotates based on day of year)
CREATE OR REPLACE VIEW v_daily_content AS
SELECT 
    id,
    belief,
    content_type,
    title,
    content,
    source,
    difficulty,
    tags,
    -- Rotate content: each day shows different content based on day of year
    (EXTRACT(DOY FROM CURRENT_DATE)::INT % (SELECT COUNT(*) FROM daily_edge_content WHERE is_active)) = 
    (ROW_NUMBER() OVER (ORDER BY belief, display_order, id) - 1) % (SELECT COUNT(*) FROM daily_edge_content WHERE is_active)
    AS is_today
FROM daily_edge_content
WHERE is_active = true;

-- View: User engagement summary
CREATE OR REPLACE VIEW v_user_engagement AS
SELECT 
    u.user_id,
    COUNT(DISTINCT DATE(u.viewed_at)) as total_days_active,
    COUNT(u.id) as total_content_viewed,
    SUM(CASE WHEN u.completed_challenge THEN 1 ELSE 0 END) as challenges_completed,
    AVG(u.rating)::NUMERIC(3,2) as avg_rating,
    MAX(u.viewed_at) as last_active
FROM user_daily_edge u
GROUP BY u.user_id;
