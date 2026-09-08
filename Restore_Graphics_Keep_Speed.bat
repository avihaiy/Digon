@echo off
echo ========================================================
echo Restore PDF Graphics Quality (Keep Speed Fixes)
echo ========================================================
echo.
echo This script will:
echo 1. RESTORE smooth text, clear lines, and high-quality graphics.
echo 2. KEEP security sandboxing and screen reader disabled to prevent freezing.
echo.
echo CRITICAL: ADOBE ACROBAT MUST BE CLOSED NOW!
echo.
pause

:: Paths
set "AcrobatOrig=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\Originals"
set "AcrobatAVDisp=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\AVDisplay"
set "AcrobatAVGen=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\AVGeneral"
set "AcrobatTrust=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\TrustManager"
set "AcrobatPriv=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\Privileged"
set "AcrobatAccess=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\Accessibility"

echo.
echo Restoring default graphics quality...

:: Delete the overrides to restore default high-quality graphics
reg delete "%AcrobatOrig%" /v iAntialiasThreshold /f >nul 2>&1
reg delete "%AcrobatOrig%" /v bAntialiasText /f >nul 2>&1
reg delete "%AcrobatOrig%" /v bAntialiasGraphics /f >nul 2>&1
reg delete "%AcrobatOrig%" /v bAntialiasImages /f >nul 2>&1
reg delete "%AcrobatOrig%" /v bEnhanceThinLines /f >nul 2>&1
reg delete "%AcrobatOrig%" /v bUsePageCache /f >nul 2>&1
reg delete "%AcrobatAVGen%" /v bShowLargeImages /f >nul 2>&1
reg delete "%AcrobatOrig%" /v bShowLargeImages /f >nul 2>&1
reg delete "%AcrobatAVDisp%" /v bUse2DGraphics /f >nul 2>&1
reg delete "%AcrobatAVDisp%" /v bUseHardwareAcceleration /f >nul 2>&1

echo.
echo Keeping anti-freeze settings (Security & Accessibility)...

:: Ensure these stay disabled
reg add "%AcrobatTrust%" /v bProtectedMode /t REG_DWORD /d 0 /f >nul 2>&1
reg add "%AcrobatTrust%" /v bEnhancedSecurityStandalone /t REG_DWORD /d 0 /f >nul 2>&1
reg add "%AcrobatTrust%" /v bEnhancedSecurityInBrowser /t REG_DWORD /d 0 /f >nul 2>&1
reg add "%AcrobatPriv%" /v bProtectedMode /t REG_DWORD /d 0 /f >nul 2>&1
reg add "%AcrobatPriv%" /v bEnableProtectedModeAppContainer /t REG_DWORD /d 0 /f >nul 2>&1
reg add "%AcrobatAccess%" /v iReadingMode /t REG_DWORD /d 0 /f >nul 2>&1
reg add "%AcrobatAccess%" /v bCheckReadMode /t REG_DWORD /d 0 /f >nul 2>&1

echo.
echo Done! Please open Adobe Acrobat and check your PDF.
echo The drawing should look sharp again, without freezing.
echo.
pause
