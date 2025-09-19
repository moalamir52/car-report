@echo off
echo Updating Car Report with Authentication Fix...

git add .
git commit -m "Fix authentication system - now requires YELO login"
git push origin main

echo.
echo Deploying to GitHub Pages...
npm run deploy

echo.
echo Update complete! Car Report now requires authentication.
pause