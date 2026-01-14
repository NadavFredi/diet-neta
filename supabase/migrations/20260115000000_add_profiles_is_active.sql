-- Add active flag to profiles for trainee activation control
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.is_active IS 'Whether the user account is active (trainee access gating)';
