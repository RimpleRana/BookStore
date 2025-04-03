const User = require('../models/User')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function register(req, res) {
    const { username, email, first_name, last_name, password, confirm_password, role } = req.body

    if (!username || !email || !password || !confirm_password || !first_name || !last_name)
        return res.status(422).json({ 'message': 'Invalid fields' })

    if (password !== confirm_password) return res.status(422).json({ 'message': 'Password do not match' })

    if (!role || (role !== 'User' && role !== 'Admin')) {
        return res.status(400).json({ message: "Invalid role selected." });
    }
    const userExists = await User.exists({ email }).exec()

    if (userExists) return res.sendStatus(409)
    try {
        hashedpassword = await bcrypt.hash(password, 10)

        await User.create({ email, username, password: hashedpassword, first_name, last_name, role, })

        return res.sendStatus(201)
    } catch (error) {
        return res.status(400).json({ message: "Could not register" })
    }
}

async function login(req, res) {
    const { email, password } = req.body

    if (!email || !password)
        return res.status(422).json({ 'message': 'Invalid fields' })

    const user = await User.findOne({ email }).exec()

    if (!user) return res.status(401).json({ message: "Email or Password is incorrect" })

    const match = await bcrypt.compare(password, user.password)

    if (!match) return res.status(401).json({ message: "Email or Password is incorrect" })

    const accessToken = jwt.sign(
        {
            id: user.id
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: '1800s'
        }
    )
    const refreshToken = jwt.sign(
        {
            id: user.id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: '1d'
        }
    )
    user.refresh_token = refreshToken
    await user.save()

    res.cookie('refresh_token', refreshToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'None', secure: true })

    res.json({
        access_token: accessToken,
        role: user.role
    });
}

async function google(req, res) {
    const { token, isAdmin } = req.body;
    console.log("Received isAdmin:", isAdmin);

    try {
        const ticket = await client.verifyIdToken({
            idToken: token, 
            audience: process.env.GOOGLE_CLIENT_ID,  
        });
        const payload = ticket.getPayload();  

        if (!payload) {
            return res.status(400).json({ message: "Invalid Google token" });
        }

        const { email, name, sub: googleId, given_name, family_name } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            const first_name = given_name || '';
            const last_name = family_name || '';
            const username = name; 
            const password = '';

            const role = isAdmin ? 'Admin' : 'User';

            user = new User({ email, googleId, name, first_name, last_name, username, password, role });
            await user.save();
        }

        if (!user._id) {
            return res.status(500).json({ message: "User ID missing after saving to database" });
        }

        const accessToken = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            message: "User authenticated successfully",
            accessToken,
            user,
        });
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(500).json({ message: "Server error" });
    }
}

async function logout(req, res) {
    try {
        const cookies = req.cookies

        if (!cookies.refresh_token) return res.sendStatus(204)

        const refreshToken = cookies.refresh_token

        const user = await User.findOne({ refresh_token: refreshToken }).exec()

        if (!user) {
            res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'None', secure: true })
            return res.sendStatus(204)
        }

        user.refresh_token = null
        await user.save()

        res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'None', secure: true })
        return res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ message: 'Internal server error during logout' });
    }
}

async function refresh(req, res) {
    const cookies = req.cookies
    if (!cookies.refresh_token) return res.sendStatus(401)

    const refreshToken = cookies.refresh_token

    const user = await User.findOne({ refresh_token: refreshToken }).exec()

    if (!user) return res.sendStatus(403)

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
            if (err || user.id !== decoded.id) return res.sendStatus(403)

            const accessToken = jwt.sign(
                { id: decoded.id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '1800s' }
            )
            res.json({ access_token: accessToken })
        }
    )
}

async function user(req, res) {
    console.log("User Object in Request:", req.user);

    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    return res.status(200).json({ message: "User retrieved successfully", user: req.user });
}

module.exports = { register, login, logout, refresh, user, google }