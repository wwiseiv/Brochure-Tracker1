// =====================================================
// DAILY EDGE MODULE - API Endpoints
// The Winner's Code / Sales Mindset Training
// =====================================================

const express = require('express');
const router = express.Router();

// This module exports a function that takes the database pool
module.exports = function(pool) {
  
  // =====================================================
  // GET TODAY'S CONTENT
  // Returns the daily motivation content based on current date
  // =====================================================
  router.get('/today', async (req, res) => {
    try {
      const { user_id } = req.query;
      
      // Get today's content - rotates through beliefs based on day of week
      const beliefs = ['fulfilment', 'control', 'resilience', 'influence', 'communication'];
      const dayOfWeek = new Date().getDay(); // 0-6
      const todaysBelief = beliefs[dayOfWeek % beliefs.length];
      
      // Get one of each content type for today's belief
      const contentTypes = ['insight', 'quote', 'challenge', 'iconic_story', 'journey_motivator'];
      
      // Use day of year to rotate through content within each type
      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      
      const todaysContent = {};
      
      for (const type of contentTypes) {
        const result = await pool.query(`
          SELECT * FROM daily_edge_content 
          WHERE belief = $1 AND content_type = $2 AND is_active = true
          ORDER BY display_order, id
          LIMIT 10
        `, [todaysBelief, type]);
        
        if (result.rows.length > 0) {
          // Rotate through available content based on day of year
          const index = dayOfYear % result.rows.length;
          todaysContent[type] = result.rows[index];
        }
      }
      
      // Get user's streak if user_id provided
      let streak = null;
      if (user_id) {
        const streakResult = await pool.query(
          'SELECT * FROM daily_edge_streaks WHERE user_id = $1',
          [user_id]
        );
        streak = streakResult.rows[0] || { current_streak: 0, longest_streak: 0 };
        
        // Update streak
        await updateStreak(pool, user_id);
      }
      
      // Get a related role-play scenario suggestion
      const scenarioResult = await pool.query(`
        SELECT id, name, difficulty, description 
        FROM roleplay_scenarios 
        WHERE category ILIKE $1 OR description ILIKE $2
        ORDER BY RANDOM()
        LIMIT 1
      `, [`%${todaysBelief}%`, `%${todaysBelief}%`]);
      
      res.json({
        date: new Date().toISOString().split('T')[0],
        belief: todaysBelief,
        belief_display: todaysBelief.charAt(0).toUpperCase() + todaysBelief.slice(1),
        content: todaysContent,
        streak: streak,
        suggested_scenario: scenarioResult.rows[0] || null,
        beliefs_cycle: beliefs.map((b, i) => ({
          name: b,
          display: b.charAt(0).toUpperCase() + b.slice(1),
          is_today: i === (dayOfWeek % beliefs.length),
          day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i % 7]
        }))
      });
      
    } catch (err) {
      console.error('Error getting daily content:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // GET CONTENT BY BELIEF
  // Returns all content for a specific belief system
  // =====================================================
  router.get('/belief/:belief', async (req, res) => {
    try {
      const { belief } = req.params;
      const { content_type, limit = 20 } = req.query;
      
      let query = `
        SELECT * FROM daily_edge_content 
        WHERE belief = $1 AND is_active = true
      `;
      const params = [belief.toLowerCase()];
      
      if (content_type) {
        query += ` AND content_type = $${params.length + 1}`;
        params.push(content_type);
      }
      
      query += ` ORDER BY display_order, id LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
      
      const result = await pool.query(query, params);
      
      res.json({
        belief: belief,
        count: result.rows.length,
        content: result.rows
      });
      
    } catch (err) {
      console.error('Error getting belief content:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // GET ALL BELIEFS OVERVIEW
  // Returns summary of all 5 belief systems
  // =====================================================
  router.get('/beliefs', async (req, res) => {
    try {
      const beliefs = ['fulfilment', 'control', 'resilience', 'influence', 'communication'];
      
      const overview = await Promise.all(beliefs.map(async (belief) => {
        const countResult = await pool.query(
          'SELECT content_type, COUNT(*) as count FROM daily_edge_content WHERE belief = $1 AND is_active = true GROUP BY content_type',
          [belief]
        );
        
        const sampleResult = await pool.query(
          'SELECT title, content FROM daily_edge_content WHERE belief = $1 AND content_type = $2 AND is_active = true LIMIT 1',
          [belief, 'insight']
        );
        
        return {
          belief: belief,
          display: belief.charAt(0).toUpperCase() + belief.slice(1),
          content_counts: countResult.rows.reduce((acc, row) => {
            acc[row.content_type] = parseInt(row.count);
            return acc;
          }, {}),
          sample: sampleResult.rows[0] || null,
          description: getBeliefDescription(belief)
        };
      }));
      
      res.json({
        total_beliefs: 5,
        beliefs: overview
      });
      
    } catch (err) {
      console.error('Error getting beliefs overview:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // MARK CONTENT AS VIEWED
  // Tracks user engagement with content
  // =====================================================
  router.post('/view', async (req, res) => {
    try {
      const { user_id, content_id, rating, reflection } = req.body;
      
      if (!user_id || !content_id) {
        return res.status(400).json({ error: 'user_id and content_id required' });
      }
      
      const result = await pool.query(`
        INSERT INTO user_daily_edge (user_id, content_id, rating, reflection)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [user_id, content_id, rating || null, reflection || null]);
      
      // Update streak
      await updateStreak(pool, user_id);
      
      res.json({
        success: true,
        view: result.rows[0]
      });
      
    } catch (err) {
      console.error('Error recording view:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // COMPLETE CHALLENGE
  // Marks a challenge as completed with optional reflection
  // =====================================================
  router.post('/challenge/complete', async (req, res) => {
    try {
      const { user_id, content_id, reflection } = req.body;
      
      if (!user_id || !content_id) {
        return res.status(400).json({ error: 'user_id and content_id required' });
      }
      
      // Check if already viewed
      const existing = await pool.query(
        'SELECT id FROM user_daily_edge WHERE user_id = $1 AND content_id = $2 ORDER BY viewed_at DESC LIMIT 1',
        [user_id, content_id]
      );
      
      let result;
      if (existing.rows.length > 0) {
        // Update existing
        result = await pool.query(`
          UPDATE user_daily_edge 
          SET completed_challenge = true, reflection = COALESCE($3, reflection)
          WHERE id = $1
          RETURNING *
        `, [existing.rows[0].id, user_id, reflection]);
      } else {
        // Insert new
        result = await pool.query(`
          INSERT INTO user_daily_edge (user_id, content_id, completed_challenge, reflection)
          VALUES ($1, $2, true, $3)
          RETURNING *
        `, [user_id, content_id, reflection || null]);
      }
      
      // Update belief progress
      const content = await pool.query('SELECT belief FROM daily_edge_content WHERE id = $1', [content_id]);
      if (content.rows.length > 0) {
        await pool.query(`
          INSERT INTO user_belief_progress (user_id, belief, challenges_completed, last_activity)
          VALUES ($1, $2, 1, NOW())
          ON CONFLICT (user_id, belief) 
          DO UPDATE SET 
            challenges_completed = user_belief_progress.challenges_completed + 1,
            last_activity = NOW()
        `, [user_id, content.rows[0].belief]);
      }
      
      res.json({
        success: true,
        completed: result.rows[0]
      });
      
    } catch (err) {
      console.error('Error completing challenge:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // GET USER STATS
  // Returns user's Daily Edge engagement statistics
  // =====================================================
  router.get('/stats/:user_id', async (req, res) => {
    try {
      const { user_id } = req.params;
      
      // Get streak info
      const streakResult = await pool.query(
        'SELECT * FROM daily_edge_streaks WHERE user_id = $1',
        [user_id]
      );
      
      // Get belief progress
      const progressResult = await pool.query(
        'SELECT * FROM user_belief_progress WHERE user_id = $1',
        [user_id]
      );
      
      // Get recent views
      const viewsResult = await pool.query(`
        SELECT 
          de.content_type,
          de.belief,
          COUNT(*) as count,
          SUM(CASE WHEN ude.completed_challenge THEN 1 ELSE 0 END) as challenges_done
        FROM user_daily_edge ude
        JOIN daily_edge_content de ON ude.content_id = de.id
        WHERE ude.user_id = $1
        GROUP BY de.content_type, de.belief
      `, [user_id]);
      
      // Get total engagement
      const totalResult = await pool.query(`
        SELECT 
          COUNT(*) as total_views,
          COUNT(DISTINCT DATE(viewed_at)) as days_active,
          SUM(CASE WHEN completed_challenge THEN 1 ELSE 0 END) as total_challenges,
          AVG(rating) as avg_rating
        FROM user_daily_edge
        WHERE user_id = $1
      `, [user_id]);
      
      res.json({
        user_id: parseInt(user_id),
        streak: streakResult.rows[0] || { current_streak: 0, longest_streak: 0 },
        belief_progress: progressResult.rows,
        engagement_by_type: viewsResult.rows,
        totals: totalResult.rows[0]
      });
      
    } catch (err) {
      console.error('Error getting user stats:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // GET LEADERBOARD
  // Returns top users by streak and engagement
  // =====================================================
  router.get('/leaderboard', async (req, res) => {
    try {
      const { type = 'streak', limit = 10 } = req.query;
      
      let query;
      if (type === 'streak') {
        query = `
          SELECT 
            des.user_id,
            u.name,
            des.current_streak,
            des.longest_streak,
            des.total_days_active
          FROM daily_edge_streaks des
          LEFT JOIN users u ON des.user_id = u.id
          ORDER BY des.current_streak DESC, des.longest_streak DESC
          LIMIT $1
        `;
      } else if (type === 'challenges') {
        query = `
          SELECT 
            user_id,
            SUM(challenges_completed) as total_challenges
          FROM user_belief_progress
          GROUP BY user_id
          ORDER BY total_challenges DESC
          LIMIT $1
        `;
      } else {
        query = `
          SELECT 
            user_id,
            COUNT(*) as total_views,
            COUNT(DISTINCT DATE(viewed_at)) as days_active
          FROM user_daily_edge
          GROUP BY user_id
          ORDER BY days_active DESC, total_views DESC
          LIMIT $1
        `;
      }
      
      const result = await pool.query(query, [parseInt(limit)]);
      
      res.json({
        type: type,
        leaderboard: result.rows
      });
      
    } catch (err) {
      console.error('Error getting leaderboard:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // ADMIN: ADD CONTENT
  // Adds new Daily Edge content
  // =====================================================
  router.post('/content', async (req, res) => {
    try {
      const { belief, content_type, title, content, source, difficulty, tags } = req.body;
      
      if (!belief || !content_type || !content) {
        return res.status(400).json({ error: 'belief, content_type, and content are required' });
      }
      
      const result = await pool.query(`
        INSERT INTO daily_edge_content (belief, content_type, title, content, source, difficulty, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        belief.toLowerCase(),
        content_type.toLowerCase(),
        title,
        content,
        source || 'PCBancard Coaching',
        difficulty || 'all',
        tags || []
      ]);
      
      res.json({
        success: true,
        content: result.rows[0]
      });
      
    } catch (err) {
      console.error('Error adding content:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // ADMIN: BULK IMPORT
  // Imports content from JSON
  // =====================================================
  router.post('/content/bulk', async (req, res) => {
    try {
      const { daily_edge_content } = req.body;
      
      if (!daily_edge_content || !Array.isArray(daily_edge_content)) {
        return res.status(400).json({ error: 'daily_edge_content array required' });
      }
      
      let imported = 0;
      let errors = [];
      
      for (const item of daily_edge_content) {
        try {
          await pool.query(`
            INSERT INTO daily_edge_content (belief, content_type, title, content, source, difficulty, tags)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            item.belief?.toLowerCase(),
            item.content_type?.toLowerCase(),
            item.title,
            item.content,
            item.source || 'The Salesperson\'s Secret Code',
            item.difficulty || 'all',
            item.tags || []
          ]);
          imported++;
        } catch (err) {
          errors.push({ item: item.title, error: err.message });
        }
      }
      
      res.json({
        success: true,
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (err) {
      console.error('Error bulk importing:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  
  async function updateStreak(pool, user_id) {
    const today = new Date().toISOString().split('T')[0];
    
    // Get current streak record
    const existing = await pool.query(
      'SELECT * FROM daily_edge_streaks WHERE user_id = $1',
      [user_id]
    );
    
    if (existing.rows.length === 0) {
      // Create new streak record
      await pool.query(`
        INSERT INTO daily_edge_streaks (user_id, current_streak, longest_streak, last_active_date, total_days_active)
        VALUES ($1, 1, 1, $2, 1)
      `, [user_id, today]);
    } else {
      const streak = existing.rows[0];
      const lastDate = streak.last_active_date;
      
      if (lastDate === today) {
        // Already logged today, no update needed
        return;
      }
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      let newStreak;
      if (lastDate === yesterdayStr) {
        // Consecutive day - increment streak
        newStreak = streak.current_streak + 1;
      } else {
        // Streak broken - reset to 1
        newStreak = 1;
      }
      
      const newLongest = Math.max(newStreak, streak.longest_streak);
      
      await pool.query(`
        UPDATE daily_edge_streaks 
        SET current_streak = $1, longest_streak = $2, last_active_date = $3, 
            total_days_active = total_days_active + 1, updated_at = NOW()
        WHERE user_id = $4
      `, [newStreak, newLongest, today, user_id]);
    }
  }
  
  function getBeliefDescription(belief) {
    const descriptions = {
      fulfilment: "The drive to achieve and be your best. Top performers are motivated by desire (62%) more than fear (38%).",
      control: "Taking ownership of your outcomes. High performers have an internal locus of control - they shape their own destiny.",
      resilience: "Bouncing back from setbacks and turning stress into growth. The key is balancing stress with strategic recovery.",
      influence: "Building relationships and credibility to open doors. Guerrilla tactics (flexibility) beat Gorilla tactics (force).",
      communication: "Mastering ethos (credibility), pathos (emotion), and logos (logic) to persuade and connect."
    };
    return descriptions[belief] || '';
  }
  
  return router;
};
