
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from db import get_db_connection

def migrate():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        print("Adding 'status' and 'inactive_reason' columns to 'towers' table...")
        
        # Add status column if not exists
        cur.execute("""
            ALTER TABLE towers 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
        """)
        
        # Add inactive_reason column if not exists
        cur.execute("""
            ALTER TABLE towers 
            ADD COLUMN IF NOT EXISTS inactive_reason TEXT
        """)
        
        # Update existing towers to 'active' status if they are NULL
        cur.execute("UPDATE towers SET status = 'active' WHERE status IS NULL")
        
        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate()
