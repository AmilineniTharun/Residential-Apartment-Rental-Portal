CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE towers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    floors INT NOT NULL
);

CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    tower_id INT NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    unit_number VARCHAR(20) NOT NULL,
    bhk INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    image_url VARCHAR(255)
);

CREATE INDEX idx_units_tower_id ON units(tower_id);
CREATE INDEX idx_units_bhk ON units(bhk);
CREATE INDEX idx_units_price ON units(price);

CREATE TABLE amenities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE unit_amenities (
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    amenity_id INT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (unit_id, amenity_id)
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_unit_id ON bookings(unit_id);

CREATE TABLE leases (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    rent_amount DECIMAL(10, 2)
);

-- Seed Default Authentication
INSERT INTO users (email, password_hash, role) VALUES ('admin@rentalportal.com', '$2b$12$gB1qJsJSIyYBFMM3Lt/iQeJrJlsIObrkOrSvDudQ.MbD3ulddPoTG', 'admin');
INSERT INTO users (email, password_hash, role) VALUES ('user@rentalportal.com', '$2b$12$saCbIiScPQ0xzmLmu/3QUO6aKy1jPQbH3IIIFWNuxQf.15R68niJu', 'user');

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_unit_id ON reviews(unit_id);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'paid' NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
