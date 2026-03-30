// ============================================
// 👥 USER MANAGEMENT ROUTES
// ============================================

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// ============================================
// 🔐 AUTHENTICATION MIDDLEWARE
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
// 👤 GET CURRENT USER
// ============================================

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const db = req.app.get('db');
        
        const result = await db.query(
            `SELECT id, fullname, email, username, role, email_verified, is_active, created_at 
             FROM users WHERE id = $1`,
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user data'
        });
    }
});

// ============================================
// 👥 GET ALL USERS (ADMIN ONLY)
// ============================================

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = req.app.get('db');
        
        const result = await db.query(
            `SELECT id, fullname, email, username, role, email_verified, is_active, created_at 
             FROM users ORDER BY created_at DESC`
        );
        
        res.json({
            success: true,
            users: result.rows
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users'
        });
    }
});

// ============================================
// 🔄 UPDATE USER ROLE (ADMIN ONLY)
// ============================================

router.put('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }
        
        const db = req.app.get('db');
        
        // Prevent self-role modification
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify your own role'
            });
        }
        
        const result = await db.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, fullname, role',
            [role, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User role updated successfully',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update role'
        });
    }
});

// ============================================
// 🔄 UPDATE USER STATUS (ADMIN ONLY)
// ============================================

router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        
        const db = req.app.get('db');
        
        // Prevent self-deactivation
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify your own status'
            });
        }
        
        const result = await db.query(
            'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, fullname, is_active',
            [is_active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

// ============================================
// 🗑️ DELETE USER (ADMIN ONLY)
// ============================================

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.get('db');
        
        // Prevent self-deletion
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        
        const result = await db.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, fullname',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User deleted successfully',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

// ============================================
// GET USER STATS (ADMIN ONLY)
// ============================================

router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = req.app.get('db');
        
        const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
        const activeUsers = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
        const verifiedUsers = await db.query('SELECT COUNT(*) as count FROM users WHERE email_verified = true');
        const adminUsers = await db.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']);
        
        res.json({
            success: true,
            stats: {
                total: parseInt(totalUsers.rows[0].count),
                active: parseInt(activeUsers.rows[0].count),
                verified: parseInt(verifiedUsers.rows[0].count),
                admins: parseInt(adminUsers.rows[0].count)
            }
        });
        
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user stats'
        });
    }
});

module.exports = router;
