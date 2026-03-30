// ============================================
// DASHBOARD ROUTES
// ============================================

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
}

// Admin-only middleware
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    next();
}

// ============================================
// GET DASHBOARD OVERVIEW
// ============================================

router.get('/overview', authenticateToken, async (req, res) => {
    try {
        const db = req.app.get('db');
        
        // Get basic stats
        const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
        const activeUsers = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
        const newUsersToday = await db.query(`
            SELECT COUNT(*) as count FROM users 
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        // Get recent users
        const recentUsers = await db.query(`
            SELECT id, fullname, username, email, created_at 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        // User role distribution
        const roleStats = await db.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role
        `);
        
        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers: parseInt(totalUsers.rows[0].count),
                    activeUsers: parseInt(activeUsers.rows[0].count),
                    newUsersToday: parseInt(newUsersToday.rows[0].count)
                },
                recentUsers: recentUsers.rows,
                roleStats: roleStats.rows
            }
        });
        
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard data'
        });
    }
});

// ============================================
// 📈 GET USER GROWTH DATA
// ============================================

router.get('/user-growth', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        const db = req.app.get('db');
        
        let query, interval;
        
        switch (period) {
            case '7d':
                query = `
                    SELECT DATE(created_at) as date, COUNT(*) as count 
                    FROM users 
                    WHERE created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY DATE(created_at)
                    ORDER BY date
                `;
                break;
            case '30d':
                query = `
                    SELECT DATE(created_at) as date, COUNT(*) as count 
                    FROM users 
                    WHERE created_at >= NOW() - INTERVAL '30 days'
                    GROUP BY DATE(created_at)
                    ORDER BY date
                `;
                break;
            case '90d':
                query = `
                    SELECT DATE_TRUNC('week', created_at) as date, COUNT(*) as count 
                    FROM users 
                    WHERE created_at >= NOW() - INTERVAL '90 days'
                    GROUP BY DATE_TRUNC('week', created_at)
                    ORDER BY date
                `;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid period. Use 7d, 30d, or 90d'
                });
        }
        
        const result = await db.query(query);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('User growth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user growth data'
        });
    }
});

// ============================================
// 📧 GET EMAIL VERIFICATION STATS
// ============================================

router.get('/email-stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = req.app.get('db');
        
        const verificationStats = await db.query(`
            SELECT 
                email_verified,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
            FROM users 
            GROUP BY email_verified
            ORDER BY email_verified DESC
        `);
        
        const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
        
        res.json({
            success: true,
            data: {
                verificationStats: verificationStats.rows,
                totalUsers: parseInt(totalUsers.rows[0].count)
            }
        });
        
    } catch (error) {
        console.error('Email stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get email stats'
        });
    }
});

// ============================================
// SEARCH USERS
// ============================================

router.get('/search', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { q = '', page = 1, limit = 10 } = req.query;
        const db = req.app.get('db');
        
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT id, fullname, username, email, role, email_verified, is_active, created_at 
            FROM users 
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;
        
        if (q) {
            query += ` AND (fullname ILIKE $${paramIndex} OR username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            params.push(`%${q}%`);
            paramIndex++;
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
        let countParams = [];
        let countIndex = 1;
        
        if (q) {
            countQuery += ` AND (fullname ILIKE $${countIndex} OR username ILIKE $${countIndex} OR email ILIKE $${countIndex})`;
            countParams.push(`%${q}%`);
        }
        
        const countResult = await db.query(countQuery, countParams);
        const totalItems = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalItems / limit);
        
        res.json({
            success: true,
            data: {
                users: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
});

// ============================================
// 📝 GET ACTIVITY LOG
// ============================================

router.get('/activity', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const db = req.app.get('db');
        
        // For now, return recent registrations
        // In a real app, you'd have an activity_logs table
        const result = await db.query(`
            SELECT 
                id, fullname, username, email, created_at,
                'user_registered' as action,
                'User registered successfully' as description
            FROM users 
            ORDER BY created_at DESC 
            LIMIT $1
        `, [limit]);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Activity log error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get activity log'
        });
    }
});

module.exports = router;
