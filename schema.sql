-- schema.sql

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 插入预存用户
-- 注意：实际开发中 password_hash 应该是加盐哈希后的值
-- 这里先存入一个演示用的哈希（对应明文可能是 'admin123'）
INSERT INTO users (username, password_hash, display_name) 
VALUES ('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Stackout管理员');