require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/user.model')
const config = require('../config/config')

const initDB = async () => {
    try {
        // 连接数据库
        await mongoose.connect(config.db.uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        console.log('Connected to MongoDB')

        // 检查是否已存在默认用户
        const existingUser = await User.findOne({ username: 'Finnertrip' })
        if (!existingUser) {
            // 创建默认用户
            const defaultUser = new User({
                username: 'Finnertrip',
                password: 'Fklx@820'
            })
            await defaultUser.save()
            console.log('Default user created successfully')
        } else {
            console.log('Default user already exists')
        }

        // 断开连接
        await mongoose.disconnect()
        console.log('Database initialization completed')
        process.exit(0)
    } catch (error) {
        console.error('Database initialization failed:', error)
        process.exit(1)
    }
}

initDB() 