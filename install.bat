@echo off
chcp 65001 >nul

echo בדיקת הרשאות מנהל...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ========================================================
    echo שגיאה: הפעולה נכשלה.
    echo יש להפעיל את קובץ ההתקנה כמנהל ^(Run as Administrator^).
    echo ========================================================
    echo.
    pause
    exit /b 1
)

echo.
echo מתקין Java... (jre-8u181-windows-i586.exe)
start /wait "" "%~dp0jre-8u181-windows-i586.exe" /s

echo.
echo מעתיק את תיקיית Metropark ל- C:\Metropark ...
if not exist "C:\Metropark\" mkdir "C:\Metropark"
xcopy "%~dp0Metropark\*" "C:\Metropark\" /E /H /I /Y /Q

echo.
echo מעתיק קיצורי דרך לשולחן העבודה הציבורי...
copy /Y "%~dp0פיקוח.lnk" "%PUBLIC%\Desktop\"
copy /Y "%~dp0חניה.lnk" "%PUBLIC%\Desktop\"

echo.
echo ========================================================
echo ההתקנה הסתיימה בהצלחה!
echo ========================================================
echo.
pause
