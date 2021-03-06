const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const hash = require('object-hash');
var http = require('http')
var express = require('express')

var request = require('request');
var moment = require('moment');
require('moment/locale/th.js')

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
const {CarData} = require('./model/carDataModel')
const {CurrentWatch} = require('./model/currentWatch')

//========================== Data Base ============================

mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGODB_URI ||'mongodb://localhost/cyhDB')
  .then(() =>  console.log('@@@ Connection db is succes @@@'))
  .catch((err) => console.error('!!! Fail to connect db !!!'));


//========================== Playground ============================
app.use(bodyParser.json())

websocket.on('connection', (socket) => {
    console.log('A client just joined on', socket.id)

    socket.on('push_token', (obj) => {
        let token = obj.token
        let mac_address = obj.mac_address
        console.log('push token: ', token);
        User.find({mac_address}).then((user) => {
            for(let i=0;i<user[0].expoNotiToken.length;i++) {
                if(user[0].expoNotiToken[i] == token) {
                    console.log('Already have this token')
                    return
                }
            }
            user[0].expoNotiToken.push(token)
            user[0].save().then((doc) => {
                console.log('Is push token :', doc)
            }, (e) => {
                console.log('Can not save to db :', e)
            })
        })
    })

    socket.on('pop_token', (obj) => {
        let token = obj.token
        let mac_address = obj.mac_address
        console.log('pop token: ', token);

        User.find({mac_address}).then((user) => {
            let c = 0
            for(let i=0;i<user[0].expoNotiToken.length;i++) {
                if(user[0].expoNotiToken[i] != token) {
                    c++
                }
            }
            if(c==user[0].expoNotiToken.length) {
                console.log('not found this token')
                return
            }else {
                console.log('Is pop token :', token)
            }
            for(let i=0;i<user[0].expoNotiToken.length;i++) {
                if(user[0].expoNotiToken[i] == token) {
                    for(let j=i;j<user[0].expoNotiToken.length-1;j++) {
                        user[0].expoNotiToken[j] = user[0].expoNotiToken[j+1]
                    }
                    user[0].expoNotiToken.pop()
                    user[0].save()
                }
            }
        })
    })

});

app.get('/getbandincar/:tabain', (req, res) => {
    CarData.find({
        tabain: req.params.tabain
    }).select('watch').then((doc) => {
        res.send(doc[0])
    }, (err) => {
        res.status(400).send(err)
    })
})

app.get('/removecardata', (req, res) => {
    CarData.collection.drop().then(() => {
        res.send('droped CarData model')
    }, (err) => {
        res.status(400).send(err)
    })
})

app.post('/postcardata', (req, res) => {
    let newCarData = new CarData({
        watch: req.body.watch,
        tabain: req.body.tabain
    })

    newCarData.save().then((doc) => {
        res.send(doc)
    }, (err) => {
        res.status(400).send(err)
    })
})

function getCurrentTimeSec() {
    let today = new Date()
    let h = +today.getHours()
    let m = +today.getMinutes()
    let s = +today.getSeconds()
    let curTime =((h*60*60)+(m*60)+s)
    console.log('current Time sec is '+ curTime)
    return curTime
}
//do here 2018 ***
//get data
app.get('/get-all-user', (req, res) => {
    User.find().then((d) => {
        res.send(d)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/get-current-watch-all', (req, res) => {
    CurrentWatch.find().then((d) => {
        res.send(d)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/get-current-watch/:macAddr', (req, res) => {
    let overTime = 10*60
    let curTime = getCurrentTimeSec()
    CurrentWatch.findOne({mac_address: req.params.macAddr}).then((data) => {
        if(!data) return res.status(400).send('not found')
        let status
        if(curTime-data.time >= overTime) {
            console.log('is Timeout')
            status = false
        }else {
            console.log('still in time')
            status = true
        }
        res.send({data, lastTime: data.time, currentTime: curTime, status})
    }, (e) => {
        res.status(400).send(e)
    })
})

//Main
app.post('/post', (req, res) => {
    var countStatus = 0 // 1 = success, 0 = fail
    let t = makeMulitime(req.body.time)
    let postData = {
        id: req.body.id,
        date: req.body.date,
        time: getCurrentTimeSec(),
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
        if(postData.watch[i].name == 'MI Band 2') {   
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
            
            //find by macAddr if already have go update if not create new one
            CurrentWatch.findOne({mac_address: postData.watch[i].mac_address}).then(async(w) => {
                if(w) { // already have
                    //update
                    w.lat = postData.lat
                    w.lng = postData.lng
                    w.rssi = postData.watch[i].rssi
                    w.date = postData.date
                    w.time = postData.time
                    w.temp = postData.temp
                    let res = await w.save()
                    console.log('res update currentWatch is ', res)
                }else { // dont have
                    let newCurrentWatch = new CurrentWatch({
                        mac_address: postData.watch[i].mac_address,
                        lat: postData.lat,
                        lng: postData.lng,
                        temp: postData.temp,
                        rssi: postData.watch[i].rssi,
                        date: postData.date,
                        time: postData.time
                    })
                    let res = await newCurrentWatch.save()
                    console.log('res save new CurrentWatch is ', res)
                }
            }, (e) => {
                console.log('error find watch : ', e)
            })

            // let newWatch = new Watch(watchData)
            // newWatch.save().then((doc) => {
            //     countStatus++
            //     console.log('+++')
            //     if(i===postData.watch.length-1) {
            //     // if(waitAsyAndRes200(countStatus, postData)) {
            //         //    websocket.emit('carPost', postData)
            //         //    res.send('is Saved')
            //     // }
            //     }
            // }, (e) => {
            //     countStatus = 0 
            //     res.status(400).send(e)
            //     return
            // })
        }
    }
    res.send('emited')
})

app.post('/sendnotification/:mac_address/:event', (req, res) => {
    let id = req.params.id
    let event = req.params.event
    let postData = {}
    User.find({mac_address}).then((data) => {
        let expoTokens = []
        for(let i=0;i<data[0].expoNotiToken.length;i++) {
            expoTokens.push(data[0].expoNotiToken[i])
        }

        switch(event) {
            case 'alert' :
                console.log('alert')
                for(let i=0;i<expoTokens.length;i++) {
                    postData = {
                        to: expoTokens[i],
                        sound: 'default',
                        title: 'CYH Services',
                        body: 'ลูกของคุณกำลังติดอยู่ในรถ!'
                    }
                    console.log('i : ', i+1)
                    console.log('data: ', postData)
                    request.post(
                        'https://exp.host/--/api/v2/push/send',
                        { json: postData },
                        function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                console.log('res i : ', i+1)
                                console.log(body)
                            }else {
                                console.log('res i : ', i+1)
                                console.log(response.statusCode, body)
                            }
                        }
                    );
                }    
                break;

            case 'toschool' :
                console.log('toschool')
                for(let i=0;i<expoTokens.length;i++) {
                    postData = {
                        to: expoTokens[i],
                        sound: 'default',
                        title: 'CYH Services',
                        body: 'ลูกของคุณเดินทางถึงโรงเรียนแล้ว'
                    }
                    console.log('i : ', i+1)
                    console.log('data: ', postData)
                    request.post(
                        'https://exp.host/--/api/v2/push/send',
                        { json: postData },
                        function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                console.log('res i : ', i+1)
                                console.log(body)
                            }else {
                                console.log('res i : ', i+1)
                                console.log(response.statusCode, body)
                            }
                        }
                    );
                }    
                break;

            case 'tohome' :
                console.log('tohome')
                for(let i=0;i<expoTokens.length;i++) {
                    postData = {
                        to: expoTokens[i],
                        sound: 'default',
                        title: 'CYH Services',
                        body: 'ลูกของคุณเดินทางถึงบ้านแล้ว'
                    }
                    console.log('i : ', i+1)
                    console.log('data: ', postData)
                    request.post(
                        'https://exp.host/--/api/v2/push/send',
                        { json: postData },
                        function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                console.log('res i : ', i+1)
                                console.log(body)
                            }else {
                                console.log('res i : ', i+1)
                                console.log(response.statusCode, body)
                            }
                        }
                    );
                }    
                break;

        }
        res.send('done')
    })
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
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        password: req.body.password,
        mac_address: req.body.mac_address,
        phone_number: req.body.phone_number,
        homeLocation: req.body.homeLocation,
        schoolLocation: req.body.schoolLocation,
        picURL: req.body.picURL,
        carTabain: req.body.carTabain
        // 8.6396029,99.8905142
    })
    newUser.save().then((doc) => {
        res.send(doc)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/gettoken/:id', (req, res) => {
    User.find({
        id: req.params.id
    }).select('expoNotiToken').then((doc) => {
        res.send(doc)
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/user/:id/:password', (req, res) => {
    User.findOne({
        id: req.params.id,
        password: req.params.password
    }).then((doc) => {
        if(!doc) return res.status(400).json({succes: false, message: 'Username หรือ Password ไม่ถูกต้อง'})
        res.json({succes: true, result: doc, message: 'เข้าสู่ระบบสำเร็จ'})
    }, (e) => {
        res.status(400).json({succes: false, message: e})
    })
})

app.get('/dropusermodel', (req, res) => {
    User.collection.drop().then(() => {
        res.send('droped User model')
    }, (err) => {
        res.status(400).send(err)
    })
})

app.get('/userbyid/:id', (req, res) => {
    User.find({
        id : req.params.id
    }).then((doc) => {
        res.send(doc[0])
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

app.get('/getalluser-location-incar/:carid', (req, res) => {
    User.find({
        carTabain: req.params.carid
    }).select('homeLocation schoolLocation mac_address').then((doc) => {
        res.send(doc)
    }, (err) => {
        res.status(400).send(err)
    })
})

app.get('/remove/alltoken', (req, res) => {
    User.find().then((data) => {
        //console.log('data:', data)
        for(let i=0;i<data.length;i++) {
            for(let j=0;j<data[i].expoNotiToken.length;j++) {
                console.log('expo: ', data[i].expoNotiToken[j])
                data[i].expoNotiToken.pop()
                data[i].save()
            }
        }
        // console.log('after :', )
        
        res.send('done remove all token')
    }, (e) => {
        res.status(400).send(e)
    })
})

app.get('/removealluser', (req, res) => {
    User.remove().then((doc) => {
        res.send('is removed : '+ doc)
    }, (err) => {
        res.status(400).send(err)
    })
})

app.post('/remove/:model', (req, res) => {
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
            let _1w = {}
            // default for watch in 1 record
            for(let i=0;i<cyhWatch_addr.length;i++) {
                _1record.push('none')
            }
            for(let j=0;j<data[i].watch.length;j++) {
                // _1watch
                let pos = GetPosIsHaveThisWatch(cyhWatch_addr, data[i].watch[j].mac_address)
                if(pos != -1) {
                    // make self to pos found
                    _1record[pos] = data[i].watch[j].rssi
                }
            } 
            _1w.rssi1 = _1record[0]
            _1w.rssi2 = _1record[1]
            _1w.rssi3 = _1record[2]
            _1w.rssi4 = _1record[3]
            _1w.rssi5 = _1record[4]
            _1w.rssi6 = _1record[5]
            _1w.date = data[i].date
            _1w.timesec = data[i].time
            
            let hr = data[i].time/3600
            let mn = (data[i].time - (Math.trunc(data[i].time/3600)*3600)) / 60
            let sec = data[i].time % 60
            let h,m,s
            if(Math.trunc(hr)<10) {
                h = '0' + Math.trunc(hr)
            }else {
                h = Math.trunc(hr)
            }
            if(Math.trunc(mn)<10) {
                m = '0' + Math.trunc(mn)
            }else {
                m = Math.trunc(mn)
            }
            if(Math.trunc(sec)<10) {
                s = '0' + Math.trunc(sec)
            }else {
                s = Math.trunc(sec)
            }
            _1w.time = h + ':' + m + ':' + s
            Data.push(_1w)
            
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




    