@echo off
echo ========================================================
echo Adobe Acrobat and Reader - PDF Performance Fix (ULTIMATE)
echo ========================================================
echo.
echo This script disables:
echo - Smoothing and hardware acceleration
echo - Thin line enhancement
echo - Page cache and large images
echo - Protected Mode (Sandboxing) and AppContainer
echo - Screen Reader / Accessibility tagging
echo.
echo CRITICAL: ADOBE ACROBAT MUST BE CLOSED NOW!
echo If Acrobat is open, it will overwrite these settings when you close it.
echo.
pause

:: For Acrobat Reader DC
set "ReaderOrig=HKCU\SOFTWARE\Adobe\Acrobat Reader\DC\Originals"
set "ReaderAVDisp=HKCU\SOFTWARE\Adobe\Acrobat Reader\DC\AVDisplay"
set "ReaderAVGen=HKCU\SOFTWARE\Adobe\Acrobat Reader\DC\AVGeneral"
set "ReaderTrust=HKCU\SOFTWARE\Adobe\Acrobat Reader\DC\TrustManager"
set "ReaderPriv=HKCU\SOFTWARE\Adobe\Acrobat Reader\DC\Privileged"
set "ReaderAccess=HKCU\SOFTWARE\Adobe\Acrobat Reader\DC\Accessibility"

:: For Adobe Acrobat DC (Pro/Standard)
set "AcrobatOrig=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\Originals"
set "AcrobatAVDisp=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\AVDisplay"
set "AcrobatAVGen=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\AVGeneral"
set "AcrobatTrust=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\TrustManager"
set "AcrobatPriv=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\Privileged"
set "AcrobatAccess=HKCU\SOFTWARE\Adobe\Adobe Acrobat\DC\Accessibility"

echo.
echo Applying registry changes...

:: Disable Smooth Text, Line Art, and Images
reg add "%ReaderOrig%" /v iAntialiasThreshold /t REG_DWORD /d 0 /f 
reg add "%AcrobatOrig%" /v iAntialiasThreshold /t REG_DWORD /d 0 /f 
reg add "%AcrobatOrig%" /v bAntialiasText /t REG_DWORD /d 0 /f 
reg add "%AcrobatOrig%" /v bAntialiasGraphics /t REG_DWORD /d 0 /f 
reg add "%AcrobatOrig%" /v bAntialiasImages /t REG_DWORD /d 0 /f 
reg add "%ReaderOrig%" /v bAntialiasText /t REG_DWORD /d 0 /f 
reg add "%ReaderOrig%" /v bAntialiasGraphics /t REG_DWORD /d 0 /f 
reg add "%ReaderOrig%" /v bAntialiasImages /t REG_DWORD /d 0 /f 

:: Disable Enhance Thin Lines
reg add "%ReaderOrig%" /v bEnhanceThinLines /t REG_DWORD /d 0 /f 
reg add "%AcrobatOrig%" /v bEnhanceThinLines /t REG_DWORD /d 0 /f 

:: Disable Page Cache
reg add "%ReaderOrig%" /v bUsePageCache /t REG_DWORD /d 0 /f 
reg add "%AcrobatOrig%" /v bUsePageCache /t REG_DWORD /d 0 /f 

:: Disable Show Large Images
reg add "%ReaderAVGen%" /v bShowLargeImages /t REG_DWORD /d 0 /f 
reg add "%AcrobatAVGen%" /v bShowLargeImages /t REG_DWORD /d 0 /f 
reg add "%ReaderOrig%" /v bShowLargeImages /t REG_DWORD /d 0 /f 
reg add "%AcrobatOrig%" /v bShowLargeImages /t REG_DWORD /d 0 /f 

:: Disable Local Fonts
reg add "%ReaderOrig%" /v bUseLocalFonts /t REG_DWORD /d 0 /f 
reg add "%AcrobatOrig%" /v bUseLocalFonts /t REG_DWORD /d 0 /f 

:: Disable Hardware Acceleration
reg add "%ReaderAVDisp%" /v bUse2DGraphics /t REG_DWORD /d 0 /f 
reg add "%ReaderAVDisp%" /v bUseHardwareAcceleration /t REG_DWORD /d 0 /f 
reg add "%AcrobatAVDisp%" /v bUse2DGraphics /t REG_DWORD /d 0 /f 
reg add "%AcrobatAVDisp%" /v bUseHardwareAcceleration /t REG_DWORD /d 0 /f 

:: ========================================================
:: Security and Accessibility Fixes
:: ========================================================

:: Protected Mode / Enhanced Security / AppContainer
reg add "%ReaderTrust%" /v bProtectedMode /t REG_DWORD /d 0 /f 
reg add "%ReaderTrust%" /v bEnhancedSecurityStandalone /t REG_DWORD /d 0 /f 
reg add "%ReaderTrust%" /v bEnhancedSecurityInBrowser /t REG_DWORD /d 0 /f 
reg add "%ReaderPriv%" /v bProtectedMode /t REG_DWORD /d 0 /f 
reg add "%ReaderPriv%" /v bEnableProtectedModeAppContainer /t REG_DWORD /d 0 /f 

reg add "%AcrobatTrust%" /v bProtectedMode /t REG_DWORD /d 0 /f 
reg add "%AcrobatTrust%" /v bEnhancedSecurityStandalone /t REG_DWORD /d 0 /f 
reg add "%AcrobatTrust%" /v bEnhancedSecurityInBrowser /t REG_DWORD /d 0 /f 
reg add "%AcrobatPriv%" /v bProtectedMode /t REG_DWORD /d 0 /f 
reg add "%AcrobatPriv%" /v bEnableProtectedModeAppContainer /t REG_DWORD /d 0 /f 

:: Accessibility / Screen Reader (Stop Acrobat from reading CAD files)
reg add "%ReaderAccess%" /v iReadingMode /t REG_DWORD /d 0 /f 
reg add "%ReaderAccess%" /v bCheckReadMode /t REG_DWORD /d 0 /f 
reg add "%AcrobatAccess%" /v iReadingMode /t REG_DWORD /d 0 /f 
reg add "%AcrobatAccess%" /v bCheckReadMode /t REG_DWORD /d 0 /f 

echo.
echo Settings applied successfully! 
echo.
pause
