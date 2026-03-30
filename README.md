# Security Backend - Node.js + PostgreSQL

A secure and scalable backend API for the Security application built with Node.js, Express, and PostgreSQL.

## Features

- **Authentication**: JWT-based auth with email verification
- **User Management**: CRUD operations with role-based access
- **Dashboard**: Analytics and user statistics
- **Security**: Password hashing, input validation, rate limiting
- **Email Service**: OTP verification via NodeMailer
- **Database**: PostgreSQL with proper indexing and relationships

## Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **Gmail Account** (for email verification)

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd security-backend
npm install
```

### 2. Database Setup

#### Install PostgreSQL
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql postgresql-contrib`

#### Create Database
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE security_db;

-- Create user (optional)
CREATE USER security_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE security_db TO security_user;
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

**Configure your `.env` file:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=security_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080
```

### 4. Gmail Setup for Email Verification

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Use the app password** in your `.env` file

### 5. Initialize Database

```bash
# Run database initialization script
npm run init-db
```

This will:
- Create all necessary tables
- Set up indexes and triggers
- Create a default admin user (`admin / admin123`)

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullname": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "password123",
  "role": "user"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "password123"
}
```

#### Send Verification Email
```http
POST /api/auth/send-verification
Content-Type: application/json

{
  "email": "john@example.com",
  "fullname": "John Doe"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### Verify Token
```http
GET /api/auth/verify-token
Authorization: Bearer <jwt_token>
```

### User Management Endpoints

#### Get Current User
```http
GET /api/users/me
Authorization: Bearer <jwt_token>
```

#### Get All Users (Admin Only)
```http
GET /api/users
Authorization: Bearer <jwt_token>
```

#### Update User Role (Admin Only)
```http
PUT /api/users/:id/role
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "role": "admin"
}
```

#### Update User Status (Admin Only)
```http
PUT /api/users/:id/status
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "is_active": false
}
```

### Dashboard Endpoints

#### Get Dashboard Overview
```http
GET /api/dashboard/overview
Authorization: Bearer <jwt_token>
```

#### Get User Growth Data
```http
GET /api/dashboard/user-growth?period=7d
Authorization: Bearer <jwt_token>
```

#### Search Users
```http
GET /api/dashboard/search?q=john&page=1&limit=10
Authorization: Bearer <jwt_token>
```

## 🔐 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Express-validator for all inputs
- **Rate Limiting**: OTP attempts and email sending limits
- **CORS Protection**: Configured for frontend domain
- **Helmet**: Security headers for Express

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Testing

```bash
# Run health check
curl http://localhost:3000/api/health

# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullname":"Test User","email":"test@example.com","username":"testuser","password":"password123","role":"user"}'
```

## Deployment

### GitHub Pages (Free Hosting)

You can deploy the frontend of Security to GitHub Pages for free:

#### Step 1: Create GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `security-app` (or your preferred name)
3. Make it public or private

#### Step 2: Push Your Code
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Add remote repository
git remote add origin https://github.com/yourusername/security-app.git
git branch -M main
git push -u origin main
```

#### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **GitHub Pages** section
4. Under "Build and deployment", select **GitHub Actions**
5. GitHub Pages will automatically deploy your site

#### Step 4: Access Your Site
Your site will be available at:
```
https://yourusername.github.io/security-app/
```

### Alternative Deployment Platforms

#### Heroku (Free Tier)
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-security-app

# Set environment variables
heroku config:set DB_HOST=your-db-host
heroku config:set DB_NAME=security_db
heroku config:set DB_USER=your-db-user
heroku config:set DB_PASSWORD=your-db-password
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set EMAIL_USER=your-email
heroku config:set EMAIL_PASS=your-email-password

# Deploy
git push heroku main
```

#### Vercel (Free Hosting)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Netlify (Free Hosting)
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy automatically on push to main branch

## 📝 Default Credentials

After running `npm run init-db`:
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@security.com`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify `.env` database credentials
   - Ensure database exists

2. **Email Sending Error**
   - Check Gmail app password
   - Verify 2FA is enabled
   - Check email configuration

3. **JWT Token Error**
   - Verify JWT_SECRET in `.env`
   - Check token expiration

4. **CORS Error**
   - Verify FRONTEND_URL in `.env`
   - Check frontend is making requests to correct port

### Getting Help

- Check the console logs for detailed error messages
- Ensure all environment variables are properly set
- Verify database tables are created correctly
- Check network connectivity for external services
