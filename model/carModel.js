const mongoose = require('mongoose')

var Schema = mongoose.Schema

var CarSchema = new Schema({
    id: {
        type: String, 
        required: true,
    },
    date: {
        type: String, 
        required: true
    },
    time: {
        type: String, 
        required: true
    },
    lat: {
        type: Number, 
        required: true
    },
    lng: {
        type: Number, 
        required: true
    },
    temp: {
        type: Number, 
        required: true
    },
    hum: {
        type: Number, 
        required: true
    },
    watch: [
        {
            name: {
                type: String,
                required: true
            },
            mac_address: {
                type: String,
                required: true
            }
        }
    ]
})

CarSchema.index({ date: 1, time: 1}, { unique: true });

var Car = mongoose.model('Car', CarSchema)

module.exports = {
    Car
}