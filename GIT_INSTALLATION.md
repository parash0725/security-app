# Git Installation & GitHub Deployment Guide

## 📋 Step 1: Install Git

### Option A: Download Git for Windows
1. Go to [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Download **Git for Windows Setup**
3. Run the installer
4. Use default settings (recommended)
5. Restart your computer

### Option B: Install via Package Manager
```bash
# Using Chocolatey
choco install git

# Using Scoop
scoop install git
```

## 📋 Step 2: Verify Git Installation

Open Command Prompt or PowerShell and run:
```bash
git --version
```

You should see something like: `git version 2.40.0.windows.1`

## 📋 Step 3: Configure Git (One-time setup)

```bash
# Set your name
git config --global user.name "Your Name"

# Set your email
git config --global user.email "your.email@example.com"

# Example:
git config --global user.name "Parash Sharma"
git config --global user.email "parash0725@example.com"
```

## 📋 Step 4: Deploy to GitHub

Now you can run the deployment commands:

### 4.1: Initialize Git Repository
```bash
cd "d:\ISMT Collage\Let's Go"
git init
git add .
git commit -m "Initial commit - Security app with Bootstrap UI"
```

### 4.2: Connect to GitHub Repository
```bash
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/security-app.git

# Example:
git remote add origin https://github.com/parash0725/security-app.git
```

### 4.3: Push to GitHub
```bash
git branch -M main
git push -u origin main
```

## 📋 Step 5: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **GitHub Pages** section
4. Under "Build and deployment", select **GitHub Actions**
5. GitHub will automatically deploy your site

## 📋 Step 6: Access Your Live Site

Your site will be available at:
```
https://YOUR_USERNAME.github.io/security-app/
```

Example: `https://parash0725.github.io/security-app/`

## 🚨 Troubleshooting

### Git Not Found Error
- Make sure Git is installed properly
- Restart your computer after installation
- Use Command Prompt (not PowerShell) if needed

### Permission Denied Error
- Check GitHub repository URL
- Verify your GitHub credentials
- Make sure repository is public

### Push Fails
- Check internet connection
- Verify repository URL is correct
- Check if you have write access

### GitHub Pages Not Working
- Wait up to 10 minutes after push
- Check GitHub Actions tab for errors
- Verify repository is public

## 🎯 Quick Commands Summary

Once Git is installed, run these commands in order:

```bash
# 1. Go to project directory
cd "d:\ISMT Collage\Let's Go"

# 2. Initialize git
git init

# 3. Add all files
git add .

# 4. Make first commit
git commit -m "Initial commit - Security app"

# 5. Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/security-app.git

# 6. Push to GitHub
git branch -M main
git push -u origin main
```

## 📚 Alternative: Use GitHub Desktop

If command line is difficult:

1. Download [GitHub Desktop](https://desktop.github.com/)
2. Install and sign in
3. File → Add Local Repository
4. Select "d:\ISMT Collage\Let's Go"
5. Commit files with description
6. Publish repository → GitHub.com

## 🎨 Your Security App Features

✅ **Ready for deployment:**
- Bootstrap UI with modern design
- Gradient backgrounds
- Responsive layout
- Login/signup forms
- Dashboard interface
- Professional branding

Your Security app is ready for GitHub deployment once Git is installed! 🚀
