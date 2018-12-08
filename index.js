var express = require('express');
var request = require("request");
var firebase = require("firebase");
// var bodyParser = require('body-parser');

// // Initialize Firebase
var config = {
    apiKey: "AIzaSyCyMNo467JnBOxSCZ-WXORjPIaO2Cw7d-g",
    authDomain: "mycar-de26f.firebaseapp.com",
    databaseURL: "https://mycar-de26f.firebaseio.com",
    projectId: "mycar-de26f",
    storageBucket: "mycar-de26f.appspot.com",
    messagingSenderId: "827361069264"
};
firebase.initializeApp(config);
var db = firebase.database();

var app = express();

// app.use(bodyParser.json({limit: '1mb'}));
// app.use(bodyParser.urlencoded({
//     extended: true
// }));

var server = app.listen(process.env.PORT || 3000, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});

app.get('/', function (req, res) {
    checkRate(res);
});

app.get('/:id', function (req, res) {
    checkRate(res, req.params.id);
});

app.get('/:id/:uid', function (req, res) {
    checkRate(res, req.params.id, req.params.uid);
});

var allNum = [38, 39, 40, 41, 42, 43, 44, 45, 67, 68, 69, 70, 71, 72, 73];
var index = 0;

function getData(tid) {
    if (index == allNum.length) {
        console.log("done");
        index = 0;
        setTimeout(() => {
            console.log("restart");
            getData(allNum[index]);
        }, 60 * 1000);
        return;
    }
    request({
        url: `https://www.25353.com/api/plan?id=${tid}`,
        method: "GET"
    }, function (error, response, body) {
        if (error || !body) {
            console.log("發生錯誤");
            console.log(error);
            getData(allNum[++index]);
            return;
        }
        // console.log(JSON.parse(body));
        var data = JSON.parse(body);
        if (data.status == 1) {
            for (let val of data.data) {
                if (val.d != null) {
                    // console.log(val);
                    db.ref(`/${allNum[index]}/${val.c}`).update(val)
                        .then(function () {
                            // console.log("update data");
                        })
                        .catch(function () {
                            // console.log("some error");
                        });
                }
            }
        }
        getData(allNum[++index]);
    })
}

getData(allNum[index]);

// limit 為限制比數
// uid 為期數限制，可用來統計指定天數之收益
function checkRate(res, limit = 0, uid = 0) {
    var allData, final = {};
    var total = 0,
        benefit = {
            "1": 49,
            "2": 53,
            "3": 61,
            "4": 76,
            "5": 111,
            "6": 185,
            "lose": 3825
        };
    db.ref().once('value', function (snap) {
        allData = snap.val();
        // console.log(allData);
        for (let key in allData) {
            let tmp = [],
                gg = 0,
                earn = 0;
            final[key] = {};
            for (let inner_key in allData[key]) {
                if (uid > 0) {
                    if (inner_key >= uid) {
                        tmp.push(allData[key][inner_key]);
                    }
                } else {
                    tmp.push(allData[key][inner_key]);
                }
            }
            // 確保順序由小至大
            tmp.sort(function (a, b) {
                return a.c > b.c ? 1 : -1;
            });
            if (limit > 0) {
                tmp.splice(0, tmp.length - limit);
            }
            for (let i = 0; i < tmp.length; i++) {
                if (tmp[i].f == true) {
                    if (gg == 0) {
                        // 正常情況
                        if (!final[key][tmp[i].e]) {
                            final[key][tmp[i].e] = 1;
                        } else {
                            final[key][tmp[i].e]++;
                        }
                        earn += benefit[tmp[i].e];
                        total += benefit[tmp[i].e];
                    } else {
                        if (!final[key][tmp[i].e + 3 * gg]) {
                            final[key][tmp[i].e + 3 * gg] = 1;
                        } else {
                            final[key][tmp[i].e + 3 * gg]++;
                        }
                        if ((tmp[i].e + 3 * gg) > 6) {
                            earn -= benefit.lose;
                            total -= benefit.lose;
                        } else {
                            earn += benefit[tmp[i].e + 3 * gg];
                            total += benefit[tmp[i].e + 3 * gg];
                        }
                        gg = 0;
                    }
                } else if (tmp[i].f == false) {
                    gg++;
                }
            }
            final[key].earn = earn;
        }
        // console.log(final);
        final.benefit = total;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(JSON.stringify(final));
    })
}

// checkRate();