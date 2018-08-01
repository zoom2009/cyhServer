const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const hash = require('object-hash');
var http = require('http')
var express = require('express')

var socketio = require('socket.io')
var app = express()
var server = http.Server(app)
var port = process.env.PORT || 3000
var websocket = socketio(server);
server.listen(port, () => {
    console.log('is listening on port', port)
})
//export from another files
const {Car} = require('./model/carModel')
const {Watch} = require('./model/watchModel')
const {User} = require('./model/userModel')

//========================== Data Base ============================

mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGODB_URI ||'mongodb://localhost/cyhDB')
  .then(() =>  console.log('@@@ Connection db is succes @@@'))
  .catch((err) => console.error('!!! Fail to connect db !!!'));


//========================== Playground ============================
app.use(bodyParser.json())

websocket.on('connection', (socket) => {
    console.log('A client just joined on', socket.id);
    socket.emit('channel-name', 'Hello world!');

});

app.post('/testsocket', (req, res) => {
    websocket.emit('send message', req.body.data)
    res.send('posted')
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
    websocket.emit('carPost', postData)
    let carData = postData
    let newCar = new Car(carData)
    newCar.save().then((doc) => {
        countStatus++
        console.log('+++')
        //if(waitAsyAndRes200(countStatus, postData)) {
         //   websocket.emit('carPost', postData)
        //    res.send('is Saved')
        //}
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
               // if(waitAsyAndRes200(countStatus, postData)) {
                //    websocket.emit('carPost', postData)
                //    res.send('is Saved')
               // }
            }
        }, (e) => {
            countStatus = 0 
            res.status(400).send(e)
            return
        })
    }
    res.send('emited')
})

app.post('/alert/:mac_address', (req, res) => {
    websocket.emit('alert', req.params.mac_address)
    res.send('is sended alert to Parent and Driver!')
})

app.post('/finishtoschool/:mac_address', (req, res) => {
    websocket.emit('finish school', req.params.mac_address)
    res.send('is notice to parent <is arrive school>.')
})

app.post('/finishtohome/:mac_address', (req, res) => {
    websocket.emit('finish home', req.params.mac_address)
    res.send('is notice to parent <is arrive home>.')
})

app.post('/signup', (req, res) => {
    let newUser = new User({
        id: req.body.id,
        password: req.body.password,
        mac_address: req.body.mac_address,
        phone_number: req.body.phone_number,
        homeLocation: req.body.homeLocation,
        schoolLocation: req.body.schoolLocation,
    })
    newUser.save().then((doc) => {
        res.send(doc)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/user/:id/:password', (req, res) => {
    User.find({
        id: req.params.id,
        password: req.params.password
    }).then((doc) => {
        res.send(doc)
    }, (e) => {
        res.status(400).send(e)
    })
})

//==================================================================






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

app.get('/remove/:model', (req, res) => {
    switch(req.params.model) {
        case 'car':
            Car.remove().then((d) => {res.send(d)}, (e) => {res.status(400).send(e)})
            break
        case 'watch':
            Watch.remove().then((d) => {res.send(d)}, (e) => {res.status(400).send(e)})
            break
        case 'user':
            User.remove().then((d) => {res.send(d)}, (e) => {res.status(400).send(e)})
            break
    }
})

//================================ API WATCH ==================================================

app.get('/watch', (req, res) => {
    Watch.find().then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/watch/:id', (req, res) => {
    Watch.find({
        id: req.params.id
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/watch/:id/getlast', (req, res) => {
    Watch.find({
        id: req.params.id
    }).sort({
        time: 1
    }).then((data) => {
        res.send(data[data.length-1])
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
    Watch.find({
        id: req.params.id,
        time: { $gte: timeStart, $lte: timeEnd }
    }).sort({
        time: 1
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/watch/:id/:date', (req, res) => {
    let date = req.params.date
    var x = date.replace("_", "/")
    var y = x.replace("_", "/")
    Watch.find({
        date: y,
        id: req.params.id
    }).sort({
        time: 1
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})


app.get('/watch/:id/:date/:timestart/:timeend', (req, res) => {
    console.log('path')
    let timeStart = makeMulitime(req.params.timestart)
    let timeEnd = makeMulitime(req.params.timeend)
    let date = req.params.date
    var x = date.replace("_", "/")
    var y = x.replace("_", "/")
    console.log(y)
    console.log('start', timeStart)
    console.log('end', timeEnd)
    Watch.find({
        date: y,
        id: req.params.id,
        time: { $gte: timeStart, $lte: timeEnd },
    }).sort({
        time: 1
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

//================================ API CAR ==================================================

app.get('/car', (req, res) => {
    Car.find().then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/car/:id', (req, res) => {
    Car.find({
        id: req.params.id
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/car/:id/getlast', (req, res) => {
    Car.find({
        id: req.params.id
    }).sort({
        time: 1
    }).then((data) => {
        res.send(data[data.length-1])
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/car/:id/:timestart/:timeend', (req, res) => {
    let timeStart = makeMulitime(req.params.timestart)
    let timeEnd = makeMulitime(req.params.timeend)
    //db.user.find().sort( { UserId: -1 } ).limit(1)
    Car.find({
        id: req.params.id,
        time: { $gte: timeStart, $lte: timeEnd },
    }).sort({
        time: 1
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/car/:id/:date', (req, res) => {
    let date = req.params.date
    var x = date.replace("_", "/")
    var y = x.replace("_", "/")
    Car.find({
        date: y,
        id: req.params.id
    }).sort({
        time: 1
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/car/:id/:date/:timestart/:timeend', (req, res) => {
    let timeStart = makeMulitime(req.params.timestart)
    let timeEnd = makeMulitime(req.params.timeend)
    let date = req.params.date
    var x = date.replace("_", "/")
    var y = x.replace("_", "/")
    Car.find({
        date: y,
        id: req.params.id,
        time: { $gte: timeStart, $lte: timeEnd },
    }).sort({
        time: 1
    }).then((data) => {
        res.send(data)
    }, (e) => {
        res.status(400).send(e)
    })
})

cyhWatch_addr = [
    'E5:3B:2E:63:83:4B', // 0
    'F4:A7:65:7B:B7:62', // 1
    'E8:3D:77:74:F8:3F', // 2
    'D8:2A:9A:6F:5A:52', // 3
    'E3:5C:D4:AB:07:FC', // 4
    'D5:A4:C9:09:98:F7'  // 5
]


app.get('/watchincar/:id/:timestart/:timeend', (req, res) => {
    let timeStart = makeMulitime(req.params.timestart)
    let timeEnd = makeMulitime(req.params.timeend)

    function isHaveWatch(cyhWatch_addr, watch_addr) {
        for(let i=0;i<cyhWatch_addr.length;i++) {
            if(cyhWatch_addr[i] == watch_addr) {
                return i
            }
        }
        return -1
    }
    //db.user.find().sort( { UserId: -1 } ).limit(1)
    Car.find({
        id: req.params.id,
        time: { $gte: timeStart, $lte: timeEnd },
    }).sort({
        time: 1
    }).select('watch date time')
    .then((data) => {

        function GetPosIsHaveThisWatch(allAddr, addr) {
            for(let i=0;i<allAddr.length;i++) {
                if(allAddr[i] == addr) {
                    return i
                }
            }
            return -1
        }

        let Data = []

        for(let i=0;i<data.length;i++) {
            // all watch in 1record
            let _1record = []
            // default for watch in 1 record
            for(let i=0;i<cyhWatch_addr.length;i++) {
                _1record.push({mac_address: 'none', rssi: 'none'})
            }
            for(let j=0;j<data[i].watch.length;j++) {
                // _1watch
                if(GetPosIsHaveThisWatch(cyhWatch_addr, data[i].watch[j].mac_address) != -1) {
                    // make self to pos found
                    _1record[GetPosIsHaveThisWatch(cyhWatch_addr, data[i].watch[j].mac_address)] = data[i].watch[j]
                }
            } 
            Data.push(_1record)
            
        }

        res.send(Data)
    }, (e) => {
        res.status(400).send(e)
    })
})


//E5:3B:2E:63:83:4B
//F4:A7:65:7B:B7:62
//E8:3D:77:74:F8:3F
//D8:2A:9A:6F:5A:52
//E3:5C:D4:AB:07:FC
//D5:A4:C9:09:98:F7




    