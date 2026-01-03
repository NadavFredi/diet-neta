-- =====================================================
-- Weekly Reviews Migration
-- Created: 2026-01-03
-- Description: Weekly strategy review module for trainer-client communication
-- =====================================================

-- =====================================================
-- TABLE: weekly_reviews
-- =====================================================

CREATE TABLE IF NOT EXISTS weekly_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Week identification
    week_start_date DATE NOT NULL, -- First day of the week (typically Sunday or Monday)
    week_end_date DATE NOT NULL,   -- Last day of the week
    
    -- Current Goals (from active budget/protocol at time of review)
    target_calories INTEGER,
    target_protein INTEGER, -- grams
    target_carbs INTEGER,  -- grams
    target_fat INTEGER,     -- grams
    target_fiber INTEGER,   -- grams
    target_steps INTEGER,
    
    -- Actual Averages (calculated from daily_check_ins for the week)
    actual_calories_avg NUMERIC(10,2),
    actual_protein_avg NUMERIC(10,2),
    actual_carbs_avg NUMERIC(10,2),
    actual_fat_avg NUMERIC(10,2),
    actual_fiber_avg NUMERIC(10,2),
    actual_calories_weekly_avg NUMERIC(10,2), -- Weekly average of daily calories
    
    -- Body Metrics
    weekly_avg_weight NUMERIC(5,2), -- Average weight for the week
    waist_measurement INTEGER,        -- Latest waist measurement from body metrics (cm)
    
    -- Trainer Inputs
    trainer_summary TEXT,             -- סיכום ומסקנות (Summary & Insights)
    action_plan TEXT,                 -- דגשים לשבוע הקרוב (Focus for next week)
    
    -- Protocol Updates (for next week)
    updated_steps_goal INTEGER,       -- Updated step goal for following week
    updated_calories_target INTEGER, -- Updated calorie target for following week
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure one review per lead/customer per week
    UNIQUE(lead_id, week_start_date),
    UNIQUE(customer_id, week_start_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_lead_id ON weekly_reviews(lead_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_customer_id ON weekly_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week_start ON weekly_reviews(week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_created_at ON weekly_reviews(created_at DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_weekly_reviews_updated_at
    BEFORE UPDATE ON weekly_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Trainees can view their own weekly reviews
CREATE POLICY "Trainees can view own weekly reviews"
    ON weekly_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = weekly_reviews.customer_id
            AND customers.user_id = auth.uid()
        )
    );

-- Policy: Coaches/admins can view all weekly reviews
CREATE POLICY "Coaches can view all weekly reviews"
    ON weekly_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'user')
        )
    );

-- Policy: Coaches/admins can insert weekly reviews
CREATE POLICY "Coaches can insert weekly reviews"
    ON weekly_reviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'user')
        )
    );

-- Policy: Coaches/admins can update weekly reviews
CREATE POLICY "Coaches can update weekly reviews"
    ON weekly_reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'user')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'user')
        )
    );

-- Policy: Coaches/admins can delete weekly reviews
CREATE POLICY "Coaches can delete weekly reviews"
    ON weekly_reviews FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'user')
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE weekly_reviews IS 'Weekly strategy reviews linking trainer insights with client check-in data';
COMMENT ON COLUMN weekly_reviews.week_start_date IS 'First day of the week being reviewed';
COMMENT ON COLUMN weekly_reviews.week_end_date IS 'Last day of the week being reviewed';
COMMENT ON COLUMN weekly_reviews.target_calories IS 'Target calories from active budget/protocol at time of review';
COMMENT ON COLUMN weekly_reviews.actual_calories_avg IS 'Average daily calories from check-ins during the week';
COMMENT ON COLUMN weekly_reviews.weekly_avg_weight IS 'Average weight for the week from daily check-ins';
COMMENT ON COLUMN weekly_reviews.waist_measurement IS 'Latest waist measurement from body metrics section';
COMMENT ON COLUMN weekly_reviews.trainer_summary IS 'Trainer summary and insights (סיכום ומסקנות)';
COMMENT ON COLUMN weekly_reviews.action_plan IS 'Action plan for next week (דגשים לשבוע הקרוב)';

-- =====================================================
-- Migration Complete
-- =====================================================

