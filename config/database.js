const mysql = require('mysql2/promise');

let connection;

const getConnection = async () => {
  if (!connection) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rifa_system',
      charset: 'utf8mb4',
      authPlugins: {
        mysql_native_password: () => () => Buffer.alloc(0)
      },
      ssl: false,
      connectTimeout: 60000,
      acquireTimeout: 60000
    });
  }
  return connection;
};

const createDatabase = async () => {
  try {
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4',
      authPlugins: {
        mysql_native_password: () => () => Buffer.alloc(0)
      },
      ssl: false,
      connectTimeout: 60000,
      acquireTimeout: 60000
    });

    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'rifa_system'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();
    console.log('✅ Base de datos \'rifa_system\' creada o ya existe');
  } catch (error) {
    console.error('❌ Error al crear la base de datos:', error);
    throw error;
  }
};

const initializeDatabase = async () => {
  try {
    const conn = await getConnection();
    
    // Crear tabla de usuarios
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role ENUM('user', 'admin') DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Agregar columna is_active si no existe (para bases de datos existentes)
    try {
      await conn.execute(`
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true
      `);
      console.log('✅ Columna is_active agregada a la tabla users');
    } catch (error) {
      // La columna ya existe, ignorar el error
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Columna is_active ya existe en la tabla users');
      }
    }

    // Crear tabla de rifas
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS rifas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        total_tickets INT NOT NULL,
        ticket_price DECIMAL(10,2) NOT NULL,
        min_tickets INT DEFAULT 1,
        draw_date DATE NOT NULL,
        image_url VARCHAR(500),
        status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear tabla de paquetes
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rifa_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        ticket_quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rifa_id) REFERENCES rifas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear tabla de tickets
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rifa_id INT NOT NULL,
        ticket_number INT NOT NULL,
        buyer_name VARCHAR(255),
        buyer_email VARCHAR(255),
        buyer_phone VARCHAR(20),
        payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rifa_id) REFERENCES rifas(id) ON DELETE CASCADE,
        UNIQUE KEY unique_ticket (rifa_id, ticket_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear tabla de configuraciones
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(255) UNIQUE NOT NULL,
        config_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insertar configuraciones por defecto
    await conn.execute(`
      INSERT IGNORE INTO config (config_key, config_value) VALUES 
      ('app_title', 'Rifa App'),
      ('app_logo_url', '')
    `);

    console.log('✅ Base de datos inicializada');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
};

const checkDatabaseConnection = async () => {
  try {
    const conn = await getConnection();
    await conn.ping();
    console.log('✅ Conexión a la base de datos verificada');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error.message);
    throw error;
  }
};

module.exports = {
  getConnection,
  createDatabase,
  initializeDatabase,
  checkDatabaseConnection
};