"""
Migration: Add approved_at column to bookings table
"""
import sys
import os

# Add parent directory to sys.path to allow importing db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import get_db_connection

def run_migration():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Add approved_at timestamp to bookings
        cur.execute("""
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
        """)
        print("Added approved_at column to bookings table.")
        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    run_migration()
