-- Base de datos para DLS Barber
CREATE DATABASE IF NOT EXISTS dls_barber;

USE dls_barber;

-- Tabla de usuarios
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de barberos
CREATE TABLE barbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    specialty VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de servicios
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    price DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de reservas
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    barber_id INT,
    service_id INT,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    client_email VARCHAR(100),
    notes TEXT,
    status ENUM(
        'pending',
        'confirmed',
        'completed',
        'cancelled'
    ) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (barber_id) REFERENCES barbers (id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL,
    UNIQUE KEY unique_reservation (
        barber_id,
        reservation_date,
        reservation_time
    )
);

-- Tabla de horarios disponibles
CREATE TABLE available_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week ENUM(
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
    ) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    barber_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (barber_id) REFERENCES barbers (id) ON DELETE CASCADE
);

-- Insertar datos iniciales
INSERT INTO
    barbers (name, email, phone, specialty)
VALUES (
        'Samuel',
        'samuel@dlsbarber.com',
        '092870198',
        'Barbero Profesional'
    );

INSERT INTO
    services (
        name,
        description,
        duration_minutes,
        price
    )
VALUES (
        'Corte de cabello',
        'Corte profesional personalizado',
        30,
        800.00
    ),
    (
        'Arreglo de barba',
        'Arreglo y diseño de barba',
        20,
        500.00
    ),
    (
        'Afeitado clásico',
        'Afeitado tradicional con navaja',
        25,
        600.00
    ),
    (
        'Diseños personalizados',
        'Diseños creativos en cabello',
        45,
        1200.00
    ),
    (
        'Cortes ejecutivos',
        'Cortes profesionales para ejecutivos',
        35,
        1000.00
    );

-- Insertar horarios disponibles (Lunes a Viernes 8:00-21:30)
INSERT INTO
    available_hours (
        day_of_week,
        start_time,
        end_time,
        barber_id
    )
VALUES (
        'monday',
        '08:00:00',
        '21:30:00',
        1
    ),
    (
        'tuesday',
        '08:00:00',
        '21:30:00',
        1
    ),
    (
        'wednesday',
        '08:00:00',
        '21:30:00',
        1
    ),
    (
        'thursday',
        '08:00:00',
        '21:30:00',
        1
    ),
    (
        'friday',
        '08:00:00',
        '21:30:00',
        1
    ),
    (
        'saturday',
        '08:00:00',
        '20:00:00',
        1
    ),
    (
        'sunday',
        '09:00:00',
        '18:00:00',
        1
    );

-- Crear usuario admin por defecto
INSERT INTO
    users (
        username,
        email,
        password_hash,
        full_name,
        phone,
        role
    )
VALUES (
        'admin',
        'admin@dlsbarber.com',
        '$2a$10$example_hash_here',
        'Administrador DLS',
        '092870198',
        'admin'
    );