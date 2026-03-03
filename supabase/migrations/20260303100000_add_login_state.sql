-- Add login_state column to track when user is providing email for login
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS login_state text;

-- Add comment
COMMENT ON COLUMN tenants.login_state IS 'Tracks login flow state: awaiting_email when user needs to provide email for portal access';
