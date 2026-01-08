const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Ambil token dari header
    const token = req.header('Authorization');
    
    // Cek jika tidak ada token
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        // Bersihkan format "Bearer <token>"
        const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
        
        // Verifikasi token
        const decoded = jwt.verify(tokenString, 'secret');
        
        // Simpan user ke request
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};