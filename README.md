# Residential Apartment Rental Portal

A full-stack solution for managing residential apartment rentals, featuring a modern Angular frontend, a robust Python Flask backend, and a PostgreSQL database.

## 🚀 Overview

The **Residential Apartment Rental Portal** streamlines the process of finding, booking, and managing apartment units. It provides a seamless experience for both tenants and property administrators.

### Key Features
- **User Portal**:
  - Secure registration and JWT-based authentication.
  - Interactive flat browsing with advanced filtering (BHK, Price, Tower, Floor).
  - Detailed unit views with image galleries and amenity lists.
  - Seamless booking request system with lease duration calculation.
  - User dashboard to track maintenance requests and bookings.
  - Integrated reviews and rating system.
- **Admin Dashboard**:
  - Comprehensive management of Towers and Units.
  - Real-time booking approval/rejection workflow.
  - Maintenance request tracking and status updates.
  - Analytics and reporting for property overview.
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop viewports.

## 🛠 Tech Stack

- **Frontend**: Angular 17+, Tailwind CSS, RxJS.
- **Backend**: Python Flask, Flask-CORS, PyJWT, Psycopg2.
- **Database**: PostgreSQL 15.
- **DevOps**: Docker, Docker Compose, Google Cloud Run ready.

## 🏗 Project Structure

```text
├── backend/            # Flask API and server logic
├── frontend/           # Angular application
├── database/           # SQL schema and seed data
├── docker-compose.yml  # Local orchestration
├── Dockerfile          # Root Dockerfile for backend deployment
├── .env.example        # Environment variable template
└── README.md           # Project documentation
```

## 🚦 Local Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js & npm (for manual frontend runs)
- Python 3.10+ (for manual backend runs)

### Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd "Apartment Portal"
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and provide your database credentials and secret keys.*

3. **Run with Docker (Recommended)**
   ```bash
   docker-compose up --build
   ```
   - Frontend: [http://localhost:4200](http://localhost:4200)
   - Backend API: [http://localhost:8080](http://localhost:8080)
   - Database: `localhost:5432`

---

## 👩‍💻 Usage Instructions

### User Actions
- **Browse**: Use the "Find Flats" page to explore available units.
- **Book**: Click "Book Now" on a unit to select lease dates and submit a request.
- **Dashboard**: Track your approved leases and maintenance requests.

### Admin Actions
- **Manage Units**: Add/Edit/Delete towers and units.
- **Bookings**: Review and approve tenant booking requests.
- **Maintenance**: Track and update status of repair requests.

---

## ☁️ Deployment to Google Cloud Run

This project is configured for easy deployment to Google Cloud Run.

1. **Build the Container**
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/rental-backend
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy rental-backend \
     --image gcr.io/[PROJECT_ID]/rental-backend \
     --platform managed \
     --region [REGION] \
     --allow-unauthenticated \
     --set-env-vars DATABASE_URL=[YOUR_CLOUD_SQL_URL],JWT_SECRET=[YOUR_SECRET]
   ```

---

## 📄 License
This project is licensed under the MIT License.
