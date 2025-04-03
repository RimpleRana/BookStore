const mongoose = require('mongoose')

const Schema = mongoose.Schema

const UserSchema = Schema(
    {
        username: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true,
            validation: [
                (val) => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(val),
            ]
        },
        googleId: { 
            type: String, 
            unique: true 
        },
        name: { 
            type: String 
        },
        first_name: {
            type: String,
            required: true
        },
        last_name: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: function() {
                return !this.googleId;  // Only require password if googleId is not set
            },
        },
        role: {
            type: String,
            enum: ['User', 'Admin'],
            required: true
        },
        refresh_token: String
    },
    {
        virtuals: {
            full_name: {
                get() {
                    return this.first_name + ' ' + this.last_name
                }
            },
            id: {
                get() {
                    return this._id
                }
            }
        }
    }
)

module.exports = mongoose.model('User', UserSchema)