// ============================================
// 🔐 AUTHENTICATION ROUTES
// ============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const router = express.Router();

// ============================================
// 📧 EMAIL CONFIGURATION
// ============================================

const transport = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    debug: true, // Enable debug logging
    logger: true  // Enable logger
});

// Verify transporter configuration
transport.verify((error, success) => {
    if (error) {
        console.error("SMTP Error:", error);
    } else {
        console.log("SMTP Ready");
    }
});

// Test email configuration
async function testEmailConfig() {
    try {
        await transporter.verify();
        console.log('✅ Email configuration verified successfully');
        return true;
    } catch (error) {
        console.error('❌ Email configuration failed:', error);
        return false;
    }
}

// Proper OTP sending function
const sendOTP = async (email, otp) => {
    try {
        const info = await transport.sendMail({
            from: `"Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "OTP Verification",
            text: `Your OTP is ${otp}. It expires in 2 minutes.`,
        });

        console.log("Email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("Email sending failed:", error);
        return false;
    }
};

// ============================================
// 🔐 UTILITY FUNCTIONS
// ============================================

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate JWT token
function generateToken(userId, email, role) {
    return jwt.sign(
        { userId, email, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
}

// Verify reCAPTCHA response
async function verifyRecaptcha(recaptchaResponse) {
    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return false;
    }
}

// ============================================
// 📝 VALIDATION MIDDLEWARE
// ============================================

const validateRegistration = [
    body('fullname').trim().isLength({ min: 2, max: 50 }).withMessage('Fullname must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('username').trim().isLength({ min: 3, max: 20 }).isAlphanumeric().withMessage('Username must be 3-20 alphanumeric characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin')
];

const validateLogin = [
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required')
];

// ============================================
// 📧 EMAIL VERIFICATION
// ============================================

// In-memory OTP store (use Redis in production)
const otpStore = new Map();

// Send verification email
router.post('/send-verification', async (req, res) => {
    try {
        const { email, fullname } = req.body;
        const db = req.app.get('db');
        
        // Test email configuration first
        const emailConfigValid = await testEmailConfig();
        if (!emailConfigValid) {
            console.log('⚠️ Email configuration failed, using demo mode');
            const otp = generateOTP();
            
            return res.json({ 
                success: true, 
                message: 'Demo mode: Email service unavailable',
                demoCode: otp,
                isDemo: true
            });
        }
        
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // 1 minute expiry
        
        // Store OTP in database
        await db.query(
            `INSERT INTO otp_codes (email, otp, expires_at) VALUES ($1, $2, $3)`,
            [email, otp, expiresAt]
        );

        // Use the proper sendOTP function
        const emailSent = await sendOTP(email, otp);
        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email'
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Verification email sent',
            demoCode: otp // For development only
        });
        
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send verification email' 
        });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const db = req.app.get('db');
        
        // Get OTP from database
        const result = await db.query(
            `SELECT otp, expires_at, attempts FROM otp_codes WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.json({ success: false, message: 'No OTP found' });
        }
        
        const stored = result.rows[0];
        
        // Check expiry (1 minute)
        if (new Date() > new Date(stored.expires_at)) {
            // Clean up expired OTP
            await db.query('DELETE FROM otp_codes WHERE email = $1', [email]);
            return res.json({ success: false, message: 'OTP expired' });
        }
        
        // Check attempts (max 3)
        if (stored.attempts >= 3) {
            await db.query('DELETE FROM otp_codes WHERE email = $1', [email]);
            return res.json({ success: false, message: 'Too many attempts' });
        }
        
        // Increment attempts
        await db.query(
            'UPDATE otp_codes SET attempts = $1 WHERE email = $2',
            [stored.attempts + 1, email]
        );
        
        // Check OTP
        if (stored.otp !== otp) {
            return res.json({ success: false, message: 'Invalid OTP' });
        }
        
        // OTP is valid - delete it and update user
        await db.query('DELETE FROM otp_codes WHERE email = $1', [email]);
        await db.query(
            'UPDATE users SET email_verified = true WHERE email = $1',
            [email]
        );
        
        res.json({ success: true, message: 'Email verified successfully' });
        
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
});

// ============================================
// 👤 USER REGISTRATION
// ============================================

router.post('/register', validateRegistration, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { fullname, email, username, password, role, recaptchaResponse } = req.body;
        const db = req.app.get('db');

        // Verify reCAPTCHA
        if (!recaptchaResponse) {
            return res.status(400).json({
                success: false,
                message: 'reCAPTCHA verification is required'
            });
        }

        const isValidRecaptcha = await verifyRecaptcha(recaptchaResponse);
        if (!isValidRecaptcha) {
            return res.status(400).json({
                success: false,
                message: 'reCAPTCHA verification failed'
            });
        }

        // Check if user exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const result = await db.query(
            `INSERT INTO users (fullname, email, username, password, role, email_verified, created_at) 
             VALUES ($1, $2, $3, $4, $5, false, NOW()) RETURNING id, fullname, email, username, role`,
            [fullname, email, username, hashedPassword, role]
        );

        const user = result.rows[0];

        // Generate and send OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // 1 minute expiry
        
        // Store OTP in database
        await db.query(
            `INSERT INTO otp_codes (email, otp, expires_at) VALUES ($1, $2, $3)`,
            [email, otp, expiresAt]
        );

        // Send verification email
        const emailSent = await sendOTP(email, otp);
        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email'
            });
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully! Please check your email for verification.',
            demoCode: otp, // For development
            user: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// ============================================
// 🔑 USER LOGIN
// ============================================

router.post('/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, password, recaptchaResponse } = req.body;
        const db = req.app.get('db');

        // Verify reCAPTCHA
        if (!recaptchaResponse) {
            return res.status(400).json({
                success: false,
                message: 'reCAPTCHA verification is required'
            });
        }

        const isValidRecaptcha = await verifyRecaptcha(recaptchaResponse);
        if (!isValidRecaptcha) {
            return res.status(400).json({
                success: false,
                message: 'reCAPTCHA verification failed'
            });
        }

        // Find user
        const result = await db.query(
            'SELECT id, fullname, email, username, password, role, email_verified, is_active FROM users WHERE username = $1 OR email = $2',
            [username, username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Check email verification
        if (!user.email_verified) {
            return res.status(401).json({
                success: false,
                message: 'Please verify your email first'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = generateToken(user.id, user.email, user.role);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// ============================================
// VERIFY TOKEN
// ============================================

router.get('/verify-token', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const db = req.app.get('db');

        const result = await db.query(
            'SELECT id, fullname, email, username, role FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

module.exports = router;
