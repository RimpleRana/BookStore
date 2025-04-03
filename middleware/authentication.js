const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authentication(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader?.startsWith('Bearer')) {
        const token = authHeader.split(' ')[1];
        console.log("Extracted Token:", token);

        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            console.log("Decoded Token Payload:", decoded);
            console.log(decoded.id)

            const user = await User.findById(decoded.id)
                .select({ password: 0, refresh_token: 0 })
                .exec();

            if (!user) {
                console.error("User not found for ID:", decoded.id);
                return res.status(401).json({ message: "Unauthorized: User not found" });
            }
            console.log("User Found:", user);
            req.user = user.toObject({ getters: true });
            next();
        } catch (err) {
            console.error("Token verification failed:", err.message);
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
    } else {
        console.error("No Bearer token found");
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
}

module.exports = authentication;  
