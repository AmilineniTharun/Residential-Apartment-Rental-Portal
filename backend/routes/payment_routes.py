from flask import Blueprint, jsonify, request
from db import get_db_connection
from middleware.auth import require_auth

payment_bp = Blueprint('payments', __name__)

@payment_bp.route('/', methods=['POST'])
@require_auth
def create_payment():
    user_id = request.user['user_id']
    data = request.get_json()
    booking_id = data.get('booking_id')
    
    if not booking_id:
        return jsonify({'error': 'booking_id is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Verify the booking belongs to user & is approved
        cur.execute("""
            SELECT b.id, b.status, u.price 
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            WHERE b.id = %s AND b.user_id = %s
        """, (booking_id, user_id))
        
        booking = cur.fetchone()
        
        if not booking:
            return jsonify({'error': 'Booking not found or does not belong to you'}), 404
            
        if booking['status'] != 'approved':
            return jsonify({'error': 'You can only pay for approved bookings'}), 400
            
        # 2. Check if already paid
        cur.execute("SELECT id FROM payments WHERE booking_id = %s", (booking_id,))
        if cur.fetchone():
            return jsonify({'error': 'This booking has already been paid for'}), 400

        # 3. Insert mock payment
        amount = booking['price']
        cur.execute("""
            INSERT INTO payments (user_id, booking_id, amount, status)
            VALUES (%s, %s, %s, 'paid')
            RETURNING id, payment_date
        """, (user_id, booking_id, amount))
        
        payment_record = cur.fetchone()

        # Update booking status to rented
        cur.execute("UPDATE bookings SET status = 'rented' WHERE id = %s", (booking_id,))
        
        conn.commit()
        
        return jsonify({
            'message': 'Payment successful',
            'payment_id': payment_record['id'],
            'amount': amount,
            'date': payment_record['payment_date']
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@payment_bp.route('/user', methods=['GET'])
@require_auth
def get_user_payments():
    user_id = request.user['user_id']
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT p.id, p.amount, p.status, p.payment_date, 
                   u.unit_number, t.name as tower_name
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            WHERE p.user_id = %s
            ORDER BY p.payment_date DESC
        """, (user_id,))
        
        payments = cur.fetchall()
        return jsonify(payments), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
