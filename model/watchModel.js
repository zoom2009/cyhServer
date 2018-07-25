const mongoose = require('mongoose')

var Schema = mongoose.Schema

var WatchSchema = new Schema({

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
        type: Number, 
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
})

WatchSchema.index({ date: 1, time: 1, id: 1}, { unique: true });

var Watch = mongoose.model('Watch', WatchSchema);

module.exports = {
    Watch
}