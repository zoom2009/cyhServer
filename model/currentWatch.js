const mongoose = require('mongoose')

var Schema = mongoose.Schema

var CurrentWatchSchema = new Schema({
    mac_address: {
        type: String,
        required: true,
        unique: true
    },
    lat : {
        type: Number,
        required: true
    },
    lng : {
        type: Number,
        required: true
    },
    temp: {
        type: Number,
        required: true
    },
    rssi: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: Number,
        required: true
    }
})


var CurrentWatch = mongoose.model('CurrentWatch', CurrentWatchSchema)

module.exports = {
    CurrentWatch
}