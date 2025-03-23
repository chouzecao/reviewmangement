const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.db.uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // 创建默认用户
        const User = require('../models/user.model');
        const defaultUser = {
            username: 'Finnertrip',
            password: 'Fklx@820'
        };
        
        const user = await User.findOne({ username: defaultUser.username });
        if (!user) {
            await User.create(defaultUser);
            console.log('Default user created');
        }
    } catch (error) {
        console.error('MongoDB连接失败:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB; 