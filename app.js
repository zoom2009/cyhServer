const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient;

var db
MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/KidData', (err, mydb) => {
  if(err){
    return console.log('DB Error')
  }
  console.log("Connected successfully to server")
  db = mydb
})

var app = express()

app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.send('server is created...')
})

app.post('/post', (req, res) => {
    let data = {
        lat: req.body.lat,
        lng: req.body.lng,
        hum: req.body.hum,
        temp: req.body.temp,
        Watch: req.body.Watch
    }
    db.collection('data').insertOne({
        lat: data.lat,
        lng: data.lng,
        hum: data.hum,
        temp: data.temp,
        Watch: data.Watch
    }, (err, result) => {
        if(err){
            res.status(400).send(err)
        }else if(result){
            res.send(result)
        }
    })
})

app.listen(process.env.PORT || 3000, () => {
    console.log('is listening on port 3000')
})