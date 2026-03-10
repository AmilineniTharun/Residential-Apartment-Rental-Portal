@echo off
echo Starting the Residential Apartment Rental Portal...

echo Starting Backend Server...
start "Backend API" cmd /k "cd backend && venv\Scripts\activate && python app.py"

echo Starting Frontend Server...
start "Frontend Angular" cmd /k "cd frontend && npm start"

echo Both servers are starting. Please check the new command prompt windows.
