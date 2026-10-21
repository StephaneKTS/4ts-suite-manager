@echo off
echo ========================================
echo   Lancement du deploiement 4TS-MANAGER
echo ========================================

git add .
set /p msg="Entrez votre message de commit : "
git commit -m "%msg%"
vercel --prod

echo.
echo ========================================
echo   Deploiement termine avec succes !
echo ========================================
pause