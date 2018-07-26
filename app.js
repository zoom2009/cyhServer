const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const hash = require('object-hash');
//export from another files
const {Car} = require('./model/carModel')
const {Watch} = require('./model/watchModel')


//========================== Playground ============================



//==================================================================

const port = process.env.PORT || 3000 ;

mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGODB_URI ||'mongodb://localhost/cyhDB')
  .then(() =>  console.log('@@@ Connection db is succes @@@'))
  .catch((err) => console.error('!!! Fail to connect db !!!'));

var app = express()
app.use(bodyParser.json())

//###################################  FUNCTION  ##################################################

function makeMulitime(timeStr) {
    let t = timeStr.split(":")
    let hour
    let min
    let sec

    if(t[0].length===2 && t[0][0]==='0'){
        hour = parseInt(t[0][1]) * 3600
    }else {
        hour = parseInt(t[0]) * 3600
    }

    if(t[1].length===2 && t[1][0]==='0'){
        min = parseInt(t[1][1]) * 60
    }else {
        min = parseInt(t[1]) * 60
    }
    
    if(t[2].length===2 && t[2][0]==='0'){
        sec = parseInt(t[2][1])
    }else {
        sec = parseInt(t[2])
    }

    return hour+min+sec
}

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

//#################################################################################################

app.get('/', (req, res) => {
    res.send('Server is created...')
})

//================================ API WATCH ==================================================

app.get('/watch', (req, res) => {
    let key = {
        who: req.headers.who,
        secretKey: req.headers.secret_key
    }
    if(hash(key) === hash({who: 'admin', secretKey: 'cyhggt'})) {
        Watch.find().then((data) => {
            res.send(data)
        }, (e) => {
            res.status(400).send(e)
        })
    }else {
        res.status(400).send('Permision denined!')
    }
})

app.get('/watch/:id', (req, res) => {
    let key = {
        id: req.params.id,
        who: req.headers.who,
        secretKey: req.headers.secret_key
    }
    let h = hash(key)
    Watch.find({
        key: h
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/watch/:id/:timestart/:timeend', (req, res) => {
    console.log('path')
    let timeStart = makeMulitime(req.params.timestart)
    let timeEnd = makeMulitime(req.params.timeend)
    console.log('start', timeStart)
    console.log('end', timeEnd)
    let key = {
        id: req.params.id,
        who: req.headers.who,
        secretKey: req.headers.secret_key
    }
    let h = hash(key)
    Watch.find({
        key: h,
        time: { $gte: timeStart, $lte: timeEnd },
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/watch/:id:/date/:timestart/:timeend', (req, res) => {
    console.log('path')
    let timeStart = makeMulitime(req.params.timestart)
    let timeEnd = makeMulitime(req.params.timeend)
    let date = req.params.date
    console.log('start', timeStart)
    console.log('end', timeEnd)
    let key = {
        id: req.params.id,
        who: req.headers.who,
        secretKey: req.headers.secret_key
    }
    let h = hash(key)
    Watch.find({
        date: date,
        key: h,
        time: { $gte: timeStart, $lte: timeEnd },
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

//================================ API CAR ==================================================

app.get('/car', (req, res) => {
    let key = {
        who: req.headers.who,
        secretKey: req.headers.secret_key
    }
    if(hash(key) === hash({who: 'admin', secretKey: 'cyhggt'})) {
        Car.find().then((data) => {
            res.send(data)
        }, (e) => {
            res.status(400).send(e)
        })
    }else {
        res.status(400).send('Permision denined!')
    }
})

app.get('/car/:id', (req, res) => {
    let key = {
        id: req.params.id,
        who: req.headers.who,
        secretKey: req.headers.secret_key
    }
    let h = hash(key)
    Car.find({
        key: h
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/car/:id/:timestart/:timeend', (req, res) => {
    let timeStart = makeMulitime(req.params.timestart)
    let timeEnd = makeMulitime(req.params.timeend)
    let key = {
        id: req.params.id,
        who: req.headers.who,
        secretKey: req.headers.secret_key
    }
    let h = hash(key)
    Car.find({
        key: h,
        time: { $gte: timeStart, $lte: timeEnd },
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/car/:id:/date/:timestart/:timeend', (req, res) => {
    let timeStart = makeMulitime(req.params.timestart)
    let timeEnd = makeMulitime(req.params.timeend)
    let date = req.params.date
    let key = {
        id: req.params.id,
        who: req.headers.who,
        secretKey: req.headers.secret_key
    }
    let h = hash(key)
    Car.find({
        date: date,
        key: h,
        time: { $gte: timeStart, $lte: timeEnd },
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.post('/post', (req, res) => {
    var countStatus = 0 // 1 = success, 0 = fail
    let t = makeMulitime(req.body.time)
    let postData = {
        id: req.body.id,
        date: req.body.date,
        time: t,
        lat: req.body.lat,
        lng: req.body.lng,
        temp: req.body.temp,
        hum: req.body.hum,
        watch: req.body.watch
    }
    
    let carData = postData
    carData.key = hash({
        id: postData.id,
        who: 'driver',
        secretKey: 'cyhggt'
    })
    let newCar = Car(carData)
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
        watchData.key = hash({
            id: watchData.id,
            who: 'parent',
            secretKey: 'cyhggt'
        })
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
    console.log('is listening on port ' + port)
})

