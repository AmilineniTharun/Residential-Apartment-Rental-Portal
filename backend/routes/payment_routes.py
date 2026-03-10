from flask import Blueprint, jsonify, request
from db import get_db_connection
from middleware.auth import require_auth
from datetime import datetime, timezone, timedelta, date

payment_bp = Blueprint('payments', __name__)

PAYMENT_DEADLINE_MINUTES = 5


def _expire_booking(cur, booking_id, unit_id):
    """Mark booking expired: insert failed payment, reset booking + unit."""
    cur.execute("""
        INSERT INTO payments (user_id, booking_id, amount, status)
        SELECT b.user_id, b.id, u.price + COALESCE(u.security_deposit, 0), 'failed'
        FROM bookings b JOIN units u ON b.unit_id = u.id
        WHERE b.id = %s
    """, (booking_id,))
    cur.execute("UPDATE bookings SET status = 'rejected' WHERE id = %s", (booking_id,))
    cur.execute("UPDATE units SET status = 'available' WHERE id = %s", (unit_id,))

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
            SELECT b.id, b.status, b.unit_id, b.approved_at, u.price, u.security_deposit 
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            WHERE b.id = %s AND b.user_id = %s
        """, (booking_id, user_id))
        
        booking = cur.fetchone()
        
        if not booking:
            return jsonify({'error': 'Booking not found or does not belong to you'}), 404
            
        if booking['status'] != 'approved':
            return jsonify({'error': 'You can only pay for approved bookings'}), 400

        # 2. Enforce 5-minute payment deadline
        if booking['approved_at']:
            approved_at = booking['approved_at']
            # Make timezone-aware if naive
            if approved_at.tzinfo is None:
                approved_at = approved_at.replace(tzinfo=timezone.utc)
            deadline = approved_at + timedelta(minutes=PAYMENT_DEADLINE_MINUTES)
            now_utc = datetime.now(timezone.utc)
            if now_utc > deadline:
                # Auto-expire: mark failed, reset unit
                _expire_booking(cur, booking['id'], booking['unit_id'])
                conn.commit()
                return jsonify({
                    'error': 'Payment deadline expired. The booking has been cancelled and the unit is now available again.'
                }), 400
            
        # 3. Calculate Penalty based on Dues
        cur.execute("SELECT count(*) as count FROM payments WHERE booking_id = %s", (booking_id,))
        payment_count = cur.fetchone()['count']
        
        now = datetime.now(timezone.utc)
        
        # Fetch lease start date
        cur.execute("SELECT start_date FROM leases WHERE booking_id = %s", (booking_id,))
        lease = cur.fetchone()
        
        amount = float(booking['price'])
        penalty = 0
        
        # Add security deposit if it's the first payment
        if payment_count == 0:
            amount += float(booking['security_deposit'] or 0)
        
        if lease and lease['start_date']:
            start_date = lease['start_date']
            now_utc = datetime.utcnow()
            months_elapsed = (now_utc.year - start_date.year) * 12 + (now_utc.month - start_date.month)
            
            # If they haven't paid for past months yet, this payment is for a past month -> Penalty
            if payment_count < months_elapsed:
                penalty = float(booking['price']) * 0.10
                amount += penalty
        
        # Note: If they are paying for the current month (payment_count == months_elapsed), penalty is 0 
        # as requested ("shows present month rent also without penality")

        # 4. Insert payment
        cur.execute("""
            INSERT INTO payments (user_id, booking_id, amount, status)
            VALUES (%s, %s, %s, 'paid')
            RETURNING id, payment_date
        """, (user_id, booking_id, amount))
        
        payment_record = cur.fetchone()

        # Update booking status to rented
        cur.execute("UPDATE bookings SET status = 'rented' WHERE id = %s", (booking_id,))
        
        # Update associated unit status to 'rented' (from 'booked')
        cur.execute("""
            UPDATE units 
            SET status = 'rented' 
            WHERE id = (SELECT unit_id FROM bookings WHERE id = %s)
        """, (booking_id,))
        
        conn.commit()
        
        return jsonify({
            'message': 'Payment successful',
            'payment_id': payment_record['id'],
            'amount': amount,
            'penalty': penalty,
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
        # 1. Get actual payments
        cur.execute("""
            SELECT p.id, p.amount, p.status, p.payment_date, 
                   u.unit_number, u.floor, t.name as tower_name, p.booking_id
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            WHERE p.user_id = %s
            ORDER BY p.payment_date DESC
        """, (user_id,))
        payments = cur.fetchall()

        # 2. Add "Pending" payments for current/past months if missing
        # For simplicity, we'll calculate dues and append them as 'pending'
        cur.execute("""
            SELECT b.id as booking_id, u.unit_number, u.floor, u.price, t.name as tower_name,
                   l.start_date
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            JOIN leases l ON l.booking_id = b.id
            WHERE b.user_id = %s AND b.status IN ('approved', 'rented')
        """, (user_id,))
        active_leases = cur.fetchall()
        now = datetime.now(timezone.utc)

        
        all_items = []
        for p in payments:
            item = dict(p)
            item['type'] = 'payment'
            all_items.append(item)

        for lease in active_leases:
            # Calculate months since start
            start_date = lease['start_date']
            if not start_date: continue
            
            # Simple check: how many payments exist for this booking?
            cur.execute("SELECT count(*) as count FROM payments WHERE booking_id = %s", (lease['booking_id'],))
            payment_count = cur.fetchone()['count']
            
            # Months elapsed (including partial)
            months_elapsed = (now.year - start_date.year) * 12 + (now.month - start_date.month)
            required_payments = months_elapsed + 1 # +1 for current month
            
            if payment_count < required_payments:
                # Add a pending entry for the history
                all_items.append({
                    'id': f"DUE-{lease['booking_id']}",
                    'amount': lease['price'],
                    'status': 'pending',
                    'payment_date': now.strftime('%Y-%m-%d %H:%M:%S'),
                    'unit_number': lease['unit_number'],
                    'floor': lease['floor'],
                    'tower_name': lease['tower_name'],
                    'type': 'due'
                })

        return jsonify(all_items), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@payment_bp.route('/user/dues', methods=['GET'])
@require_auth
def get_user_dues():
    user_id = request.user['user_id']
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.id as booking_id, u.unit_number, u.floor, u.price, CAST(u.security_deposit AS FLOAT) as security_deposit, t.name as tower_name,
                   l.start_date
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            JOIN leases l ON l.booking_id = b.id
            WHERE b.user_id = %s AND b.status IN ('approved', 'rented')
        """, (user_id,))
        leases = cur.fetchall()
        now = datetime.now(timezone.utc)

        current_month_date = date(now.year, now.month, 1)
        
        # Pure python next/prev month helpers
        def add_months(d, n):
            month = d.month - 1 + n
            year = d.year + month // 12
            month = month % 12 + 1
            return date(year, month, 1)
        
        dues = []
        for lease in leases:
            start_date = lease['start_date']
            if not start_date: continue
            
            # Check payments made for this booking
            cur.execute("SELECT count(*) as count FROM payments WHERE booking_id = %s", (lease['booking_id'],))
            payment_count = cur.fetchone()['count']
            
            # Months elapsed since lease start (0 = still in first month)
            months_elapsed = (now.year - start_date.year) * 12 + (now.month - start_date.month)
            
            # Standard Amounts
            rent_amount = float(lease['price'])
            deposit_amount = float(lease['security_deposit'] or 0)
            first_month_amount = rent_amount + deposit_amount
            last_month_penalty = rent_amount * 0.10
            
            unit_display = f"Unit {lease['unit_number']} ({lease['tower_name']})"

            # ── ITEM 1: First Month (activation) ──────────────────────
            # Enabled only when user has never paid yet
            dues.append({
                'booking_id': lease['booking_id'],
                'type': 'First Month Total',
                'period': start_date.strftime('%B %Y') + ' (Activation)',
                'amount': first_month_amount,
                'base_amount': rent_amount,
                'deposit_amount': deposit_amount,
                'penalty': 0,
                'unit_info': unit_display + (f" (Incl. Security Deposit ₹{deposit_amount})" if deposit_amount > 0 else ""),
                'is_enabled': payment_count == 0
            })

            # ── ITEM 2: Current Month Rent ─────────────────────────────
            # Logic:
            #   - still in first month (months_elapsed == 0): not applicable yet
            #   - payment_count == months_elapsed → user paid everything up to last month,
            #     current month is now due → show current month name, enabled
            #   - payment_count > months_elapsed → current month already paid → show NEXT month,
            #     disabled (not yet due)
            #   - payment_count < months_elapsed → behind, current month overdue → enabled
            if months_elapsed == 0:
                # Still in activation month – current rent not due yet
                current_period = now.strftime('%B %Y')
                current_enabled = False
            elif payment_count > months_elapsed:
                # Current month already paid; surface next month label (not yet due)
                next_month = add_months(current_month_date, 1)
                current_period = next_month.strftime('%B %Y')
                current_enabled = False
            else:
                # Due or overdue – show actual current month
                current_period = now.strftime('%B %Y')
                current_enabled = True

            dues.append({
                'booking_id': lease['booking_id'],
                'type': 'Current Month Rent',
                'period': current_period,
                'amount': rent_amount,
                'base_amount': rent_amount,
                'penalty': 0,
                'deposit_amount': 0,
                'unit_info': unit_display,
                'is_enabled': current_enabled
            })

            # ── ITEM 3: Last Month Rent ────────────────────────────────
            # Previous month name
            prev_month = add_months(current_month_date, -1)
            prev_month_label = prev_month.strftime('%B %Y')

            # Last month is a concern only if months_elapsed >= 2
            # (lease started at least 2 months ago) and user skipped a payment
            if months_elapsed < 2:
                # Not enough time has passed to have a skipped previous month
                last_unpaid = False
                last_period = f"Previous Month ({prev_month_label})"
            else:
                # Behind means payments < months_elapsed
                last_unpaid = payment_count < months_elapsed
                last_period = f"Previous Month ({prev_month_label})" if last_unpaid else f"Previous Month (None Pending)"

            dues.append({
                'booking_id': lease['booking_id'],
                'type': 'Last Month Rent',
                'period': last_period,
                'amount': rent_amount + last_month_penalty,
                'base_amount': rent_amount,
                'penalty': last_month_penalty,
                'deposit_amount': 0,
                'unit_info': unit_display,
                'is_enabled': last_unpaid and months_elapsed >= 2
            })

        return jsonify(dues), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@payment_bp.route('/user/active-units', methods=['GET'])
@require_auth
def get_user_active_units():
    user_id = request.user['user_id']
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.id as booking_id, u.unit_number, u.floor, u.price, t.name as tower_name
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            WHERE b.user_id = %s AND b.status IN ('approved', 'rented')
        """, (user_id,))
        
        units = cur.fetchall()
        return jsonify(units), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@payment_bp.route('/deadline/<int:booking_id>', methods=['GET'])
@require_auth
def get_payment_deadline(booking_id):
    """Return approved_at and deadline for a booking so the frontend can show a countdown."""
    user_id = request.user['user_id']
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.id, b.status, b.approved_at, b.unit_id
            FROM bookings b
            WHERE b.id = %s AND b.user_id = %s
        """, (booking_id, user_id))
        booking = cur.fetchone()

        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        if booking['status'] != 'approved':
            return jsonify({'error': 'Booking is not in approved state'}), 400

        approved_at = booking['approved_at']
        if not approved_at:
            return jsonify({'error': 'No approval timestamp found'}), 400

        # Ensure timezone-aware
        if approved_at.tzinfo is None:
            approved_at = approved_at.replace(tzinfo=timezone.utc)

        deadline = approved_at + timedelta(minutes=PAYMENT_DEADLINE_MINUTES)
        now_utc = datetime.now(timezone.utc)
        seconds_remaining = max(0, int((deadline - now_utc).total_seconds()))

        # If already expired, auto-expire now
        if seconds_remaining == 0:
            _expire_booking(cur, booking['id'], booking['unit_id'])
            conn.commit()
            return jsonify({
                'expired': True,
                'seconds_remaining': 0,
                'deadline': deadline.isoformat()
            }), 200

        return jsonify({
            'expired': False,
            'seconds_remaining': seconds_remaining,
            'deadline': deadline.isoformat(),
            'approved_at': approved_at.isoformat()
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@payment_bp.route('/expire/<int:booking_id>', methods=['POST'])
@require_auth
def expire_payment(booking_id):
    """Called by frontend when countdown reaches 0. Marks the booking as expired."""
    user_id = request.user['user_id']
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.id, b.status, b.approved_at, b.unit_id
            FROM bookings b
            WHERE b.id = %s AND b.user_id = %s
        """, (booking_id, user_id))
        booking = cur.fetchone()

        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        if booking['status'] != 'approved':
            return jsonify({'message': 'Booking already processed'}), 200

        approved_at = booking['approved_at']
        if approved_at:
            if approved_at.tzinfo is None:
                approved_at = approved_at.replace(tzinfo=timezone.utc)
            deadline = approved_at + timedelta(minutes=PAYMENT_DEADLINE_MINUTES)
            now_utc = datetime.now(timezone.utc)
            # Only expire if truly past deadline
            if now_utc <= deadline:
                return jsonify({'error': 'Deadline has not yet passed'}), 400

        _expire_booking(cur, booking['id'], booking['unit_id'])
        conn.commit()

        return jsonify({'message': 'Booking expired. Unit is now available again.'}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
