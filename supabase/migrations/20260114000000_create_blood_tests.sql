-- =====================================================
-- Blood Tests (Bedikot Dam) Migration
-- Created: 2026-01-14
-- Description: Blood test PDF uploads for leads
-- =====================================================

-- =====================================================
-- TABLE: blood_tests
-- =====================================================

CREATE TABLE IF NOT EXISTS blood_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL, -- Storage path in client-assets bucket
    file_name TEXT NOT NULL, -- Original file name
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blood_tests_lead_id ON blood_tests(lead_id);
CREATE INDEX IF NOT EXISTS idx_blood_tests_upload_date ON blood_tests(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_blood_tests_uploaded_by ON blood_tests(uploaded_by);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_blood_tests_updated_at
    BEFORE UPDATE ON blood_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on blood_tests table
ALTER TABLE blood_tests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view blood tests for leads they have access to
CREATE POLICY "Users can view blood tests for accessible leads"
    ON blood_tests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leads
            WHERE leads.id = blood_tests.lead_id
            AND (
                leads.assigned_to = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'user')
                )
                OR EXISTS (
                    SELECT 1 FROM customers
                    JOIN leads ON leads.customer_id = customers.id
                    WHERE leads.id = blood_tests.lead_id
                    AND customers.id IN (
                        SELECT customer_id FROM profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.role = 'trainee'
                    )
                )
            )
        )
    );

-- Policy: Trainees can insert blood tests for their own customer's leads
CREATE POLICY "Trainees can insert blood tests for their customer"
    ON blood_tests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leads
            JOIN customers ON customers.id = leads.customer_id
            WHERE leads.id = blood_tests.lead_id
            AND customers.id IN (
                SELECT customer_id FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'trainee'
            )
        )
        AND auth.uid() = uploaded_by
    );

-- Policy: Managers/admins can insert blood tests for any lead
CREATE POLICY "Managers can insert blood tests"
    ON blood_tests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'user')
        )
        AND (
            auth.uid() = uploaded_by
            OR uploaded_by IS NULL
        )
    );

-- Policy: Trainees can delete their own blood tests
CREATE POLICY "Trainees can delete their own blood tests"
    ON blood_tests FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM leads
            JOIN customers ON customers.id = leads.customer_id
            WHERE leads.id = blood_tests.lead_id
            AND customers.id IN (
                SELECT customer_id FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'trainee'
            )
        )
        AND uploaded_by = auth.uid()
    );

-- Policy: Managers/admins can delete any blood test
CREATE POLICY "Managers can delete blood tests"
    ON blood_tests FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'user')
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE blood_tests IS 'Blood test PDF files uploaded by clients or managers';
COMMENT ON COLUMN blood_tests.lead_id IS 'Reference to the lead (client)';
COMMENT ON COLUMN blood_tests.file_url IS 'Storage path in client-assets bucket (e.g., customer_id/blood-tests/filename.pdf)';
COMMENT ON COLUMN blood_tests.file_name IS 'Original file name for display';

-- =====================================================
-- Migration Complete
-- =====================================================
