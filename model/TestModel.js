const mongoose = require('mongoose')

var Schema = mongoose.Schema

var TestSchema = new Schema({
    id: {
        type: String, 
    }
})

var Test = mongoose.model('Test', TestSchema)

module.exports = {
    Test
}