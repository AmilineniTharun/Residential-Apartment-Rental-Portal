from dotenv import load_dotenv
import os
import psycopg2

def run():
    load_dotenv()
    db_url = os.environ.get('DATABASE_URL')
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Add service_date as TIMESTAMP to store both date and time
        cur.execute('''
        ALTER TABLE maintenance_requests 
        ADD COLUMN IF NOT EXISTS service_date TIMESTAMP;
        ''')
        
        conn.commit()
        print('Successfully altered maintenance_requests table to add service_date.')
    except Exception as e:
        print('Error:', e)
    finally:
        if 'cur' in locals() and cur:
            cur.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == '__main__':
    run()
