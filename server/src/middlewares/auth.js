const jwt = require('jsonwebtoken');

// 获取JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'finnertrip-review-management-secret';

/**
 * JWT认证中间件
 * 验证请求头中的Bearer令牌
 * 如果验证成功，设置req.userId
 */
exports.authenticate = (req, res, next) => {
    // 先检查是否已经通过session认证
    if (req.session && req.session.userId) {
        req.userId = req.session.userId;
        return next();
    }

    // 检查Authorization头
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '未授权，请登录' });
    }

    const token = authHeader.split(' ')[1];
    try {
        // 验证JWT令牌
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        console.error('令牌验证失败:', error.message);
        return res.status(401).json({ message: '无效的令牌，请重新登录' });
    }
};

/**
 * 可选认证中间件
 * 如果提供了有效的令牌，解析并设置req.userId
 * 如果没有提供令牌，继续处理请求
 */
exports.optionalAuth = (req, res, next) => {
    // 先检查session
    if (req.session && req.session.userId) {
        req.userId = req.session.userId;
        return next();
    }

    // 检查令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
    } catch (error) {
        // 令牌无效，但不阻止请求继续
        console.error('可选令牌验证失败:', error.message);
    }
    next();
}; 