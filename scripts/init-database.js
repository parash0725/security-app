const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'security_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
});

async function initializeDatabase() {
    try {
        console.log('Connecting to database...');
        await pool.connect();
        
        console.log('Creating tables...');
        
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                fullname VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                email_verified BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create otp table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS otp (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                otp_code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_otp_email ON otp(email)');
        
        // Create default admin user
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await pool.query(`
            INSERT INTO users (fullname, email, username, password, role, email_verified)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (username) DO NOTHING
        `, ['System Administrator', 'admin@security.com', 'admin', hashedPassword, 'admin', true]);
        
        console.log('Database initialized successfully!');
        console.log('Default admin user created:');
        console.log('  Username: admin');
        console.log('  Password: admin123');
        console.log('  Email: admin@security.com');
        
    } catch (error) {
        console.error('Database initialization error:', error);
    } finally {
        await pool.end();
    }
}

initializeDatabase();
