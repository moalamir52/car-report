@echo off
echo Updating YELO links to Firebase...

git add .
git commit -m "Update YELO links to Firebase hosting"
git push origin main
npm run deploy

echo.
echo Links updated! Now points to Firebase.
pause