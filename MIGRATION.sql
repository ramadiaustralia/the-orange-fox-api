-- ============================================
-- The Orange Fox Dashboard Refinement Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Task 3: Unsend message feature
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS is_unsent BOOLEAN DEFAULT FALSE;

-- Task 4: Feed approval system
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
UPDATE posts SET status = 'approved' WHERE status IS NULL;

-- Create index for faster approval queries
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- Done!
SELECT 'Migration complete!' AS result;
