from dotenv import load_dotenv
import os
import psycopg2

def run():
    load_dotenv()
    db_url = os.environ.get('DATABASE_URL')
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Add booking_id, issue_type, admin_note
        cur.execute('''
        ALTER TABLE maintenance_requests 
        ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS issue_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS admin_note TEXT;
        ''')
        
        conn.commit()
        print('Successfully altered maintenance_requests table.')
    except Exception as e:
        print('Error:', e)
    finally:
        if 'cur' in locals() and cur:
            cur.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == '__main__':
    run()
