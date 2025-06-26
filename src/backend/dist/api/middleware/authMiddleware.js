"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const protect = async (req, res, next) => {
    console.log('[AuthMiddleware] Processing request:', {
        method: req.method,
        path: req.path,
        origin: req.headers.origin,
        hasAuth: !!req.headers.authorization
    });
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('[AuthMiddleware] Token extracted, verifying...');
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'yourfallbacksecret');
            // Attach user to request object (without password)
            // In a real app, you might want to check if user still exists, is not blocked, etc.
            req.user = { id: decoded.id }; // Or fetch full user: await User.findById(decoded.id).select('-password');
            console.log('[AuthMiddleware] ✅ Token verified successfully for user:', decoded.id);
            next();
        }
        catch (error) {
            console.error('[AuthMiddleware] ❌ Token verification failed', error);
            // Ensure CORS headers are set before sending 401
            setCorsHeaders(res, req.headers.origin);
            res.status(401).json({ message: 'Not authorized, token failed' });
            return;
        }
    }
    if (!token) {
        console.error('[AuthMiddleware] ❌ No token provided');
        // Ensure CORS headers are set before sending 401
        setCorsHeaders(res, req.headers.origin);
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }
};
exports.protect = protect;
// Helper function to set CORS headers consistently
const setCorsHeaders = (res, origin) => {
    res.header('Access-Control-Allow-Origin', origin || 'https://synapse-frontend.onrender.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
};
// Export as authMiddleware for compatibility
exports.authMiddleware = exports.protect;
