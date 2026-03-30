# Build script for GitHub Pages deployment
Write-Host "Building Security app for GitHub Pages..."

# Create dist directory
New-Item -ItemType Directory -Force -Path "dist" | Out-Null

# Copy files
Copy-Item "index-demo.html" "dist\index.html" -Force
Copy-Item "style.css" "dist\" -Force

# Copy directories
if (Test-Path "register") {
    Copy-Item "register" "dist\register" -Recurse -Force
}

if (Test-Path "dashboard") {
    Copy-Item "dashboard" "dist\dashboard" -Recurse -Force
}

Write-Host "Build completed successfully!"
Write-Host "Files copied to dist/ directory"
