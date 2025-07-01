"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.authMiddleware = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../../models/User")); // Adjust path as necessary
const protect = async (req, res, next) => {
    console.log('[AuthMiddleware] Processing request:', {
        method: req.method,
        path: req.path,
        url: req.url,
        fullUrl: req.originalUrl,
        origin: req.headers.origin,
        hasAuth: !!req.headers.authorization,
        authHeader: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'None'
    });
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('[AuthMiddleware] Token extracted, length:', token.length);
            console.log('[AuthMiddleware] Token preview:', token.substring(0, 20) + '...');
            console.log('[AuthMiddleware] JWT_SECRET present:', !!process.env.JWT_SECRET);
            console.log('[AuthMiddleware] JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'yourfallbacksecret');
            console.log('[AuthMiddleware] Token decoded successfully:', {
                userId: decoded.id,
                iat: decoded.iat,
                exp: decoded.exp,
                isExpired: decoded.exp ? decoded.exp < Date.now() / 1000 : 'No expiration'
            });
            // Check if user still exists in database
            const user = await User_1.default.findById(decoded.id);
            if (!user) {
                console.error('[AuthMiddleware] ❌ User not found in database for ID:', decoded.id);
                setCorsHeaders(res, req.headers.origin);
                res.status(401).json({ message: 'Not authorized, user not found' });
                return;
            }
            // Attach user to request object
            req.user = { id: decoded.id };
            console.log('[AuthMiddleware] ✅ Token verified successfully for user:', decoded.id);
            next();
        }
        catch (error) {
            console.error('[AuthMiddleware] ❌ Token verification failed:', {
                error: error.message,
                name: error.name,
                expiredAt: error.expiredAt,
                tokenPreview: token ? token.substring(0, 20) + '...' : 'No token',
                jwtSecretPresent: !!process.env.JWT_SECRET
            });
            // Ensure CORS headers are set before sending 401
            setCorsHeaders(res, req.headers.origin);
            res.status(401).json({ message: 'Not authorized, token failed' });
            return;
        }
    }
    if (!token) {
        console.error('[AuthMiddleware] ❌ No token provided for:', {
            method: req.method,
            path: req.path,
            url: req.url,
            fullUrl: req.originalUrl,
            authHeader: req.headers.authorization || 'Missing'
        });
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
// Export auth as an alias to protect for compatibility
exports.auth = exports.protect;
