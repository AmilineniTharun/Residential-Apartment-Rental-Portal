import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def init_db():
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL is not set!")
        return

    print(f"Connecting to database: {db_url}")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # Execute main schema
        schema_path = os.path.join(os.path.dirname(__file__), 'database', 'schema.sql')
        if not os.path.exists(schema_path):
            # Fallback path if running inside backend/
            schema_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'schema.sql')
            
        print(f"Reading schema from: {schema_path}")
        with open(schema_path, 'r') as file:
            schema_sql = file.read()
            
        cur.execute(schema_sql)
        print("Main schema executed.")

        # Execute migrations safely
        print("Adding reset_password_token to users...")
        cur.execute("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
            ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;
        """)

        print("Creating maintenance_requests table...")
        cur.execute('''
            CREATE TABLE IF NOT EXISTS maintenance_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                issue TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')

        print("Creating tower_amenity_status table...")
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

        conn.commit()
        print("Database initialized successfully!")

    except Exception as e:
        print(f"Error initializing database: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()
    finally:
        if 'cur' in locals() and cur:
            cur.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == '__main__':
    init_db()
