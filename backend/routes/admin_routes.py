from flask import Blueprint, request, jsonify
from db import get_db_connection
from middleware.auth import require_admin
import json
from utils.email_helper import send_email
import psycopg2
import psycopg2.extras
import os

# ---- Cloudinary Setup ----
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloudinary_url=os.environ.get('CLOUDINARY_URL')
)

def upload_to_cloudinary(file_obj):
    """Uploads a file object to Cloudinary and returns the secure CDN URL."""
    result = cloudinary.uploader.upload(
        file_obj,
        folder='apartment_portal',
        resource_type='image'
    )
    return result.get('secure_url')

admin_bp = Blueprint('admin', __name__)

# --- ADMIN TOWER MANAGEMENT ---
@admin_bp.route('/towers', methods=['POST'])
@require_admin
def create_tower():
    data = request.get_json()
    name = data.get('name')
    floors = data.get('floors')
    description = data.get('description', '')
    image_url = data.get('image_url', '')
    state = data.get('state', '')
    city = data.get('city', '')
    area = data.get('area', '')
    street = data.get('street', '')
    units_per_floor = data.get('units_per_floor')

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check for existing tower name
        cur.execute("SELECT id FROM towers WHERE LOWER(name) = LOWER(%s)", (name,))
        if cur.fetchone():
            return jsonify({'error': f'Tower with name "{name}" already exists.'}), 400

        cur.execute(
            "INSERT INTO towers (name, floors, description, image_url, state, city, area, street, units_per_floor, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'active') RETURNING id",
            (name, floors, description, image_url, state, city, area, street, units_per_floor)
        )
        tower_id = cur.fetchone()['id']
        conn.commit()
        return jsonify({'id': tower_id, 'message': 'Tower created successfully'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/towers', methods=['GET'])
@require_admin
def get_towers():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM towers ORDER BY id DESC")
        towers = cur.fetchall()
        return jsonify({'towers': towers}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/towers/<int:id>', methods=['DELETE'])
@require_admin
def delete_tower(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if tower has units
        cur.execute("SELECT COUNT(*) FROM units WHERE tower_id = %s", (id,))
        count = cur.fetchone()['count']
        if count > 0:
            return jsonify({'error': 'Cannot delete tower with associated units. Delete the units first.'}), 400
            
        cur.execute("DELETE FROM towers WHERE id = %s", (id,))
        if cur.rowcount == 0:
            return jsonify({'error': 'Tower not found'}), 404
            
        conn.commit()
        return jsonify({'message': 'Tower deleted successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/towers/<int:id>', methods=['PUT'])
@require_admin
def update_tower(id):
    data = request.get_json()
    name = data.get('name')
    floors = data.get('floors')
    description = data.get('description')
    image_url = data.get('image_url')
    state = data.get('state')
    city = data.get('city')
    area = data.get('area')
    street = data.get('street')
    units_per_floor = data.get('units_per_floor')
    status = data.get('status')
    inactive_reason = data.get('inactive_reason')

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check for conflicts with existing tower names if name is provided
        if name:
            cur.execute("SELECT id FROM towers WHERE LOWER(name) = LOWER(%s) AND id != %s", (name, id))
            if cur.fetchone():
                return jsonify({'error': f'Tower with name "{name}" already exists.'}), 400

        # Dynamic update
        update_fields = []
        params = []
        if name:
            update_fields.append("name = %s")
            params.append(name)
        if floors is not None and floors != '':
            update_fields.append("floors = %s")
            params.append(floors)
        if description is not None:
            update_fields.append("description = %s")
            params.append(description)
        if image_url is not None:
            update_fields.append("image_url = %s")
            params.append(image_url)
        if state is not None:
            update_fields.append("state = %s")
            params.append(state)
        if city is not None:
            update_fields.append("city = %s")
            params.append(city)
        if area is not None:
            update_fields.append("area = %s")
            params.append(area)
        if street is not None:
            update_fields.append("street = %s")
            params.append(street)
        if units_per_floor is not None:
            update_fields.append("units_per_floor = %s")
            params.append(units_per_floor)
        if status is not None:
            update_fields.append("status = %s")
            params.append(status)
        if inactive_reason is not None:
            update_fields.append("inactive_reason = %s")
            params.append(inactive_reason)

        if not update_fields:
            return jsonify({'message': 'No changes provided'}), 200

        params.append(id)
        query = f"UPDATE towers SET {', '.join(update_fields)} WHERE id = %s"
        cur.execute(query, tuple(params))
        
        if cur.rowcount == 0:
            return jsonify({'error': 'Tower not found'}), 404
            
        conn.commit()
        return jsonify({'message': 'Tower updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/towers/<int:id>/toggle-status', methods=['POST'])
@require_admin
def toggle_tower_status(id):
    data = request.get_json()
    new_status = data.get('status')
    
    # Professional technical reason for inactivation
    default_reason = "Operational services for this tower have been suspended due to unresolved ownership discrepancies and the expiration of the Master Service Agreement. Consequently, facility management and utility provisions are currently restricted."
    reason = data.get('inactive_reason', default_reason) if new_status == 'inactive' else None

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE towers SET status = %s, inactive_reason = %s WHERE id = %s",
            (new_status, reason, id)
        )
        if cur.rowcount == 0:
            return jsonify({'error': 'Tower not found'}), 404
        
        conn.commit()
        return jsonify({'message': f'Tower status updated to {new_status}'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/amenities', methods=['POST'])
@require_admin
def create_amenity():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO amenities (name, description) VALUES (%s, %s) RETURNING id", (name, description))
        amenity_id = cur.fetchone()['id']
        conn.commit()
        return jsonify({'id': amenity_id, 'message': 'Amenity created successfully'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/amenities', methods=['GET'])
@require_admin
def get_amenities():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM amenities ORDER BY id DESC")
        amenities = cur.fetchall()
        return jsonify({'amenities': amenities}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/amenities/<int:id>', methods=['DELETE'])
@require_admin
def delete_amenity(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Remove associations in unit_amenities first
        cur.execute("DELETE FROM unit_amenities WHERE amenity_id = %s", (id,))
        
        cur.execute("DELETE FROM amenities WHERE id = %s", (id,))
        if cur.rowcount == 0:
            return jsonify({'error': 'Amenity not found'}), 404
            
        conn.commit()
        return jsonify({'message': 'Amenity deleted successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/tower-amenity-status/<int:tower_id>', methods=['GET'])
@require_admin
def get_tower_amenity_status(tower_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
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
        statuses = cur.fetchall()
        return jsonify({'statuses': statuses}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/tower-amenity-status', methods=['POST'])
@require_admin
def update_tower_amenity_status():
    data = request.get_json()
    tower_id = data.get('tower_id')
    amenity_id = data.get('amenity_id')
    status = data.get('status')

    if not all([tower_id, amenity_id, status]):
        return jsonify({'error': 'Missing tower_id, amenity_id or status'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO tower_amenity_status (tower_id, amenity_id, status, updated_at)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (tower_id, amenity_id) 
            DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
        """, (tower_id, amenity_id, status))
        conn.commit()
        return jsonify({'message': 'Status updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

# --- ADMIN FLAT/UNIT MANAGEMENT ---

@admin_bp.route('/flats', methods=['POST'])
@require_admin
def create_flat():
    # Parse form data instead of JSON
    tower_id = request.form.get('tower_id')
    unit_number = request.form.get('unit_number')
    bhk = request.form.get('bhk')
    price = request.form.get('price')
    description = request.form.get('description')
    security_deposit = request.form.get('security_deposit')
    floor = request.form.get('floor')
    wing = request.form.get('wing', '')
    location = request.form.get('location', '')
    amenity_ids = request.form.getlist('amenity_ids') # list of amenity IDs
    images = request.files.getlist('images') # List of file objects

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Default description and location to tower values if not provided
        if not description or not location:
            cur.execute("SELECT description, state, city, area, street FROM towers WHERE id = %s", (tower_id,))
            tower = cur.fetchone()
            if tower:
                if not description:
                    description = tower.get('description', '')
                if not location:
                    parts = [tower.get('street'), tower.get('area'), tower.get('city'), tower.get('state')]
                    location = ', '.join(p for p in parts if p)

        # Check for existing unit number in the same tower
        cur.execute("SELECT id FROM units WHERE tower_id = %s AND LOWER(unit_number) = LOWER(%s)", (tower_id, unit_number))
        if cur.fetchone():
            return jsonify({'error': f'Unit number "{unit_number}" already exists in this tower.'}), 400

        cur.execute(
            """INSERT INTO units (tower_id, unit_number, bhk, price, description, security_deposit, floor, wing, location) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (tower_id, unit_number, bhk, price, description, security_deposit or 0, floor, wing, location)
        )
        unit_id = cur.fetchone()['id']
        
        # Add images
        default_idx = int(request.form.get('default_image_index', 0))
        if images:
            for file_idx, file in enumerate(images):
                if file and file.filename:
                    # Upload directly to Cloudinary
                    cdn_url = upload_to_cloudinary(file.stream)
                    
                    cur.execute(
                        "INSERT INTO unit_images (unit_id, image_url) VALUES (%s, %s)",
                        (unit_id, cdn_url)
                    )
                    
                    # Store the designated primary unit image as the global cover photo
                    if file_idx == default_idx:
                        cur.execute("UPDATE units SET image_url = %s WHERE id = %s", (cdn_url, unit_id))
        
        # Add amenities to unit
        if amenity_ids:
            for amenity_id in amenity_ids:
                cur.execute(
                    "INSERT INTO unit_amenities (unit_id, amenity_id) VALUES (%s, %s)",
                    (unit_id, amenity_id)
                )
        
        conn.commit()
        return jsonify({'id': unit_id, 'message': 'Flat created successfully'}), 201
    except Exception as e:
        conn.rollback()
        import traceback
        print(f"CRITICAL ERROR creating flat: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/flats/<int:id>', methods=['PUT'])
@require_admin
def update_flat(id):
    tower_id = request.form.get('tower_id')
    unit_number = request.form.get('unit_number')
    bhk = request.form.get('bhk')
    price = request.form.get('price')
    description = request.form.get('description')
    security_deposit = request.form.get('security_deposit')
    floor = request.form.get('floor')
    wing = request.form.get('wing')
    location = request.form.get('location')
    amenity_ids = request.form.getlist('amenity_ids')

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Get current unit info to check for conflicts and maintain consistency
        cur.execute("SELECT tower_id, unit_number FROM units WHERE id = %s", (id,))
        current_unit = cur.fetchone()
        if not current_unit:
            return jsonify({'error': 'Flat not found'}), 404

        target_tower_id = tower_id if tower_id else current_unit['tower_id']
        target_unit_number = unit_number if unit_number else current_unit['unit_number']

        # Check for conflicts with existing unit numbers in the target tower
        if tower_id or unit_number:
            cur.execute(
                "SELECT id FROM units WHERE tower_id = %s AND LOWER(unit_number) = LOWER(%s) AND id != %s",
                (target_tower_id, target_unit_number, id)
            )
            if cur.fetchone():
                return jsonify({'error': f'Unit number "{target_unit_number}" already exists in the selected tower.'}), 400

        # Dynamic update for units table
        update_fields = []
        params = []
        if tower_id:
            update_fields.append("tower_id = %s")
            params.append(tower_id)
        if unit_number:
            update_fields.append("unit_number = %s")
            params.append(unit_number)
        if bhk is not None and bhk != '':
            update_fields.append("bhk = %s")
            params.append(bhk)
        if price is not None and price != '':
            update_fields.append("price = %s")
            params.append(price)
        if description is not None:
            update_fields.append("description = %s")
            params.append(description)
        if security_deposit is not None and security_deposit != '':
            update_fields.append("security_deposit = %s")
            params.append(security_deposit)
        if floor is not None and floor != '':
            update_fields.append("floor = %s")
            params.append(floor)
        if wing is not None:
            update_fields.append("wing = %s")
            params.append(wing)
        if location is not None:
            update_fields.append("location = %s")
            params.append(location)

        if update_fields:
            params.append(id)
            query = f"UPDATE units SET {', '.join(update_fields)} WHERE id = %s"
            cur.execute(query, tuple(params))
        
        # Replace amenities only if explicitly provided (even if empty list)
        if 'amenity_ids' in request.form:
            cur.execute("DELETE FROM unit_amenities WHERE unit_id = %s", (id,))
            if amenity_ids:
                for amenity_id in amenity_ids:
                    cur.execute(
                        "INSERT INTO unit_amenities (unit_id, amenity_id) VALUES (%s, %s)",
                        (id, amenity_id)
                    )

        # Handle images if provided
        images = request.files.getlist('images')
        default_idx_str = request.form.get('default_image_index')
        valid_images = [img for img in images if img and img.filename]

        if valid_images:
            # Delete old images from the gallery
            cur.execute("DELETE FROM unit_images WHERE unit_id = %s", (id,))
            
            default_idx = int(default_idx_str) if default_idx_str and default_idx_str.isdigit() else 0

            for file_idx, file in enumerate(valid_images):
                # Upload directly to Cloudinary
                cdn_url = upload_to_cloudinary(file.stream)
                cur.execute(
                    "INSERT INTO unit_images (unit_id, image_url) VALUES (%s, %s)",
                    (id, cdn_url)
                )
                
                if file_idx == default_idx:
                    cur.execute("UPDATE units SET image_url = %s WHERE id = %s", (cdn_url, id))

        conn.commit()
        return jsonify({'message': 'Flat updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/flats/<int:id>', methods=['DELETE'])
@require_admin
def delete_flat(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check status
        cur.execute("SELECT status FROM units WHERE id = %s", (id,))
        unit = cur.fetchone()
        if not unit:
            return jsonify({'error': 'Flat not found'}), 404
            
        if unit['status'] != 'available':
            return jsonify({'error': f'Cannot delete unit with status: {unit["status"]}'}), 400
            
        # Delete related
        cur.execute("DELETE FROM unit_amenities WHERE unit_id = %s", (id,))
        cur.execute("DELETE FROM unit_images WHERE unit_id = %s", (id,))
        cur.execute("DELETE FROM units WHERE id = %s", (id,))
        
        conn.commit()
        return jsonify({'message': 'Flat deleted successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/flats/<int:id>/images', methods=['POST'])
@require_admin
def add_flat_images(id):
    import os
    import time
    from werkzeug.utils import secure_filename
    
    images = request.files.getlist('images')
    
    if not images:
        return jsonify({'error': 'No images provided'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verify unit exists
        cur.execute("SELECT id FROM units WHERE id = %s", (id,))
        if not cur.fetchone():
            return jsonify({'error': 'Flat not found'}), 404

        inserted_count = 0
        
        for file in images:
            if file and file.filename:
                # Upload directly to Cloudinary
                cdn_url = upload_to_cloudinary(file.stream)
                cur.execute(
                    "INSERT INTO unit_images (unit_id, image_url) VALUES (%s, %s)",
                    (id, cdn_url)
                )
                inserted_count += 1
                
        conn.commit()
        return jsonify({'message': f'Successfully appended {inserted_count} images to flat'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

# --- ADMIN BOOKING MANAGEMENT ---
@admin_bp.route('/bookings', methods=['GET'])
@require_admin
def get_all_bookings():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        cur.execute("""
            SELECT b.id, b.status, b.booking_date,
                   u.unit_number, u.floor, u.price, u.image_url,
                   t.name as tower_name,
                   usr.email as user_email, usr.full_name as user_full_name, usr.phone_number as user_phone
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            JOIN users usr ON b.user_id = usr.id
            ORDER BY b.booking_date DESC
        """)
        bookings = cur.fetchall()
        return jsonify([dict(b) for b in bookings]), 200
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/bookings/<int:id>/details', methods=['GET'])
@require_admin
def get_booking_details(id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # 1. Get Booking & User Details
        cur.execute("""
            SELECT b.id, b.status, b.booking_date,
                   u.unit_number, u.floor, u.price, u.security_deposit,
                   t.name as tower_name,
                   usr.email, usr.full_name, usr.phone_number,
                   l.start_date as lease_start, l.end_date as lease_end
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            JOIN users usr ON b.user_id = usr.id
            LEFT JOIN leases l ON l.booking_id = b.id
            WHERE b.id = %s
        """, (id,))
        booking = cur.fetchone()
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
            
        # 2. Get Payments for this booking
        cur.execute("""
            SELECT id, amount, status, payment_date
            FROM payments
            WHERE booking_id = %s
            ORDER BY payment_date DESC
        """, (id,))
        payments = cur.fetchall()
        
        # Merge booking details into response for easier frontend mapping
        response_data = dict(booking)
        response_data['payments'] = [dict(p) for p in payments]
        
        return jsonify(response_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

# --- ADMIN BOOKING APPROVAL/REJECTION ---
@admin_bp.route('/bookings/<int:id>/approve', methods=['PUT'])
@require_admin
def approve_booking(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.unit_id, b.status, u.email as user_email, un.unit_number 
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN units un ON b.unit_id = un.id
            WHERE b.id = %s
        """, (id,))
        booking = cur.fetchone()
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        if booking['status'] != 'pending':
            return jsonify({'error': 'Booking is not in pending state'}), 400

        # Update booking — stamp approved_at to start the 5-minute payment window
        cur.execute("UPDATE bookings SET status = 'approved', approved_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC' WHERE id = %s", (id,))
        # Update unit to 'booked' status (not 'rented' yet)
        cur.execute("UPDATE units SET status = 'booked' WHERE id = %s", (booking['unit_id'],))
        
        # Check if lease exists, if not create default 1-year lease
        cur.execute("SELECT id FROM leases WHERE booking_id = %s", (id,))
        if not cur.fetchone():
            from datetime import date, timedelta
            start_date = date.today()
            end_date = start_date + timedelta(days=365)
            cur.execute(
                "INSERT INTO leases (booking_id, start_date, end_date) VALUES (%s, %s, %s)",
                (id, start_date, end_date)
            )

        # Automatically decline other bookings for exactly the same unit_id
        cur.execute("UPDATE bookings SET status = 'rejected' WHERE unit_id = %s AND id != %s", (booking['unit_id'], id))
        
        conn.commit()

        # Send Email Notification
        subject = f"Booking Approved - Unit {booking['unit_number']}"
        message = f"Congratulations!\n\nYour booking request for Unit {booking['unit_number']} has been approved by the admin. Please log in to your dashboard to view lease details and make your first payment.\n\nRegards,\nRental Portal Team"
        send_email(booking['user_email'], subject, message)

        return jsonify({'message': 'Booking approved successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/bookings/<int:id>/reject', methods=['PUT'])
@require_admin
def reject_booking(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.unit_id, b.status, u.email as user_email, un.unit_number 
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN units un ON b.unit_id = un.id
            WHERE b.id = %s
        """, (id,))
        booking = cur.fetchone()
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        cur.execute("UPDATE bookings SET status = 'rejected' WHERE id = %s", (id,))
        # Reset unit to available
        cur.execute("UPDATE units SET status = 'available' WHERE id = %s", (booking['unit_id'],))
        
        conn.commit()

        # Send Email Notification
        subject = f"Booking Update - Unit {booking['unit_number']}"
        message = f"Hello,\n\nWe regret to inform you that your booking request for Unit {booking['unit_number']} was not approved at this time.\n\nPlease feel free to browse other available flats on our portal.\n\nRegards,\nRental Portal Team"
        send_email(booking['user_email'], subject, message)

        return jsonify({'message': 'Booking rejected successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/units/<int:id>/vacate', methods=['PUT'])
@require_admin
def vacate_unit(id):
    """Mark a rented unit back to available."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, status FROM units WHERE id = %s", (id,))
        unit = cur.fetchone()
        
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
        if unit['status'] != 'rented':
            return jsonify({'error': 'Only rented units can be vacated'}), 400
            
        cur.execute("UPDATE units SET status = 'available' WHERE id = %s", (id,))
        conn.commit()
        
        return jsonify({'message': 'Unit marked as available successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/units/<int:id>/status', methods=['PUT'])
@require_admin
def update_unit_status(id):
    """Update a unit's status (e.g., to 'under_maintenance' or back to 'available')."""
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in ['available', 'under_maintenance']:
        return jsonify({'error': 'Invalid status. Can only be available or under_maintenance'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, status FROM units WHERE id = %s", (id,))
        unit = cur.fetchone()
        
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
            
        if unit['status'] in ['rented', 'pending']:
            return jsonify({'error': 'Cannot change status of a unit that is currently rented or pending approval.'}), 400
            
        cur.execute("UPDATE units SET status = %s WHERE id = %s", (new_status, id))
        conn.commit()
        
        return jsonify({'message': f'Unit status updated to {new_status} successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/units/<int:id>/occupant', methods=['GET'])
@require_admin
def get_unit_occupant(id):
    """Fetch details of the current occupant, their lease, and payment history for a specific unit."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Get current occupant and lease info
        # Using verified columns: full_name, phone_number
        cur.execute("""
            SELECT 
                u.full_name, u.email, u.phone_number,
                b.id as booking_id, b.status as booking_status,
                l.start_date, l.end_date
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            LEFT JOIN leases l ON b.id = l.booking_id
            WHERE b.unit_id = %s AND b.status IN ('rented', 'booked', 'approved')
            ORDER BY b.booking_date DESC
            LIMIT 1
        """, (id,))
        occupant = cur.fetchone()
        
        if not occupant:
            return jsonify({'message': 'No active occupant or booking found for this unit.'}), 404
            
        # 2. Get payment history for this specific booking
        # Verified columns: amount, payment_date, status (payment_type is not in DB, using 'Rent / Deposit' as default)
        cur.execute("""
            SELECT amount, payment_date, status, 'Rent / Deposit' as payment_type
            FROM payments
            WHERE booking_id = %s
            ORDER BY payment_date DESC
        """, (occupant['booking_id'],))
        payments = cur.fetchall()
        
        return jsonify({
            'occupant': occupant,
            'payments': payments
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
        
# --- ADMIN ANALYTICS ---
@admin_bp.route('/reports', methods=['GET'])
@require_admin
def get_reports():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Occupancy Rate
        cur.execute("""
            SELECT 
                COUNT(*) as total_units,
                SUM(CASE WHEN status IN ('rented', 'booked') THEN 1 ELSE 0 END) as rented_units
            FROM units
        """)
        occupancy = cur.fetchone()
        
        # Revenue stats based on rented units
        cur.execute("""
            SELECT 
                SUM(price) as expected_monthly_revenue,
                SUM(security_deposit) as total_deposit_amount
            FROM units 
            WHERE status IN ('rented', 'booked')
        """)
        revenue = cur.fetchone()
        
        # Total Unique Tenants (Users with approved or rented bookings for currently rented units)
        cur.execute("""
            SELECT COUNT(DISTINCT b.user_id) as total_tenants 
            FROM bookings b
            WHERE b.status IN ('approved', 'rented')
        """)
        tenants = cur.fetchone()

        # Total Towers Count
        cur.execute("SELECT COUNT(*) as total_towers FROM towers")
        towers_count = cur.fetchone()

        # Recent Bookings (For quick overview)
        cur.execute("""
            SELECT status, COUNT(*) as count 
            FROM bookings 
            GROUP BY status
        """)
        bookings_status = cur.fetchall()

        return jsonify({
            'occupancy': occupancy,
            'revenue': revenue,
            'tenants': tenants,
            'booking_stats': bookings_status,
            'towers_count': towers_count
        }), 200
    finally:
        cur.close()
        conn.close()

# --- ADMIN LEASES ---
@admin_bp.route('/leases', methods=['GET'])
@require_admin
def get_all_leases():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT
                b.id as booking_id,
                b.status as booking_status,
                b.booking_date,
                u.email as tenant_email,
                un.unit_number,
                un.floor,
                un.price as monthly_rent,
                t.name as tower_name,
                l.start_date,
                l.end_date
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN units un ON b.unit_id = un.id
            JOIN towers t ON un.tower_id = t.id
            LEFT JOIN leases l ON l.booking_id = b.id
            WHERE b.status IN ('approved', 'rented')
            ORDER BY b.booking_date DESC
        """)
        leases = cur.fetchall()
        return jsonify({'leases': leases}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

# --- ADMIN MAINTENANCE ---
@admin_bp.route('/maintenance', methods=['GET'])
@require_admin
def get_all_maintenance_requests():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        cur.execute("""
            SELECT m.id, m.issue, m.status, m.created_at, m.issue_type, m.service_date, m.admin_note,
                   m.rating, m.user_feedback, u.email as user_email,
                   un.unit_number, un.floor, t.name as tower_name
            FROM maintenance_requests m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN bookings b ON m.booking_id = b.id
            LEFT JOIN units un ON b.unit_id = un.id
            LEFT JOIN towers t ON un.tower_id = t.id
            ORDER BY m.created_at DESC
        """)
        requests = cur.fetchall()
        return jsonify({'requests': [dict(r) for r in requests]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/maintenance/<int:id>', methods=['PUT'])
@require_admin
def update_maintenance_status(id):
    data = request.get_json()
    status = data.get('status')
    service_date = data.get('service_date')
    admin_note = data.get('admin_note')
    
    if status and status not in ['pending', 'resolved']:
        return jsonify({'error': 'Invalid status'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        query_parts = []
        params = []
        if status:
            query_parts.append("status = %s")
            params.append(status)
        if service_date is not None: # service_date could be empty string to clear it
            query_parts.append("service_date = %s")
            params.append(service_date if service_date else None)
        if admin_note is not None:
            query_parts.append("admin_note = %s")
            params.append(admin_note)
            
        if not query_parts:
             return jsonify({'error': 'No valid fields provided'}), 400
             
        params.append(id)
        
        query = f"UPDATE maintenance_requests SET {', '.join(query_parts)} WHERE id = %s RETURNING id"
        cur.execute(query, params)
        updated_request = cur.fetchone()
        
        if not updated_request:
            return jsonify({'error': 'Maintenance request not found'}), 404
            
        conn.commit()
        return jsonify({'message': f'Maintenance request {id} updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

# --- ADMIN USER MANAGEMENT ---
@admin_bp.route('/users', methods=['GET'])
@require_admin
def get_all_users():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Get users with their current property info if assigned
        cur.execute("""
            SELECT u.id, u.email, u.role, u.full_name, u.created_at, u.phone_number,
                   un.unit_number, un.floor, t.name as tower_name
            FROM users u
            LEFT JOIN (
                SELECT DISTINCT ON (user_id) user_id, unit_id, id as booking_id
                FROM bookings 
                WHERE status IN ('approved', 'rented')
                ORDER BY user_id, booking_date DESC
            ) b ON u.id = b.user_id
            LEFT JOIN units un ON b.unit_id = un.id
            LEFT JOIN towers t ON un.tower_id = t.id
            ORDER BY u.created_at DESC
        """)
        users = cur.fetchall()
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/users/<int:id>/history', methods=['GET'])
@require_admin
def get_user_history(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # History includes: Bookings, Payments, Maintenance Requests
        
        # 1. Bookings
        cur.execute("""
            SELECT b.id, b.booking_date, b.status, u.unit_number, t.name as tower_name
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            WHERE b.user_id = %s
            ORDER BY b.booking_date DESC
        """, (id,))
        bookings = cur.fetchall()
        
        # 2. Payments
        cur.execute("""
            SELECT p.id, p.amount, p.status, p.payment_date
            FROM payments p
            WHERE p.user_id = %s
            ORDER BY p.payment_date DESC
        """, (id,))
        payments = cur.fetchall()
        
        # 3. Maintenance
        cur.execute("""
            SELECT m.id, m.issue_type, m.status, m.created_at, u.unit_number
            FROM maintenance_requests m
            JOIN bookings b ON m.booking_id = b.id
            JOIN units u ON b.unit_id = u.id
            WHERE b.user_id = %s
            ORDER BY m.created_at DESC
        """, (id,))
        maintenance = cur.fetchall()
        
        return jsonify({
            'bookings': bookings,
            'payments': payments,
            'maintenance': maintenance
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/users/<int:id>', methods=['DELETE'])
@require_admin
def delete_user(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Prevent deleting the last admin or yourself
        if id == request.user['user_id']:
            return jsonify({'error': 'You cannot delete your own admin account'}), 400
            
        cur.execute("DELETE FROM users WHERE id = %s", (id,))
        if cur.rowcount == 0:
            return jsonify({'error': 'User not found'}), 404
            
        conn.commit()
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route('/users/<int:id>/role', methods=['PUT'])
@require_admin
def update_user_role(id):
    data = request.get_json()
    new_role = data.get('role')
    
    if new_role not in ['user', 'admin']:
        return jsonify({'error': 'Invalid role'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, id))
        if cur.rowcount == 0:
            return jsonify({'error': 'User not found'}), 404
        conn.commit()
        return jsonify({'message': f'User role updated to {new_role}'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

# --- ADMIN PAYMENT MANAGEMENT (For Analytics) ---
@admin_bp.route('/payments', methods=['GET'])
@require_admin
def get_all_payments():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # 1. Get actual payments
        cur.execute("""
            SELECT p.id, p.amount, p.status, p.payment_date, 
                   u.unit_number, u.floor, t.name as tower_name, 
                   usr.email, usr.full_name, p.booking_id
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            JOIN users usr ON p.user_id = usr.id
            ORDER BY p.payment_date DESC
        """)
        payments = cur.fetchall()
        
        all_items = [dict(p) for p in payments]

        # 2. Calculate Pending Dues for all active leases
        cur.execute("""
            SELECT b.id as booking_id, u.unit_number, u.floor, u.price, t.name as tower_name,
                   usr.email, usr.full_name, usr.id as user_id, l.start_date
            FROM bookings b
            JOIN units u ON b.unit_id = u.id
            JOIN towers t ON u.tower_id = t.id
            JOIN users usr ON b.user_id = usr.id
            JOIN leases l ON l.booking_id = b.id
            WHERE b.status IN ('approved', 'rented')
        """)
        active_leases = cur.fetchall()

        from datetime import datetime
        now = datetime.now()

        for lease in active_leases:
            start_date = lease['start_date']
            if not start_date: continue
            
            # Count payments for this booking
            cur.execute("SELECT count(*) as count FROM payments WHERE booking_id = %s", (lease['booking_id'],))
            payment_count = cur.fetchone()['count']
            
            # Calculate months elapsed
            months_elapsed = (now.year - start_date.year) * 12 + (now.month - start_date.month)
            required_payments = months_elapsed + 1
            
            if payment_count < required_payments:
                # User is behind on payments. For the admin view, we just show "Pending" status
                all_items.append({
                    'id': f"DUE-{lease['booking_id']}",
                    'amount': lease['price'],
                    'status': 'pending',
                    'payment_date': now.strftime('%Y-%m-%d %H:%M:%S'),
                    'unit_number': lease['unit_number'],
                    'floor': lease['floor'],
                    'tower_name': lease['tower_name'],
                    'email': lease['email'],
                    'full_name': lease['full_name'],
                    'booking_id': lease['booking_id']
                })

        # Sort combined list by date (newest first)
        # Note: synthetic dates are 'now', so they bubble to top if overdue
        all_items.sort(key=lambda x: str(x['payment_date']), reverse=True)

        return jsonify(all_items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
