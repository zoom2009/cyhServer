const mongoose = require('mongoose')

var Schema = mongoose.Schema

var CarDataSchema = new Schema({
    watch: [
        {
            color: {
                type: String,
                required: true
            },
            mac_address: {
                type: String,
                required: true
            }
        }
    ],
    tabain: {
        type: String,
        required: true,
        unique: true
    }
})

var CarData = mongoose.model('CarData', CarDataSchema)

module.exports = {
    CarData
}