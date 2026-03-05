from flask import Blueprint, request, jsonify
from db import get_db_connection

flat_bp = Blueprint('flats', __name__)

@flat_bp.route('/', methods=['GET'])
def get_flats():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit
    
    price_min = request.args.get('price_min')
    price_max = request.args.get('price_max')
    bhk = request.args.get('bhk')
    tower_id = request.args.get('tower_id')
    status = request.args.get('status', 'available')
    location = request.args.get('location')
    floor = request.args.get('floor')
    wing = request.args.get('wing')

    query = """
        SELECT u.id, u.unit_number, u.bhk, u.price, u.security_deposit, u.status, u.available_from, u.image_url, u.description,
               u.floor, u.wing, u.location,
               t.name as tower_name, t.id as tower_id, t.floors, t.state, t.city, t.area, t.street,
               (SELECT json_agg(json_build_object('name', a.name, 'description', a.description)) FROM unit_amenities ua JOIN amenities a ON ua.amenity_id = a.id WHERE ua.unit_id = u.id) as amenities,
               (SELECT coalesce(json_agg(ui.image_url), '[]'::json) FROM unit_images ui WHERE ui.unit_id = u.id) as images
        FROM units u
        JOIN towers t ON u.tower_id = t.id
        WHERE 1=1
    """
    params = []
    
    if status != 'all':
        query += " AND u.status = %s"
        params.append(status)

    if price_min:
        query += " AND u.price >= %s"
        params.append(price_min)
    if price_max:
        query += " AND u.price <= %s"
        params.append(price_max)
    if bhk:
        query += " AND u.bhk = %s"
        params.append(bhk)
    if tower_id:
        query += " AND u.tower_id = %s"
        params.append(tower_id)
    if floor:
        query += " AND u.floor = %s"
        params.append(floor)
    if wing:
        query += " AND u.wing ILIKE %s"
        params.append(f"%{wing}%")
    if location:
        query += " AND (t.state ILIKE %s OR t.city ILIKE %s OR t.area ILIKE %s OR t.street ILIKE %s)"
        loc_pattern = f"%{location}%"
        params.extend([loc_pattern, loc_pattern, loc_pattern, loc_pattern])
        
    query += " ORDER BY u.id LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(query, tuple(params))
        flats = cur.fetchall()
        
        # Count total for pagination
        count_query = """
            SELECT COUNT(*) FROM units u
            JOIN towers t ON u.tower_id = t.id
            WHERE 1=1
        """
        count_params = []

        if status != 'all':
            count_query += " AND u.status = %s"
            count_params.append(status)
        if price_min:
            count_query += " AND u.price >= %s"
            count_params.append(price_min)
        if price_max:
            count_query += " AND u.price <= %s"
            count_params.append(price_max)
        if bhk:
            count_query += " AND u.bhk = %s"
            count_params.append(bhk)
        if tower_id:
            count_query += " AND u.tower_id = %s"
            count_params.append(tower_id)
        if location:
            count_query += " AND (t.state ILIKE %s OR t.city ILIKE %s OR t.area ILIKE %s OR t.street ILIKE %s)"
            count_params.extend([loc_pattern, loc_pattern, loc_pattern, loc_pattern])
            
        cur.execute(count_query, tuple(count_params))
        total_count = cur.fetchone()['count']
        
        return jsonify({
            'data': flats,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_count,
                'pages': (total_count + limit - 1) // limit
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@flat_bp.route('/<int:id>', methods=['GET'])
def get_flat(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT u.*, t.name as tower_name,
                   (SELECT json_agg(json_build_object('name', a.name, 'description', a.description)) FROM unit_amenities ua JOIN amenities a ON ua.amenity_id = a.id WHERE ua.unit_id = u.id) as amenities,
                   (SELECT coalesce(json_agg(ui.image_url), '[]'::json) FROM unit_images ui WHERE ui.unit_id = u.id) as images
            FROM units u
            JOIN towers t ON u.tower_id = t.id
            WHERE u.id = %s
        """, (id,))
        flat = cur.fetchone()
        if not flat:
            return jsonify({'error': 'Flat not found'}), 404
        return jsonify(flat), 200
    finally:
        cur.close()
        conn.close()

@flat_bp.route('/<int:id>/images', methods=['GET'])
def get_flat_images(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM units WHERE id = %s", (id,))
        if not cur.fetchone():
            return jsonify({'error': 'Flat not found'}), 404

        cur.execute("SELECT id, image_url, created_at FROM unit_images WHERE unit_id = %s ORDER BY id ASC", (id,))
        images = cur.fetchall()
        
        return jsonify({'images': images}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
@flat_bp.route('/towers', methods=['GET'])
def get_towers_public():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name, floors, image_url, description, state, city, area, street, units_per_floor FROM towers ORDER BY name ASC")
        towers = cur.fetchall()
        return jsonify(towers), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
