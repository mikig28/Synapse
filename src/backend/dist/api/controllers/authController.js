"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLogin = exports.loginUser = exports.registerUser = void 0;
const User_1 = __importDefault(require("../../models/User")); // Adjust path as necessary
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken")); // We'll install this next
// Function to generate JWT
// Store your JWT_SECRET in .env file
const generateToken = (id) => {
    console.log(`[generateToken] Generating token for user ID: ${id}`);
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'yourfallbacksecret', {
        expiresIn: '30d', // Token expiration
    });
};
const registerUser = async (req, res) => {
    console.log('Received registration request body:', req.body); // ADDED THIS LOG
    const { fullName, email, password } = req.body;
    // Simple validation to ensure email and password are provided before Mongoose validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        // Check if user already exists
        const userExists = await User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Create new user
        const user = new User_1.default({
            fullName,
            email,
            password,
        });
        await user.save();
        // Password is not selected by default, so user object from save() won't have it.
        // We fetch it again if we need it, or more commonly, just generate token with id.
        // For the response, we typically don't send the password back.
        if (user && user.id) {
            res.status(201).json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                token: generateToken(user.id),
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data or user ID not found after save' });
        }
    }
    catch (error) {
        console.error('[REGISTER_USER_ERROR]', error); // Log the full error
        res.status(500).json({ message: error.message });
    }
};
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    console.log('LOGIN ATTEMPT - Raw Request Body:', JSON.stringify(req.body, null, 2)); // Log raw body
    const { email, password } = req.body;
    console.log(`LOGIN ATTEMPT - Email: ${email}, Type: ${typeof email}`);
    console.log(`LOGIN ATTEMPT - Password Present: ${password ? 'Yes' : 'No'}, Type: ${typeof password}`);
    if (!email || !password) {
        console.log('LOGIN REJECTED - Missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        // Find user by email. We need to explicitly select the password field 
        // because it's set to select: false in the schema by default.
        const user = await User_1.default.findOne({ email }).select('+password');
        if (user && (await user.comparePassword(password))) {
            const token = generateToken(user.id);
            console.log(`[loginUser] User ${user.email} (ID: ${user.id}) logged in. Token generated.`);
            res.json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                token: token,
            });
        }
        else {
            // Generic message for security; don't reveal if email exists but password was wrong
            res.status(401).json({ message: 'Invalid email or password' });
        }
    }
    catch (error) {
        console.error('[LOGIN_USER_ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};
exports.loginUser = loginUser;
const googleLogin = async (req, res) => {
    console.log('GOOGLE LOGIN ATTEMPT - Request Body:', JSON.stringify(req.body, null, 2));
    const { googleUserInfo, googleAccessToken } = req.body;
    if (!googleUserInfo || !googleUserInfo.email || !googleUserInfo.sub) {
        console.log('GOOGLE LOGIN REJECTED - Missing Google user info');
        return res.status(400).json({ message: 'Google user information is required' });
    }
    try {
        // Check if user already exists by email
        let user = await User_1.default.findOne({ email: googleUserInfo.email });
        if (!user) {
            // Create new user with Google info
            user = new User_1.default({
                fullName: googleUserInfo.name,
                email: googleUserInfo.email,
                // For Google users, we don't have a password, so we'll create a placeholder
                // or handle this differently in your User model
                password: `google_${googleUserInfo.sub}_${Date.now()}`, // Temporary password
                googleId: googleUserInfo.sub, // Store Google ID for future reference
            });
            await user.save();
            console.log(`[googleLogin] New user created for Google login: ${user.email} (ID: ${user.id})`);
        }
        else {
            console.log(`[googleLogin] Existing user found for Google login: ${user.email} (ID: ${user.id})`);
            // Optionally update Google ID if not set
            if (!user.googleId) {
                user.googleId = googleUserInfo.sub;
                await user.save();
            }
        }
        const token = generateToken(user.id);
        console.log(`[googleLogin] User ${user.email} (ID: ${user.id}) logged in via Google. Token generated.`);
        res.json({
            _id: user.id,
            fullName: user.fullName,
            email: user.email,
            token: token,
        });
    }
    catch (error) {
        console.error('[GOOGLE_LOGIN_ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};
exports.googleLogin = googleLogin;
