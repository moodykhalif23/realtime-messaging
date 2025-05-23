@echo off
REM Healthcare Telemedicine System - Database Backup Script (Windows)
REM This script creates automated backups of the MongoDB database

setlocal enabledelayedexpansion

REM Configuration
set DB_NAME=healthcare_telemedicine
set BACKUP_DIR=C:\backups\healthcare
set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=!DATE: =0!
set RETENTION_DAYS=7

echo.
echo 🏥 Healthcare Telemedicine System - Database Backup
echo ==================================================
echo Started at: %date% %time%
echo.

REM Check if MongoDB tools are available
mongodump --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] mongodump command not found
    echo [ERROR] Please install MongoDB Database Tools
    pause
    exit /b 1
)

REM Check MongoDB connection
echo [INFO] Checking MongoDB connection...
mongosh --eval "db.adminCommand('ping')" --quiet >nul 2>&1
if errorlevel 1 (
    echo [ERROR] MongoDB is not accessible
    echo [ERROR] Please ensure MongoDB is running
    pause
    exit /b 1
)
echo [SUCCESS] MongoDB is running and accessible

REM Create backup directory
echo [INFO] Creating backup directory: %BACKUP_DIR%
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if errorlevel 1 (
    echo [ERROR] Failed to create backup directory
    pause
    exit /b 1
)
echo [SUCCESS] Backup directory created/verified

REM Perform database backup
set BACKUP_PATH=%BACKUP_DIR%\%DATE%
echo [INFO] Starting database backup...
echo [INFO] Database: %DB_NAME%
echo [INFO] Backup path: %BACKUP_PATH%

mongodump --db %DB_NAME% --out "%BACKUP_PATH%" --quiet
if errorlevel 1 (
    echo [ERROR] Database backup failed
    pause
    exit /b 1
)
echo [SUCCESS] Database backup completed

REM Compress backup using PowerShell
echo [INFO] Compressing backup...
set COMPRESSED_FILE=%BACKUP_DIR%\healthcare_backup_%DATE%.zip
powershell -command "Compress-Archive -Path '%BACKUP_PATH%' -DestinationPath '%COMPRESSED_FILE%' -Force"
if errorlevel 1 (
    echo [ERROR] Backup compression failed
    pause
    exit /b 1
)
echo [SUCCESS] Backup compressed: healthcare_backup_%DATE%.zip

REM Remove uncompressed backup
rmdir /s /q "%BACKUP_PATH%"
echo [INFO] Uncompressed backup removed

REM Clean up old backups
echo [INFO] Cleaning up backups older than %RETENTION_DAYS% days...
forfiles /p "%BACKUP_DIR%" /m healthcare_backup_*.zip /d -%RETENTION_DAYS% /c "cmd /c del @path" 2>nul
if errorlevel 1 (
    echo [INFO] No old backups to clean up
) else (
    echo [SUCCESS] Old backups cleaned up
)

REM Verify backup
echo [INFO] Verifying backup integrity...
powershell -command "try { Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('%COMPRESSED_FILE%').Dispose(); Write-Host '[SUCCESS] Backup verification passed' } catch { Write-Host '[ERROR] Backup verification failed'; exit 1 }"

REM Show backup statistics
echo.
echo [INFO] Backup Statistics:
dir "%BACKUP_DIR%\healthcare_backup_*.zip" 2>nul | find "File(s)"
echo   Latest backup: healthcare_backup_%DATE%.zip
echo   Retention period: %RETENTION_DAYS% days

echo.
echo [SUCCESS] Backup process completed successfully!
echo Backup file: healthcare_backup_%DATE%.zip
echo.
pause
