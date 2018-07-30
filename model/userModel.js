const mongoose = require('mongoose')

var Schema = mongoose.Schema

var UserSchema = new Schema({
    id: {
        type: String, 
        required: true,
        unique: true
    },
    password: {
        type: String, 
        required: true,
    },
    mac_address: {
        type: String, 
        required: true,
        unique: true
    },
    phone_number: {
        type: String, 
        required: true
    },
    homeLocation: {
        lat: {
            type: Number, 
            required: true,
        },
        lng: {
            type: Number, 
            required: true,
        }
    },
    schoolLocation: {
        lat: {
            type: Number, 
            required: true,
        },
        lng: {
            type: Number, 
            required: true,
        }
    }
})

var User = mongoose.model('User', UserSchema)

module.exports = {
    User
}