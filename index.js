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

// getData(allNum[index]);

function checkRate(res) {
    var allData, final = {};
    db.ref().once('value', function (snap) {
        allData = snap.val();
        // console.log(allData);
        for (let key in allData) {
            let tmp = [],
                gg = 0;
            final[key] = {};
            for (let inner_key in allData[key]) {
                tmp.push(allData[key][inner_key]);
            }
            // 確保順序由小至大
            tmp.sort(function (a, b) {
                return a.c > b.c ? 1 : -1;
            });
            for (let i = 0; i < tmp.length; i++) {
                if (tmp[i].f == true) {
                    if (gg == 0) {
                        // 正常情況
                        if (!final[key][tmp[i].e]) {
                            final[key][tmp[i].e] = 1;
                        } else {
                            final[key][tmp[i].e]++;
                        }
                    } else {
                        if (!final[key][tmp[i].e + 3 * gg]) {
                            final[key][tmp[i].e + 3 * gg] = 1;
                        } else {
                            final[key][tmp[i].e + 3 * gg]++;
                        }
                        gg = 0;
                    }
                } else if (tmp[i].f == false) {
                    gg++;
                }
            }

        }
        // console.log(final);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(JSON.stringify(final));
    })
}

// checkRate();