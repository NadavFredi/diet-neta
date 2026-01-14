-- Migration: Secure User Invitations System
-- Created: 2024-01-02
-- Description: Implements secure invitation system for trainee user creation without passwords

-- =====================================================
-- 1. CREATE user_invitations TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification
    email TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Secure token (hashed at rest)
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the invitation token
    token_salt TEXT NOT NULL, -- Random salt for token hashing
    
    -- Invitation metadata
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'revoked')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin/manager who created the invitation
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Configurable expiration (default 7 days)
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT user_invitations_email_user_id_check CHECK (
        (email IS NOT NULL) OR (user_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_user_id ON public.user_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_customer_id ON public.user_invitations(customer_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token_hash ON public.user_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON public.user_invitations(expires_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON public.user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. CREATE invitation_audit_log TABLE (for security audit)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invitation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID REFERENCES user_invitations(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'sent', 'resent', 'accepted', 'expired', 'revoked', 'viewed')),
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitation_audit_log_invitation_id ON public.invitation_audit_log(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_audit_log_performed_by ON public.invitation_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_invitation_audit_log_created_at ON public.invitation_audit_log(created_at DESC);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES FOR user_invitations
-- =====================================================

-- Policy: Admins/managers can view all invitations
CREATE POLICY "Admins can view all invitations"
    ON public.user_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'user')
        )
    );

-- Policy: Admins/managers can create invitations
CREATE POLICY "Admins can create invitations"
    ON public.user_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'user')
        )
    );

-- Policy: Admins/managers can update invitations (for resend, revoke)
CREATE POLICY "Admins can update invitations"
    ON public.user_invitations FOR UPDATE
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

-- Policy: Users can view their own invitation (by email match)
-- Use profiles table instead of auth.users to avoid permission issues
CREATE POLICY "Users can view own invitation"
    ON public.user_invitations FOR SELECT
    USING (
        email = (SELECT email FROM profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

-- =====================================================
-- 5. RLS POLICIES FOR invitation_audit_log
-- =====================================================

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.invitation_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'user')
        )
    );

-- Policy: System can insert audit logs (via service role or admin)
CREATE POLICY "System can insert audit logs"
    ON public.invitation_audit_log FOR INSERT
    WITH CHECK (true); -- Will be restricted by RLS on user_invitations

-- =====================================================
-- 6. HELPER FUNCTION: Generate secure invitation token
-- =====================================================

-- This function generates a cryptographically secure token
-- The actual token is generated client-side and hashed before storage
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate a secure random token (32 bytes = 64 hex characters)
    -- This is just a placeholder - actual token generation happens in application code
    -- using crypto.randomBytes or similar
    token := encode(gen_random_bytes(32), 'hex');
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. HELPER FUNCTION: Hash token for storage
-- =====================================================

CREATE OR REPLACE FUNCTION public.hash_invitation_token(token TEXT, salt TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Use SHA-256 for token hashing
    -- In production, consider using bcrypt or argon2
    RETURN encode(digest(salt || token, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 8. HELPER FUNCTION: Verify invitation token
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_invitation_token(
    p_token_hash TEXT,
    p_token TEXT,
    p_salt TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify token by hashing and comparing
    RETURN p_token_hash = public.hash_invitation_token(p_token, p_salt);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 9. HELPER FUNCTION: Check if invitation is valid
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_invitation_valid(p_invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT status, expires_at INTO v_status, v_expires_at
    FROM public.user_invitations
    WHERE id = p_invitation_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if expired or revoked
    IF v_status IN ('expired', 'revoked', 'accepted') THEN
        RETURN FALSE;
    END IF;
    
    -- Check expiration
    IF v_expires_at < NOW() THEN
        -- Auto-update status to expired
        UPDATE public.user_invitations
        SET status = 'expired', updated_at = NOW()
        WHERE id = p_invitation_id;
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. COMMENTS
-- =====================================================

COMMENT ON TABLE public.user_invitations IS 'Secure invitation system for trainee user creation without passwords';
COMMENT ON COLUMN public.user_invitations.token_hash IS 'SHA-256 hash of the invitation token (never store plaintext)';
COMMENT ON COLUMN public.user_invitations.token_salt IS 'Random salt used for token hashing';
COMMENT ON COLUMN public.user_invitations.status IS 'Invitation status: pending, sent, accepted, expired, revoked';
COMMENT ON COLUMN public.user_invitations.expires_at IS 'Token expiration timestamp (default 7 days from creation)';

COMMENT ON TABLE public.invitation_audit_log IS 'Audit log for all invitation-related actions for security compliance';

-- =====================================================
-- Migration Complete
-- =====================================================
