@echo off
REM Smart Lab Database Setup Script for Windows
REM Prerequisites: Docker Desktop running

setlocal DisableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT_DIR=%%~fI"
set "COMPOSE_FILE=%ROOT_DIR%\docker-compose.yml"
set "SCHEMA_FILE=%SCRIPT_DIR%sqlserver\001_schema.sql"
set "SEED_FILE=%SCRIPT_DIR%sqlserver\002_seed_demo.sql"

if not exist "%COMPOSE_FILE%" (
  echo ERROR: docker-compose.yml not found at "%COMPOSE_FILE%"
  pause
  exit /b 1
)

:menu
cls
echo.
echo ========================================
echo  Smart Lab Database Setup
echo ========================================
echo.
echo 1. Start SQL Server container
echo 2. Stop SQL Server container
echo 3. View container logs
echo 4. Create SmartLabDb database
echo 5. Load schema (001_schema.sql)
echo 6. Load seed data (002_seed_demo.sql)
echo 7. Full reset (containers ^+ database ^+ schema ^+ seed)
echo 8. Test connection
echo 9. View DBeaver connection settings
echo 0. Exit
echo.
set /p choice="Enter your choice (0-9): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto logs
if "%choice%"=="4" goto create_db
if "%choice%"=="5" goto load_schema
if "%choice%"=="6" goto load_seed
if "%choice%"=="7" goto full_reset
if "%choice%"=="8" goto test_conn
if "%choice%"=="9" goto dbeaver_settings
if "%choice%"=="0" exit /b 0
goto menu

:start
echo.
echo Starting SQL Server container...
docker compose -f "%COMPOSE_FILE%" up -d sqlserver
echo.
echo Waiting for container to be ready (30 seconds)...
timeout /t 30 /nobreak
echo.
echo Container started! Check status:
docker compose -f "%COMPOSE_FILE%" ps
pause
goto menu

:stop
echo.
echo Stopping SQL Server container...
docker compose -f "%COMPOSE_FILE%" down
echo.
pause
goto menu

:logs
echo.
echo Showing container logs (press Ctrl+C to exit)...
docker compose -f "%COMPOSE_FILE%" logs -f sqlserver
pause
goto menu

:create_db
echo.
echo Recreating SmartLabDb database...
docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd ^
  -C ^
  -S localhost ^
  -U sa ^
  -P "SmartLab@2026!" ^
  -Q "IF DB_ID('SmartLabDb') IS NOT NULL BEGIN ALTER DATABASE SmartLabDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE SmartLabDb; END; CREATE DATABASE SmartLabDb;"
if errorlevel 1 (
  echo ERROR: Failed to recreate SmartLabDb.
  pause
  goto menu
)
echo.
echo Database recreated!
pause
goto menu

:load_schema
echo.
echo Loading schema (001_schema.sql)...
docker cp "%SCHEMA_FILE%" smartlab-sqlserver:/schema.sql
if errorlevel 1 (
  echo ERROR: Failed to copy schema file: "%SCHEMA_FILE%"
  pause
  goto menu
)
docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd ^
  -C ^
  -S localhost ^
  -U sa ^
  -P "SmartLab@2026!" ^
  -d SmartLabDb ^
  -i /schema.sql
if errorlevel 1 (
  echo ERROR: Failed to load schema.
  pause
  goto menu
)
echo.
echo Schema loaded!
pause
goto menu

:load_seed
echo.
echo Loading seed data (002_seed_demo.sql)...
docker cp "%SEED_FILE%" smartlab-sqlserver:/seed.sql
if errorlevel 1 (
  echo ERROR: Failed to copy seed file: "%SEED_FILE%"
  pause
  goto menu
)
docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd ^
  -C ^
  -S localhost ^
  -U sa ^
  -P "SmartLab@2026!" ^
  -d SmartLabDb ^
  -i /seed.sql
if errorlevel 1 (
  echo ERROR: Failed to load seed data.
  pause
  goto menu
)
echo.
echo Seed data loaded!
pause
goto menu

:full_reset
cls
echo.
echo WARNING: This will delete all data and recreate the database
set /p confirm="Continue? (Y/N): "
if /i "%confirm%"!="Y" goto menu

echo.
echo Stopping containers...
docker compose -f "%COMPOSE_FILE%" down -v --remove-orphans
echo.
echo Starting containers...
docker compose -f "%COMPOSE_FILE%" up -d sqlserver
echo.
echo Waiting for container ready...
timeout /t 30 /nobreak
echo.
echo Creating database...
docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd ^
  -C ^
  -S localhost ^
  -U sa ^
  -P "SmartLab@2026!" ^
  -Q "IF DB_ID('SmartLabDb') IS NOT NULL BEGIN ALTER DATABASE SmartLabDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE SmartLabDb; END; CREATE DATABASE SmartLabDb;"
if errorlevel 1 (
  echo ERROR: Failed to recreate SmartLabDb.
  pause
  goto menu
)
echo.
echo Loading schema...
docker cp "%SCHEMA_FILE%" smartlab-sqlserver:/schema.sql
if errorlevel 1 (
  echo ERROR: Failed to copy schema file: "%SCHEMA_FILE%"
  pause
  goto menu
)
docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd ^
  -C ^
  -S localhost ^
  -U sa ^
  -P "SmartLab@2026!" ^
  -d SmartLabDb ^
  -i /schema.sql
if errorlevel 1 (
  echo ERROR: Failed to load schema.
  pause
  goto menu
)
echo.
echo Loading seed data...
docker cp "%SEED_FILE%" smartlab-sqlserver:/seed.sql
if errorlevel 1 (
  echo ERROR: Failed to copy seed file: "%SEED_FILE%"
  pause
  goto menu
)
docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd ^
  -C ^
  -S localhost ^
  -U sa ^
  -P "SmartLab@2026!" ^
  -d SmartLabDb ^
  -i /seed.sql
if errorlevel 1 (
  echo ERROR: Failed to load seed data.
  pause
  goto menu
)
echo.
echo Full reset complete!
pause
goto menu

:test_conn
echo.
echo Testing database connection...
docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd ^
  -C ^
  -S localhost ^
  -U sa ^
  -P "SmartLab@2026!" ^
  -d SmartLabDb ^
  -Q "SELECT 'Connection OK' AS Status; SELECT COUNT(*) AS UserCount FROM smartlab.[User]; SELECT COUNT(*) AS LabCount FROM smartlab.Lab;"
echo.
echo Connection test complete!
pause
goto menu

:dbeaver_settings
cls
echo.
echo ========================================
echo  DBeaver Connection Settings
echo ========================================
echo.
echo Use these settings in DBeaver:
echo.
echo [ Main Tab ]
echo   Server Host: localhost
echo   Port: 11433
echo   Database: master (first), then SmartLabDb
echo   Username: sa
echo   Password: SmartLab@2026!
echo   Save password: [X] checked
echo.
echo [ SSL Tab ]
echo   Require SSL: [X] checked
echo   Trust server certificate: [X] CHECKED
echo.
echo [ Driver Properties ]
echo   encrypt: true
echo   trustServerCertificate: true
echo.
echo For details, see: database\DOCKER_DBEAVER_SETUP.md
echo.
pause
goto menu
