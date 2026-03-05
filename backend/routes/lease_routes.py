from flask import Blueprint, jsonify, request, send_file
from db import get_db_connection
from middleware.auth import require_auth
from utils.lease_generator import generate_lease_pdf

lease_bp = Blueprint('lease', __name__)

@lease_bp.route('/me', methods=['GET'])
@require_auth
def get_my_leases():
    """Return lease details for all approved/rented bookings of the current user."""
    user_id = request.user['user_id']
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.id as booking_id, b.status, b.booking_date,
                   un.unit_number, un.price as rent_amount,
                   t.name as tower_name,
                   l.start_date, l.end_date
            FROM bookings b
            JOIN units un ON b.unit_id = un.id
            JOIN towers t ON un.tower_id = t.id
            LEFT JOIN leases l ON l.booking_id = b.id
            WHERE b.user_id = %s
              AND b.status IN ('approved', 'rented')
            ORDER BY b.booking_date DESC
        """, (user_id,))
        leases = cur.fetchall()
        return jsonify(leases), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@lease_bp.route('/<int:booking_id>', methods=['GET'])
@require_auth
def download_lease(booking_id):
    user_id = request.user['user_id']
    user_role = request.user['role']
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check permissions: User must own the booking, OR be an admin
        cur.execute("SELECT user_id, status FROM bookings WHERE id = %s", (booking_id,))
        booking = cur.fetchone()
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
            
        if user_role != 'admin' and booking['user_id'] != user_id:
            return jsonify({'error': 'Unauthorized to view this lease'}), 403
            
        if booking['status'] not in ['approved', 'rented']:
            return jsonify({'error': 'Lease agreement is only available for approved bookings'}), 400

        # Fetch full data
        cur.execute("""
            SELECT u.email as user_email, 
                   un.unit_number, un.price as rent_amount, 
                   t.name as tower_name,
                   b.booking_date
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN units un ON b.unit_id = un.id
            JOIN towers t ON un.tower_id = t.id
            WHERE b.id = %s
        """, (booking_id,))
        data = cur.fetchone()
        
        # Check if lease exists in DB
        cur.execute("SELECT start_date, end_date FROM leases WHERE booking_id = %s", (booking_id,))
        lease = cur.fetchone()
        
        if lease:
            data['start_date'] = lease['start_date']
            data['end_date'] = lease['end_date']
        else:
            data['start_date'] = None
            data['end_date'] = None

        # Generate PDF
        pdf_buffer = generate_lease_pdf(data)
        
        filename = f"Lease_Agreement_Unit_{data['unit_number']}.pdf"
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# USER: Submit a terminate / extend request
# ─────────────────────────────────────────────────────────────────────────────
@lease_bp.route('/request', methods=['POST'])
@require_auth
def submit_lease_request():
    """User submits a terminate or extend request for their lease."""
    user_id = request.user['user_id']
    data = request.get_json()
    booking_id = data.get('booking_id')
    request_type = data.get('request_type')   # 'terminate' or 'extend'
    extend_days = data.get('extend_days')     # int, optional
    new_end_date = data.get('new_end_date')   # string YYYY-MM-DD, required for extend

    if not booking_id or request_type not in ('terminate', 'extend', 'vacate'):
        return jsonify({'error': 'booking_id and request_type (terminate/extend/vacate) are required'}), 400
    if request_type in ('extend', 'vacate') and not new_end_date:
        return jsonify({'error': f'new_end_date is required for {request_type} requests'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verify ownership and active status
        cur.execute("SELECT user_id, status FROM bookings WHERE id = %s", (booking_id,))
        booking = cur.fetchone()
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        if booking['user_id'] != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        if booking['status'] not in ('approved', 'rented'):
            return jsonify({'error': 'Can only request changes for approved/rented leases'}), 400

        # Block duplicate pending requests of the same type
        cur.execute("""
            SELECT id FROM lease_requests
            WHERE booking_id = %s AND request_type = %s AND status = 'pending'
        """, (booking_id, request_type))
        if cur.fetchone():
            return jsonify({'error': f'A pending {request_type} request already exists for this lease'}), 400

        cur.execute("""
            INSERT INTO lease_requests (booking_id, request_type, extend_days, new_end_date)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (booking_id, request_type, extend_days if request_type == 'extend' else None, new_end_date if request_type in ('extend', 'vacate') else None))
        new_id = cur.fetchone()['id']
        conn.commit()
        return jsonify({'message': f'{request_type.capitalize()} request submitted', 'id': new_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@lease_bp.route('/my-requests', methods=['GET'])
@require_auth
def get_my_lease_requests():
    """User sees their own lease requests."""
    user_id = request.user['user_id']
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT lr.id, lr.booking_id, lr.request_type, lr.extend_days, lr.new_end_date,
                   lr.status, lr.admin_note, lr.requested_at, lr.resolved_at,
                   un.unit_number, t.name as tower_name
            FROM lease_requests lr
            JOIN bookings b ON lr.booking_id = b.id
            JOIN units un ON b.unit_id = un.id
            JOIN towers t ON un.tower_id = t.id
            WHERE b.user_id = %s
            ORDER BY lr.requested_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: View all lease requests + approve / reject
# ─────────────────────────────────────────────────────────────────────────────
@lease_bp.route('/requests', methods=['GET'])
@require_auth
def admin_get_lease_requests():
    """Admin: get all pending lease requests."""
    if request.user['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT lr.id, lr.booking_id, lr.request_type, lr.extend_days, lr.new_end_date,
                   lr.status, lr.admin_note, lr.requested_at, lr.resolved_at,
                   un.unit_number, t.name as tower_name,
                   u.email as tenant_email,
                   l.start_date, l.end_date
            FROM lease_requests lr
            JOIN bookings b ON lr.booking_id = b.id
            JOIN units un ON b.unit_id = un.id
            JOIN towers t ON un.tower_id = t.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN leases l ON l.booking_id = b.id
            ORDER BY lr.requested_at DESC
        """)
        rows = cur.fetchall()
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@lease_bp.route('/requests/<int:req_id>/approve', methods=['POST'])
@require_auth
def admin_approve_lease_request(req_id):
    """Admin: approve a terminate or extend request, updating leases table."""
    if request.user['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json() or {}
    admin_note = data.get('admin_note', '')
    new_end_date = data.get('new_end_date')   # admin sets final end date for terminate or extend

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM lease_requests WHERE id = %s", (req_id,))
        req = cur.fetchone()
        if not req:
            return jsonify({'error': 'Request not found'}), 404
        if req['status'] != 'pending':
            return jsonify({'error': 'Request already resolved'}), 400

        booking_id = req['booking_id']

        if req['request_type'] == 'terminate':
            # Update booking status to 'terminated' and set end_date
            import datetime
            end = new_end_date or datetime.date.today().isoformat()
            cur.execute("""
                UPDATE leases SET end_date = %s WHERE booking_id = %s
            """, (end, booking_id))
            
        elif req['request_type'] == 'vacate':
            date_val = new_end_date or req['new_end_date']
            import datetime
            if not date_val:
                date_val = datetime.date.today().isoformat()
            
            cur.execute("UPDATE bookings SET status = 'vacated' WHERE id = %s", (booking_id,))
            cur.execute("""
                UPDATE units 
                SET status = 'available', available_from = %s 
                WHERE id = (SELECT unit_id FROM bookings WHERE id = %s)
            """, (date_val, booking_id))
            cur.execute("UPDATE bookings SET status = 'rejected' WHERE id = %s", (booking_id,))
            cur.execute("UPDATE units SET status = 'available' WHERE id = (SELECT unit_id FROM bookings WHERE id = %s)", (booking_id,))

        elif req['request_type'] == 'extend':
            # If admin supplies new_end_date use it; else calculate from current end + extend_days
            if new_end_date:
                end = new_end_date
            else:
                cur.execute("SELECT end_date FROM leases WHERE booking_id = %s", (booking_id,))
                lease = cur.fetchone()
                if lease and lease['end_date']:
                    import datetime
                    current_end = lease['end_date']
                    if isinstance(current_end, str):
                        current_end = datetime.date.fromisoformat(current_end)
                    end = (current_end + datetime.timedelta(days=req['extend_days'])).isoformat()
                else:
                    import datetime
                    end = (datetime.date.today() + datetime.timedelta(days=req['extend_days'])).isoformat()
            cur.execute("""
                UPDATE leases SET end_date = %s WHERE booking_id = %s
            """, (end, booking_id))

        # Mark request as approved
        cur.execute("""
            UPDATE lease_requests
            SET status = 'approved', admin_note = %s, resolved_at = NOW()
            WHERE id = %s
        """, (admin_note, req_id))
        conn.commit()
        return jsonify({'message': 'Request approved successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@lease_bp.route('/requests/<int:req_id>/reject', methods=['POST'])
@require_auth
def admin_reject_lease_request(req_id):
    """Admin: reject a terminate or extend request."""
    if request.user['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    data = request.get_json() or {}
    admin_note = data.get('admin_note', '')
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE lease_requests
            SET status = 'rejected', admin_note = %s, resolved_at = NOW()
            WHERE id = %s AND status = 'pending'
        """, (admin_note, req_id))
        if cur.rowcount == 0:
            return jsonify({'error': 'Request not found or already resolved'}), 404
        conn.commit()
        return jsonify({'message': 'Request rejected'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN: Direct terminate / extend (without user request)
# ─────────────────────────────────────────────────────────────────────────────
@lease_bp.route('/admin/<int:booking_id>/terminate', methods=['POST'])
@require_auth
def admin_terminate_lease(booking_id):
    """Admin: directly terminate a lease by setting end_date."""
    if request.user['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    data = request.get_json() or {}
    end_date = data.get('end_date')
    if not end_date:
        import datetime
        end_date = datetime.date.today().isoformat()
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO leases (booking_id, end_date)
            VALUES (%s, %s)
            ON CONFLICT (booking_id) DO UPDATE SET end_date = EXCLUDED.end_date
        """, (booking_id, end_date))
        cur.execute("UPDATE bookings SET status = 'rejected' WHERE id = %s", (booking_id,))
        cur.execute("UPDATE units SET status = 'available' WHERE id = (SELECT unit_id FROM bookings WHERE id = %s)", (booking_id,))
        conn.commit()
        return jsonify({'message': 'Lease terminated', 'end_date': end_date}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@lease_bp.route('/admin/<int:booking_id>/extend', methods=['POST'])
@require_auth
def admin_extend_lease(booking_id):
    """Admin: directly extend a lease by setting a new end_date."""
    if request.user['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    data = request.get_json() or {}
    new_end_date = data.get('new_end_date')
    if not new_end_date:
        return jsonify({'error': 'new_end_date is required'}), 400
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO leases (booking_id, end_date)
            VALUES (%s, %s)
            ON CONFLICT (booking_id) DO UPDATE SET end_date = EXCLUDED.end_date
        """, (booking_id, new_end_date))
        conn.commit()
        return jsonify({'message': 'Lease extended', 'new_end_date': new_end_date}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
