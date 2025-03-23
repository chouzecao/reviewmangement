const express = require('express');
const router = express.Router();
const User = require('../models/user.model');

// 登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }
        
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }
        
        req.session.userId = user._id;
        res.json({
            message: '登录成功',
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 登出
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: '登出成功' });
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: '未登录' });
        }
        
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        res.json({
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router; 