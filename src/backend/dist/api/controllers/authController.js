"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const User_1 = __importDefault(require("../../models/User")); // Adjust path as necessary
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken")); // We'll install this next
// Function to generate JWT
// Store your JWT_SECRET in .env file
const generateToken = (id) => {
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
    console.log('Received login request body:', req.body);
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        // Find user by email. We need to explicitly select the password field 
        // because it's set to select: false in the schema by default.
        const user = await User_1.default.findOne({ email }).select('+password');
        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                token: generateToken(user.id),
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
