const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

// 获取JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'finnertrip-review-management-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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
        
        // 同时支持session和JWT认证
        req.session.userId = user._id;
        
        // 生成JWT令牌
        const token = jwt.sign(
            { id: user._id }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        res.json({
            message: '登录成功',
            token, // 添加token到响应
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
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
        // 从session或JWT获取用户ID
        const userId = req.userId || req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ message: '未登录' });
        }
        
        const user = await User.findById(userId);
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
        console.error('获取用户信息错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 添加/check路由作为/me的别名
router.get('/check', async (req, res) => {
    try {
        // 从session或JWT获取用户ID
        const userId = req.userId || req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ message: '未登录' });
        }
        
        const user = await User.findById(userId);
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
        console.error('检查认证状态错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router; 