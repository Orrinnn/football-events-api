"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set');
}
async function hashPassword(password) {
    return bcrypt_1.default.hash(password, 10);
}
async function comparePassword(password, hashedPassword) {
    return bcrypt_1.default.compare(password, hashedPassword);
}
function generateToken(user) {
    return jsonwebtoken_1.default.sign(user, jwtSecret, { expiresIn: '7d' });
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        if (typeof decoded === 'string') {
            return null;
        }
        if (typeof decoded.id !== 'number' ||
            typeof decoded.username !== 'string' ||
            typeof decoded.email !== 'string' ||
            (decoded.role !== 'admin' && decoded.role !== 'user')) {
            return null;
        }
        return {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
        };
    }
    catch {
        return null;
    }
}
