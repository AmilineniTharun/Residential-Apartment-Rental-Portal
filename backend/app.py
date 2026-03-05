from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Import blueprints (to be created)
from routes.auth_routes import auth_bp
from routes.flat_routes import flat_bp
from routes.booking_routes import booking_bp
from routes.admin_routes import admin_bp
from routes.review_routes import review_bp
from routes.recommendation_routes import recommendation_bp
from routes.payment_routes import payment_bp
from routes.lease_routes import lease_bp
from routes.maintenance_routes import maintenance_bp

load_dotenv()

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    CORS(app) # Enable CORS for all routes

    # Ensure upload directory exists
    os.makedirs(os.path.join(app.root_path, 'static', 'uploads'), exist_ok=True)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(flat_bp, url_prefix='/api/flats')
    app.register_blueprint(booking_bp, url_prefix='/api/bookings')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(review_bp, url_prefix='/api/reviews')
    app.register_blueprint(recommendation_bp, url_prefix='/api/recommendations')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')
    app.register_blueprint(lease_bp, url_prefix='/api/lease')
    app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')

    @app.errorhandler(Exception)
    def handle_exception(e):
        # Global error handler
        return jsonify({"error": str(e)}), 500

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "ok", "message": "API is running!"}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
