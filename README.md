# 🏠 Residential Apartment Rental Portal

A full-stack web application for managing apartment rental operations — from tenant bookings and lease agreements to admin oversight and analytics. Built for property managers who need a clean, reliable digital portal.

---

## ✨ Features

### Tenant (User) Portal
- 🔐 Register & log in securely (JWT auth)
- 🏢 Browse available flats with filters (location, floor, BHK, price)
- 📅 Request apartment bookings
- 💳 Pay rent monthly with deadline tracking
- 📄 Download lease agreements as PDF
- 🛠️ Submit and track maintenance requests
- ⭐ Write reviews and ratings
- 📋 View payment history and outstanding dues

### Admin Portal
- 📊 Dashboard overview with live statistics
- 🏗️ Manage towers, floors, and units
- ✅ Approve or reject booking requests
- 📁 Manage lease agreements (extend / terminate)
- 🔧 Handle maintenance tickets
- 💰 Track payment records and revenue
- 📈 View analytics with booking and income trends
- 🔍 Audit user activity

---

## 🛠️ Tech Stack

| Layer       | Technology                                 |
|-------------|---------------------------------------------|
| Frontend    | Angular 20 + Tailwind CSS                  |
| Backend     | Python 3.10 + Flask (REST API)             |
| Database    | PostgreSQL                                  |
| Auth        | JWT (PyJWT)                                |
| PDF         | ReportLab                                   |
| Deployment  | Railway (backend) + GitHub                 |

---

## 📁 Project Structure

```
Residential-Apartment-Rental-Portal/
├── backend/                    # Flask REST API
│   ├── app.py                  # Application entry point
│   ├── db.py                   # Database connection
│   ├── requirements.txt        # Python dependencies
│   ├── middleware/             # Auth middleware
│   ├── routes/                 # API route blueprints
│   │   ├── auth_routes.py
│   │   ├── admin_routes.py
│   │   ├── booking_routes.py
│   │   ├── flat_routes.py
│   │   ├── lease_routes.py
│   │   ├── maintenance_routes.py
│   │   ├── payment_routes.py
│   │   └── review_routes.py
│   ├── utils/                  # PDF generator, helpers
│   ├── migrations/             # SQL schema migrations
│   └── static/uploads/         # Uploaded unit images (runtime)
├── frontend/                   # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Feature components
│   │   │   └── services/       # HTTP services
│   │   └── environments/
│   ├── angular.json
│   └── package.json
├── database/                   # Initial schema SQL
├── Dockerfile                  # Docker build file
├── Procfile                    # Railway / Heroku start command
├── nixpacks.toml               # Railway nixpacks config
├── .env.example                # Environment variable template
├── .gitignore
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL 14+
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/Residential-Apartment-Rental-Portal.git
cd Residential-Apartment-Rental-Portal
```

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.example backend/.env
# Then edit backend/.env and fill in your values:
#   DATABASE_URL  — your PostgreSQL connection string
#   JWT_SECRET    — a long random secret key
#   FLASK_ENV     — "development" for local work
#   PORT          — 5000 (or any free port)
```

### 3. Set Up the Database
```bash
# Create the PostgreSQL database
psql -U postgres -c "CREATE DATABASE apartment_db;"

# Run the schema migrations (from the backend folder)
cd backend
for f in migrations/*.sql; do psql $DATABASE_URL -f "$f"; done
```

### 4. Run the Backend
```bash
cd backend

# Create & activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the Flask dev server
python app.py
```
Backend runs at **http://localhost:5000**

### 5. Run the Frontend
```bash
cd frontend

# Install npm packages
npm install

# Start the Angular dev server
npm start
```
Frontend runs at **http://localhost:4200**

---

## 🌩️ Railway Deployment Instructions

The application is structured for seamless deployment on Railway.

### 1. Deploying the Backend
1. Connect your GitHub repository to Railway.
2. Create a new **PostgreSQL** database service in your Railway project.
3. Create a new service from your repository for the Python backend.
4. Go to the backend service variables and add:
   - `DATABASE_URL` (Reference the Railway PostgreSQL variable)
   - `JWT_SECRET` (A strong random string)
   - `FRONTEND_URL` (The URL where your frontend will be hosted)
   - `PORT` = `8080` (or leave default, Railway auto-assigns it)
5. Set the **Root Directory** for the service to `/backend` (if you are deploying the backend as a separate service). If you rely on the root `Procfile`, it will automatically CD into the backend.
6. Railway will automatically detect the Python environment and build it using Nixpacks or the provided `Dockerfile`/`Procfile`.
7. **Note:** Default admin credentials `admin@gmail.com` / `admin123` are injected automatically upon server start!

### 2. Deploying the Frontend
1. Create another service in Railway or Vercel for the Angular frontend.
2. Set the Root Directory to `/frontend`.
3. Override the build command to `npm run build --configuration production`.
4. Ensure the `apiUrl` in `src/environments/environment.prod.ts` points to your deployed backend URL.
5. Deploy and access the app from the provided public domain.

---

## 👤 User Guide

### Tenant Actions
1. **Register** — Create an account at `/register`.
2. **Login** — Log in at `/login` to receive a JWT session token.
3. **Browse Flats** — Use the "Find Flats" page to filter and view available units.
4. **Book a Flat** — Click **Book Now** on any available unit. Your request goes to the admin for approval.
5. **Pay Rent** — Once approved, visit **My Dashboard → Payment** to pay your first month's rent (includes security deposit). Monthly dues appear automatically.
6. **Lease Agreement** — Download your signed lease PDF any time from **My Dashboard → Lease Agreement**.
7. **Maintenance** — Report issues via **My Dashboard → Maintenance**.

### Admin Actions
1. **Admin Login** — Log in with admin credentials to access the Admin Dashboard.
2. **Manage Towers** — Add or deactivate towers under **Manage Towers**.
3. **Manage Units** — Add, edit, and update unit statuses (Available / Rented / Under Maintenance).
4. **Approve Bookings** — Review pending bookings under **Manage Bookings** and approve or reject them.
5. **Lease Management** — Extend or terminate active leases under **Lease Agreements**.
6. **View Analytics** — Use the analytics charts to track income and bookings by day/week/month/year.

---

## 🔐 Demo Credentials

Use the following credentials to test the system's functionality:

### Admin Access
- **Email**: `admin@gmail.com`
- **Password**: `admin123`
- *Role: Can manage towers, flats, and approve bookings.*

### User Access
- **Email**: `suresh@gmail.com`
- **Password**: `Suresh123`
- **Email**: `tarun@gmail.com`
- **Password**: `tarun123`
- *Role: Can browse flats, request bookings, and write reviews.*

---


## 🔒 Security Notes

- JWT tokens expire after a configurable timeout — refresh is not supported; re-login is required.
- Passwords are hashed with **bcrypt** before storage.
- Never commit your `.env` file — it is excluded by `.gitignore`.
- Uploaded images are served as static files and should be placed behind a CDN or object-storage service in production.

---

## 📜 License

This project is for educational and demonstration purposes.

---

*Built with ❤️ by the Apartment Portal Team*
