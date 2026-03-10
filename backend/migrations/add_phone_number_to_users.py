import psycopg2
import os
from dotenv import load_dotenv

def migrate():
    load_dotenv()
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL not found in environment")
        return

    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        print("Checking if phone_number column exists...")
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='phone_number';
        """)
        
        if cur.fetchone():
            print("Column 'phone_number' already exists in 'users' table.")
        else:
            print("Adding 'phone_number' column to 'users' table...")
            cur.execute("ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);")
            conn.commit()
            print("Migration successful: 'phone_number' column added.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
