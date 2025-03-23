const mongoose = require('mongoose');
const config = require('./config/config');

console.log('正在测试数据库连接...');

async function testConnection() {
    try {
        const conn = await mongoose.connect(config.db.uri, config.db.options);
        console.log(`MongoDB连接成功: ${conn.connection.host}`);
        process.exit(0);
    } catch (error) {
        console.error('MongoDB连接失败:', error.message);
        process.exit(1);
    }
}

testConnection(); 