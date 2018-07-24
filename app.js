const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
//export from another files
const {Car} = require('./model/carModel')
const {Watch} = require('./model/watchModel')

const port = process.env.PORT || 3000 ;

mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGODB_URI ||'mongodb://localhost/cyhDB')
  .then(() =>  console.log('@@@ Connection db is succes @@@'))
  .catch((err) => console.error('!!! Fail to connect db !!!'));

var app = express()
app.use(bodyParser.json())


function waitAsyAndRes200(countStatus, postData) {
    console.log(countStatus)
    if(countStatus === postData.watch.length+1){
        //res.send('is saved')
        countStatus = 0 
        console.log('done')
        return true
    }else {
        countStatus = 0
        return false
    }
}

app.get('/', (req, res) => {
    res.send('Server is created...')
})

app.post('/post', (req, res) => {
    var countStatus = 0 // 1 = success, 0 = fail
    let postData = {
        id: req.body.id,
        date: req.body.date,
        time: req.body.time,
        lat: req.body.lat,
        lng: req.body.lng,
        temp: req.body.temp,
        hum: req.body.hum,
        watch: req.body.watch
    }

    let newCar = Car(postData)
    newCar.save().then((doc) => {
        countStatus++
        console.log('+++')
        if(waitAsyAndRes200(countStatus, postData)) {
            res.send('is Saved')
        }
    }, (e) => {
        countStatus = 0 
        res.status(400).send(e)
        return
    })
    
    for(let i=0;i<postData.watch.length;i++) {
        let watchData = {
            id: postData.watch[i].mac_address,
            carID: postData.id,
            date: postData.date,
            time: postData.time,
            lat: postData.lat,
            lng: postData.lng,
            temp: postData.temp,
            hum: postData.hum
        }
        let newWatch = new Watch(watchData)
        newWatch.save().then((doc) => {
            countStatus++
            console.log('+++')
            if(i===postData.watch.length-1) {
                if(waitAsyAndRes200(countStatus, postData)) {
                    res.send('is Saved')
                }
            }
        }, (e) => {
            countStatus = 0 
            res.status(400).send(e)
            return
        })
    }
    
})

app.listen(port, () => {
    console.log('is listening on port '+port)
})
