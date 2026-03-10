from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Import blueprints (to be created)
from routes.auth_routes import auth_bp
from routes.flat_routes import flat_bp
from routes.booking_routes import booking_bp
from routes.admin_routes import admin_bp
from routes.review_routes import review_bp
from routes.recommendation_routes import recommendation_bp
from routes.payment_routes import payment_bp
from routes.lease_routes import lease_bp
from routes.maintenance_routes import maintenance_bp

load_dotenv()

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    CORS(app) # Enable CORS for all routes

    # Ensure upload directory exists
    os.makedirs(os.path.join(app.root_path, 'static', 'uploads'), exist_ok=True)

    # Initialize database tables and default admin user
    def init_db():
        from db import get_db_connection
        import bcrypt
        try:
            conn = get_db_connection()
            cur = conn.cursor()

            # 1. First, create all tables using embedded schema to avoid missing file context on Railway
            schema_sql = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS towers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    floors INT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    tower_id INT NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    unit_number VARCHAR(20) NOT NULL,
    bhk INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    image_url VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_units_tower_id ON units(tower_id);
CREATE INDEX IF NOT EXISTS idx_units_bhk ON units(bhk);
CREATE INDEX IF NOT EXISTS idx_units_price ON units(price);

CREATE TABLE IF NOT EXISTS unit_images (
    id SERIAL PRIMARY KEY,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unit_images_unit_id ON unit_images(unit_id);


CREATE TABLE IF NOT EXISTS amenities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS unit_amenities (
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    amenity_id INT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (unit_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_unit_id ON bookings(unit_id);

CREATE TABLE IF NOT EXISTS leases (
    id SERIAL PRIMARY KEY,
    booking_id INT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    rent_amount DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_unit_id ON reviews(unit_id);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'paid' NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lease_requests (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('terminate', 'extend', 'vacate')),
    extend_days INT,
    new_end_date DATE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_note TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
"""
            cur.execute(schema_sql)

            # 2. Add any subsequent table modifications/migrations
            cur.execute("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
                ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP,
                ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
            """)

            cur.execute("""
                ALTER TABLE towers
                ADD COLUMN IF NOT EXISTS description TEXT,
                ADD COLUMN IF NOT EXISTS image_url TEXT,
                ADD COLUMN IF NOT EXISTS state VARCHAR(100),
                ADD COLUMN IF NOT EXISTS city VARCHAR(100),
                ADD COLUMN IF NOT EXISTS area VARCHAR(100),
                ADD COLUMN IF NOT EXISTS street VARCHAR(150),
                ADD COLUMN IF NOT EXISTS units_per_floor INT DEFAULT 4,
                ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
                ADD COLUMN IF NOT EXISTS inactive_reason TEXT;
            """)

            cur.execute("""
                ALTER TABLE units
                ADD COLUMN IF NOT EXISTS description TEXT,
                ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10, 2),
                ADD COLUMN IF NOT EXISTS floor VARCHAR(20),
                ADD COLUMN IF NOT EXISTS wing VARCHAR(20),
                ADD COLUMN IF NOT EXISTS location TEXT,
                ADD COLUMN IF NOT EXISTS available_from DATE;
            """)

            cur.execute("""
                DO $$
                BEGIN
                    ALTER TABLE leases ADD CONSTRAINT leases_booking_id_unique UNIQUE (booking_id);
                EXCEPTION WHEN duplicate_table OR duplicate_object THEN
                    NULL;
                END $$;
            """)

            cur.execute("""
                ALTER TABLE bookings
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
            """)

            cur.execute("""
                ALTER TABLE maintenance_requests
                ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
                ADD COLUMN IF NOT EXISTS issue_type VARCHAR(100),
                ADD COLUMN IF NOT EXISTS admin_note TEXT,
                ADD COLUMN IF NOT EXISTS service_date TIMESTAMP,
                ADD COLUMN IF NOT EXISTS rating INTEGER,
                ADD COLUMN IF NOT EXISTS user_feedback TEXT;
            """)

            cur.execute('''
                CREATE TABLE IF NOT EXISTS maintenance_requests (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
                    issue_type VARCHAR(100),
                    issue TEXT NOT NULL,
                    admin_note TEXT,
                    service_date TIMESTAMP,
                    rating INTEGER,
                    user_feedback TEXT,
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            ''')

            cur.execute('''
                CREATE TABLE IF NOT EXISTS tower_amenity_status (
                    id SERIAL PRIMARY KEY,
                    tower_id INTEGER REFERENCES towers(id) ON DELETE CASCADE,
                    amenity_id INTEGER REFERENCES amenities(id) ON DELETE CASCADE,
                    status VARCHAR(50) DEFAULT 'Open',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(tower_id, amenity_id)
                );
            ''')
            
            # 3. Check if admin exists and insert if not
            cur.execute("SELECT id FROM users WHERE email = 'admin@gmail.com'")
            if not cur.fetchone():
                hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cur.execute(
                    "INSERT INTO users (email, password_hash, role, full_name, phone_number) VALUES (%s, %s, %s, %s, %s)",
                    ('admin@gmail.com', hashed_password, 'admin', 'System Admin', '0000000000')
                )
                print("Default admin user created.")

            # 4. Data Migration: Fix hardcoded localhost image URLs
            cur.execute("""
                UPDATE units SET image_url = REPLACE(image_url, 'http://localhost:5000', '') 
                WHERE image_url LIKE 'http://localhost:5000%';
                
                UPDATE unit_images SET image_url = REPLACE(image_url, 'http://localhost:5000', '') 
                WHERE image_url LIKE 'http://localhost:5000%';
            """)
                
            conn.commit()
            print("Database tables & admin user successfully initialized on startup.")
            cur.close()
            conn.close()
        except Exception as e:
            # We want to see this explicitly in Railway logs
            import traceback
            print(f"CRITICAL ERROR initializing DB schema: {e}")
            traceback.print_exc()
            
    with app.app_context():
        # Only initialize if NOT imported by a worker to avoid race conditions, or if explicitly needed
        init_db()

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(flat_bp, url_prefix='/api/flats')
    app.register_blueprint(booking_bp, url_prefix='/api/bookings')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(review_bp, url_prefix='/api/reviews')
    app.register_blueprint(recommendation_bp, url_prefix='/api/recommendations')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')
    app.register_blueprint(lease_bp, url_prefix='/api/lease')
    app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')

    @app.errorhandler(Exception)
    def handle_exception(e):
        # Global error handler
        return jsonify({"error": str(e)}), 500

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "ok", "message": "API is running!"}), 200

    return app

app = create_app()

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
