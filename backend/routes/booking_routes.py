from flask import Blueprint, request, jsonify
from db import get_db_connection
from middleware.auth import require_auth
import datetime

booking_bp = Blueprint('bookings', __name__)

@booking_bp.route('/', methods=['POST'])
@require_auth
def create_booking():
    data = request.get_json()
    unit_id = data.get('unit_id')
    start_date = data.get('start_date')   # ISO date string e.g. "2026-03-10"
    end_date = data.get('end_date')       # ISO date string e.g. "2026-06-20"
    user_id = request.user['user_id']

    if not unit_id:
        return jsonify({'error': 'Unit ID is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # NEW CHECK: Does user have an active booking in the same tower?
        cur.execute("""
            SELECT b.id FROM bookings b
            JOIN units un ON b.unit_id = un.id
            WHERE un.tower_id = (SELECT tower_id FROM units WHERE id = %s)
              AND b.user_id = %s
              AND b.status IN ('pending', 'approved', 'rented')
        """, (unit_id, user_id))
        if cur.fetchone():
            return jsonify({'error': 'You already have an active booking in this tower. Please request to vacate it before booking another unit.'}), 400

        # Check if unit and its tower are available/active
        cur.execute("""
            SELECT u.status, t.status as tower_status, t.name as tower_name
            FROM units u
            JOIN towers t ON u.tower_id = t.id
            WHERE u.id = %s
        """, (unit_id,))
        unit_info = cur.fetchone()
        
        if not unit_info:
            return jsonify({'error': 'Unit not found'}), 404
            
        if unit_info['tower_status'] == 'inactive':
            return jsonify({'error': f'Booking is currently suspended for {unit_info["tower_name"]} due to operational maintenance. Please try again later.'}), 403
            
        if unit_info['status'] != 'available':
            return jsonify({'error': 'Unit is not available for booking'}), 400

        # Create booking
        cur.execute(
            "INSERT INTO bookings (user_id, unit_id, status) VALUES (%s, %s, 'pending') RETURNING id, status, booking_date",
            (user_id, unit_id)
        )
        new_booking = cur.fetchone()
        booking_id = new_booking['id']

        # Mark unit as 'pending' to prevent double booking
        cur.execute("UPDATE units SET status = 'pending' WHERE id = %s", (unit_id,))

        # If lease dates are provided, persist them in the leases table
        if start_date and end_date:
            cur.execute(
                """INSERT INTO leases (booking_id, start_date, end_date)
                   VALUES (%s, %s, %s)
                   ON CONFLICT (booking_id) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date""",
                (booking_id, start_date, end_date)
            )

        conn.commit()
        return jsonify({'message': 'Booking request submitted', 'booking': new_booking}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@booking_bp.route('/me', methods=['GET'])
@require_auth
def get_my_bookings():
    user_id = request.user['user_id']
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.id, b.status, b.booking_date,
                   u.unit_number, u.bhk, u.price, CAST(u.security_deposit AS FLOAT) as security_deposit, u.image_url, u.floor,
                   t.name as tower_name, t.status as tower_status, t.inactive_reason
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            WHERE b.user_id = %s
            ORDER BY b.booking_date DESC
        """, (user_id,))
        bookings = cur.fetchall()
        return jsonify(bookings), 200
    finally:
        cur.close()
        conn.close()

@booking_bp.route('/my-amenities', methods=['GET'])
@require_auth
def get_my_amenity_statuses():
    user_id = request.user['user_id']
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Get towers for user's active bookings
        cur.execute("""
            SELECT DISTINCT u.tower_id, t.name as tower_name
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            WHERE b.user_id = %s AND b.status IN ('pending', 'approved', 'rented')
        """, (user_id,))
        towers = cur.fetchall()
        
        results = []
        for tower in towers:
            tower_id = tower['tower_id']
            # Get amenities for this tower
            cur.execute("""
                SELECT a.id as amenity_id, a.name, a.description, 
                       COALESCE(tas.status, 'Open') as status,
                       tas.updated_at
                FROM amenities a
                JOIN (
                    SELECT DISTINCT ua.amenity_id 
                    FROM unit_amenities ua
                    JOIN units u ON ua.unit_id = u.id
                    WHERE u.tower_id = %s
                ) ta ON a.id = ta.amenity_id
                LEFT JOIN tower_amenity_status tas ON a.id = tas.amenity_id AND tas.tower_id = %s
                ORDER BY a.name ASC
            """, (tower_id, tower_id))
            amenities = cur.fetchall()
            
            results.append({
                'tower_id': tower_id,
                'tower_name': tower['tower_name'],
                'amenities': amenities
            })
            
        return jsonify(results), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
