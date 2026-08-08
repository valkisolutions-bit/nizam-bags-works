const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection config (Overridable via environment variables)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'XXXXXXXXXXXXXXXXXX',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
};

const DB_NAME = process.env.DB_NAME || 'nazim_pos';

let pool;

// ── 1. Auto-Initialization ───────────────────────────────────────────────────
async function initDatabase() {
  try {
    // First connect without specifying database to create database if missing
    const rootConnection = await mysql.createConnection(dbConfig);
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await rootConnection.end();

    // Initialize connection pool pointing to nazim_pos
    pool = mysql.createPool({
      ...dbConfig,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log(`Connected to MySQL database: ${DB_NAME}`);

    // Create required tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(100) UNIQUE NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) DEFAULT 0.00,
        payment_method VARCHAR(50) NOT NULL,
        order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(100) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        times_sold INT DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Database tables initialized successfully.');
  } catch (err) {
    console.error('Error initializing MySQL database:', err.message);
    process.exit(1);
  }
}

// ── 2. Order Endpoints ───────────────────────────────────────────────────────

/**
 * POST /api/orders
 * Creates a new order, saves order items, and updates/upserts products times_sold.
 */
app.post('/api/orders', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      id,
      order_id,
      total,
      total_amount,
      discount = 0,
      paymentMethod,
      payment_method,
      items = [],
      date,
      order_date,
    } = req.body;

    const finalOrderId = order_id || id;
    const finalTotal = total_amount !== undefined ? total_amount : total;
    const finalPaymentMethod = payment_method || paymentMethod || 'CASH';
    const finalOrderDate = order_date || date || new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (!finalOrderId || finalTotal === undefined) {
      return res.status(400).json({ error: 'order_id and total_amount are required.' });
    }

    await connection.beginTransaction();

    // 1. Insert into orders table
    await connection.query(
      `INSERT INTO orders (order_id, total_amount, discount, payment_method, order_date)
       VALUES (?, ?, ?, ?, ?)`,
      [finalOrderId, finalTotal, discount, finalPaymentMethod, new Date(finalOrderDate)]
    );

    // 2. Insert order items & update product times_sold
    for (const item of items) {
      const itemName = (item.name || item.item_name || '').toUpperCase().trim();
      const qty = Number(item.qty || item.quantity || 1);
      const unitPrice = Number(item.price || item.unit_price || 0);
      const totalPrice = Number(item.total_price || unitPrice * qty);

      if (!itemName) continue;

      // Insert item detail
      await connection.query(
        `INSERT INTO order_items (order_id, item_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [finalOrderId, itemName, qty, unitPrice, totalPrice]
      );

      // Increment times_sold counter in products table (Upsert)
      await connection.query(
        `INSERT INTO products (name, times_sold)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE times_sold = times_sold + VALUES(times_sold)`,
        [itemName, qty]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Order created successfully',
      order_id: finalOrderId,
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error creating order:', err);
    return res.status(500).json({ error: 'Failed to create order', details: err.message });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/orders
 * Returns list of orders with nested order_items.
 * Supports query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
app.get('/api/orders', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];

    if (startDate && endDate) {
      query += ' WHERE order_date BETWEEN ? AND ?';
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else if (startDate) {
      query += ' WHERE order_date >= ?';
      params.push(`${startDate} 00:00:00`);
    } else if (endDate) {
      query += ' WHERE order_date <= ?';
      params.push(`${endDate} 23:59:59`);
    }

    query += ' ORDER BY order_date DESC';

    const [orders] = await pool.query(query, params);

    if (orders.length === 0) {
      return res.json([]);
    }

    // Fetch order items for retrieved orders
    const orderIds = orders.map((o) => o.order_id);
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id IN (?)`,
      [orderIds]
    );

    // Group items by order_id
    const itemsByOrderId = items.reduce((acc, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = [];
      acc[item.order_id].push(item);
      return acc;
    }, {});

    // Attach items to each order object
    const result = orders.map((order) => ({
      ...order,
      items: itemsByOrderId[order.order_id] || [],
    }));

    return res.json(result);
  } catch (err) {
    console.error('Error fetching orders:', err);
    return res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

// ── 3. Product / Inventory Endpoints ─────────────────────────────────────────

/**
 * GET /api/products
 * Returns all products ordered by times_sold descending.
 */
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM products ORDER BY times_sold DESC');
    return res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

/**
 * POST /api/products
 * Converts product name to UPPERCASE and inserts into products table.
 */
app.post('/api/products', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }

    const upperName = name.trim().toUpperCase();

    // Insert product (ignore if already exists)
    const [result] = await pool.query(
      `INSERT INTO products (name, times_sold)
       VALUES (?, 0)
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [upperName]
    );

    const [rows] = await pool.query('SELECT * FROM products WHERE name = ?', [upperName]);

    return res.status(201).json({
      message: 'Product saved successfully',
      product: rows[0],
    });
  } catch (err) {
    console.error('Error creating product:', err);
    return res.status(500).json({ error: 'Failed to create product', details: err.message });
  }
});

// ── 4. Start Server ──────────────────────────────────────────────────────────
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Nazim POS Backend Server running on http://localhost:${PORT}`);
  });
});
