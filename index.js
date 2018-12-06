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
    var message = {
        flag: '{DOnt_hACk_mE_QQ}'
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(JSON.stringify(message));
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
        // db.ref("/38").once('value', function (snap) {
        //     allData = snap.val();
        //     console.log(allData);
        // })
    })
}

getData(allNum[index]);