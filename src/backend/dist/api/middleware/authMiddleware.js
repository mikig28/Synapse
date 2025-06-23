"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'yourfallbacksecret');
            // Attach user to request object (without password)
            // In a real app, you might want to check if user still exists, is not blocked, etc.
            req.user = { id: decoded.id }; // Or fetch full user: await User.findById(decoded.id).select('-password');
            next();
        }
        catch (error) {
            console.error('Token verification failed', error);
            // Ensure CORS headers are set before sending 401
            res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.status(401).json({ message: 'Not authorized, token failed' });
            return;
        }
    }
    if (!token) {
        // Ensure CORS headers are set before sending 401
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }
};
exports.protect = protect;
// Export as authMiddleware for compatibility
exports.authMiddleware = exports.protect;
