const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Ruta para probar conexión con MariaDB
router.post('/test-connection', async (req, res) => {
  const { host, port, setupType, rootUser, rootPassword, dbUser, dbPassword, databaseName } = req.body;
  

  
  // Validar campos según el tipo de configuración
  if (!host) {
    return res.status(400).json({
      success: false,
      message: 'El host es requerido'
    });
  }

  if (setupType === 'new') {
    if (!rootUser || !rootPassword) {
      return res.status(400).json({
        success: false,
        message: 'Para crear una nueva BD se requiere usuario y contraseña root'
      });
    }
  } else if (setupType === 'existing') {
    if (!dbUser || !dbPassword || !databaseName) {
      return res.status(400).json({
        success: false,
        message: 'Para conectar a BD existente se requiere usuario, contraseña y nombre de BD'
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      message: 'Tipo de configuración no válido'
    });
  }

  try {
    let connection;
    
    if (setupType === 'new') {
      // Conectar con credenciales de root para crear BD
      connection = await mysql.createConnection({
        host: host,
        port: port || 3306,
        user: rootUser,
        password: rootPassword
      });
    } else {
      // Conectar directamente a la BD existente
      connection = await mysql.createConnection({
        host: host,
        port: port || 3306,
        user: dbUser,
        password: dbPassword,
        database: databaseName
      });
    }

    await connection.ping();
    await connection.end();

    res.json({
      success: true,
      message: setupType === 'new' 
        ? 'Conexión exitosa con el servidor MariaDB'
        : 'Conexión exitosa con la base de datos'
    });
  } catch (error) {
    console.error('Error de conexión:', error);
    res.status(400).json({
      success: false,
      message: 'Error de conexión: ' + error.message
    });
  }
});

// Ruta para verificar si una base de datos existe
router.post('/check-database', async (req, res) => {
  const { host, port, rootUser, rootPassword, databaseName } = req.body;
  
  try {
    const connection = await mysql.createConnection({
      host: host,
      port: port || 3306,
      user: rootUser,
      password: rootPassword
    });

    const [rows] = await connection.execute(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [databaseName]
    );

    await connection.end();

    res.json({
      success: true,
      exists: rows.length > 0,
      message: rows.length > 0 ? 'La base de datos existe' : 'La base de datos no existe'
    });
  } catch (error) {
    console.error('Error verificando base de datos:', error);
    res.status(400).json({
      success: false,
      message: 'Error verificando base de datos: ' + error.message
    });
  }
});

// Ruta para crear base de datos y usuario
router.post('/create-database', async (req, res) => {
  const { 
    host, 
    port, 
    rootUser, 
    rootPassword, 
    databaseName, 
    dbUser, 
    dbPassword,
    useExistingDb 
  } = req.body;
  
  if (!host || !rootUser || !rootPassword || !databaseName || !dbUser || !dbPassword) {
    return res.status(400).json({
      success: false,
      message: 'Faltan datos requeridos'
    });
  }

  let connection;
  try {
    // Conectar como root
    connection = await mysql.createConnection({
      host: host,
      port: port || 3306,
      user: rootUser,
      password: rootPassword
    });

    // Crear o recrear la base de datos según useExistingDb
    if (!useExistingDb) {
      await connection.execute(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    }
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
    
    // Crear el usuario para % y localhost
    await connection.execute(
      `CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}'`
    );
    await connection.execute(
      `CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED BY '${dbPassword}'`
    );
    
    // Dar privilegios completos al usuario sobre la base de datos
    await connection.execute(
      `GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${dbUser}'@'%'`
    );
    await connection.execute(
      `GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${dbUser}'@'localhost'`
    );
    
    // Aplicar cambios
    await connection.execute('FLUSH PRIVILEGES');
    
    await connection.end();

    res.json({
      success: true,
      message: 'Base de datos y usuario creados exitosamente'
    });
  } catch (error) {
    if (connection) {
      await connection.end();
    }
    console.error('Error creando base de datos:', error);
    res.status(400).json({
      success: false,
      message: 'Error creando base de datos: ' + error.message
    });
  }
});

// Ruta para finalizar el setup
router.post('/complete', async (req, res) => {
  const { host, port, databaseName, dbUser, dbPassword, setupType, adminName, adminEmail, adminPassword, adminPhone } = req.body;
  
  try {
    // Probar conexión con el nuevo usuario
    const testConnection = await mysql.createConnection({
      host: host,
      port: port || 3306,
      user: dbUser,
      password: dbPassword,
      database: databaseName
    });
    
    await testConnection.ping();
    await testConnection.end();

    // Actualizar el archivo .env
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Actualizar las variables de entorno
    envContent = envContent.replace(/DB_HOST=.*/, `DB_HOST=${host}`);
    envContent = envContent.replace(/DB_PORT=.*/, `DB_PORT=${port || 3306}`);
    envContent = envContent.replace(/DB_NAME=.*/, `DB_NAME=${databaseName}`);
    envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${dbUser}`);
    envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${dbPassword}`);
    
    // Agregar o actualizar datos del administrador
    if (envContent.includes('DEFAULT_ADMIN_EMAIL=')) {
      envContent = envContent.replace(/DEFAULT_ADMIN_EMAIL=.*/, `DEFAULT_ADMIN_EMAIL=${adminEmail}`);
      envContent = envContent.replace(/DEFAULT_ADMIN_PASSWORD=.*/, `DEFAULT_ADMIN_PASSWORD=${adminPassword}`);
      envContent = envContent.replace(/DEFAULT_ADMIN_NAME=.*/, `DEFAULT_ADMIN_NAME=${adminName}`);
    } else {
      envContent += `\n\n# Admin por defecto\nDEFAULT_ADMIN_EMAIL=${adminEmail}\nDEFAULT_ADMIN_PASSWORD=${adminPassword}\nDEFAULT_ADMIN_NAME=${adminName}`;
    }
    
    envContent = envContent.replace(/SETUP_COMPLETED=.*/, 'SETUP_COMPLETED=true');
    
    fs.writeFileSync(envPath, envContent);

    // Recargar variables de entorno
    require('dotenv').config();

    // Ejecutar las migraciones de la base de datos
    const { initializeDatabase, getConnection } = require('../config/database');
    await initializeDatabase();

    // Crear usuario administrador
    const conn = await getConnection();
    
    // Verificar si ya existe un usuario administrador
    const [existingAdmin] = await conn.execute(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );
    
    if (existingAdmin.length === 0) {
      // Hashear la contraseña del administrador
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      // Crear el usuario administrador
      await conn.execute(
        'INSERT INTO users (email, password, name, phone, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [adminEmail, hashedPassword, adminName, adminPhone || null, 'admin', true]
      );
      
      console.log('✅ Usuario administrador creado exitosamente');
    } else {
      console.log('ℹ️ Usuario administrador ya existe');
    }

    res.json({
      success: true,
      message: 'Configuración completada exitosamente. La aplicación está lista para usar.'
    });
  } catch (error) {
    console.error('Error completando setup:', error);
    res.status(400).json({
      success: false,
      message: 'Error completando la configuración: ' + error.message
    });
  }
});

// Ruta para obtener el estado del setup
router.get('/status', (req, res) => {
  try {
    const envPath = path.join(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const setupCompleted = envContent.includes('SETUP_COMPLETED=true');
    
    res.json({
      setupCompleted,
      message: setupCompleted ? 'Setup completado' : 'Setup pendiente'
    });
  } catch (error) {
    res.json({
      setupCompleted: false,
      message: 'Setup pendiente'
    });
  }
});

module.exports = router;