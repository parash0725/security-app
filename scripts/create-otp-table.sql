-- Create OTP codes table for better OTP management
CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    INDEX idx_email (email),
    INDEX idx_expires_at (expires_at)
);

-- Add comment for documentation
COMMENT ON TABLE otp_codes IS 'Stores OTP codes for email verification with expiration tracking';
