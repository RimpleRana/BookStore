const allowdOrigins = require('./allowed_origins.js')

const corsOptions = {
    origin: (origin, callback) => {
        if (allowdOrigins.includes(origin) || !origin) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}

module.exports = corsOptions