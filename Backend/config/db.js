import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// Gunakan createPool instead of createConnection untuk better performance
export const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "masterpackaging",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ DB connection error:", err);
  } else {
    console.log("✅ Terhubung ke MySQL - Database: masterpackaging");
    connection.release();
  }
});

// Convert to promise interface untuk async/await
export const promisePool = db.promise();