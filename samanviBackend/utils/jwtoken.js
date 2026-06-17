var jwt = require('jsonwebtoken');
const JWT_SECRET = '7b4743fec0c12eb2da50be672c3988a4';

// Middleware to verify token
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ "status": 401, "msg": 'Access Denied' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ "status": 401, "msg": 'No Token' });
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ "status": 403, "msg": 'Token expired' });
        }
        next();
    });
}

module.exports = { verifyToken };