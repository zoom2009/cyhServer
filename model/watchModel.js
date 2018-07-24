const mongoose = require('mongoose')

var Schema = mongoose.Schema

var Watch = mongoose.model('Watch', new Schema({
    key: String,
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
    carID: {
        type: String, 
        required: true
    }
}))

module.exports = {
    Watch
}