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

app.get('/fail', function (req, res) {
    checkFail(res);
});

app.get('/:id', function (req, res) {
    checkRate(res, req.params.id);
});

app.get('/:id/:startUid', function (req, res) {
    checkRate(res, req.params.id, req.params.startUid);
});

app.get('/:id/:startUid/:endUid', function (req, res) {
    checkRate(res, req.params.id, req.params.startUid, req.params.endUid);
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
// startUid 為期數限制，可用來統計指定天數之收益(startAt)
// endUid 為期數限制，可用來統計指定天數之收益(endAt)
function checkRate(res, limit = 0, startUid = 0, endUid = 0) {
    var allData, final = {},
        lastId = 0,
        firstId = 9999999,
        perLose = 0;
    var total = 0,
        fail_nums = 0,
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
            // 第幾場第一次倒
            var firstFail = 0;
            final[key] = {};
            for (let inner_key in allData[key]) {
                if (startUid > 0 && endUid > 0) {
                    if (inner_key >= startUid && inner_key <= endUid) {
                        tmp.push(allData[key][inner_key]);
                    }
                } else if (startUid > 0 && endUid == 0) {
                    if (inner_key >= startUid) {
                        tmp.push(allData[key][inner_key]);
                    }
                } else if (startUid == 0 && endUid > 0) {
                    if (inner_key <= endUid) {
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
                // 計算最小/最大期號
                if (tmp[i].c > lastId) {
                    lastId = tmp[i].c;
                }
                if (tmp[i].c < firstId) {
                    firstId = tmp[i].c;
                }
                if (tmp[i].f == true) {
                    if (gg == 0) {
                        // 正常情況
                        if (!final[key][tmp[i].e]) {
                            final[key][tmp[i].e] = 1;
                        } else {
                            final[key][tmp[i].e]++;
                        }
                        // earn: 該組收益
                        // total: 所有組收益
                        earn += benefit[tmp[i].e];
                        total += benefit[tmp[i].e];
                    } else {
                        if (!final[key][tmp[i].e + 3 * gg]) {
                            final[key][tmp[i].e + 3 * gg] = 1;
                        } else {
                            final[key][tmp[i].e + 3 * gg]++;
                        }
                        if ((tmp[i].e + 3 * gg) > 6) {
                            if (firstFail == 0) {
                                firstFail = i + 1;
                            }
                            let tmpNum = tmp[i].e + 3 * gg;
                            do {
                                earn -= benefit.lose;
                                total -= benefit.lose;
                                tmpNum -= 6;
                                if (tmpNum <= 6) {
                                    // 實務上 6 關倒就放棄
                                    earn += benefit[tmpNum];
                                    total += benefit[tmpNum];
                                    break;
                                }
                            } while (tmpNum > 0);
                            // 總失敗次數
                            fail_nums++;
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
            final[key].firstFail = firstFail;
            if (earn < 0) {
                // 單組之虧損數量
                perLose++;
            }
        }
        // console.log(final);
        final.benefit = total;
        final.fail_nums = fail_nums;
        final.all_nums = lastId - firstId + 1;
        final.total_fail_rate = fail_nums / (final.all_nums * 15); // 遇到6收以上之機率
        final.per_rate = 1 - (perLose / 15); // 選擇某組下到底 能正收之機率
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(JSON.stringify(final));
    })
}

// 跨組連倒情況
// ex: 123 false
// find any => 126 false
function checkFail(res) {
    var allData, final = {},
        rate = 0,
        count = 0;
    db.ref().once('value', function (snap) {
        allData = snap.val();
        // console.log(allData);
        for (let key in allData) {
            let tmp = [];
            for (let inner_key in allData[key]) {
                tmp.push(allData[key][inner_key]);
            }
            // 確保順序由小至大
            tmp.sort(function (a, b) {
                return a.c > b.c ? 1 : -1;
            });
            for (let i = 0; i < tmp.length; i++) {
                if (tmp[i].f == false) {
                    // 倒3場，搜尋其他組是否造成連倒
                    for (let test_key in allData) {
                        if (test_key == key) {
                            // 同一個組
                            continue;
                        }
                        let test_tmp = [];
                        for (let inner_test_key in allData[test_key]) {
                            test_tmp.push(allData[test_key][inner_test_key]);
                        }
                        for (let j = 0; j < test_tmp.length; j++) {
                            if (test_tmp[j].f == false && test_tmp[j].c == parseInt(tmp[i].c) + 3) {
                                // 發生跨組連倒
                                // console.log(tmp[i].c, test_tmp[j].c);
                                if (!final[key]) {
                                    final[key] = {};
                                }
                                if (!final[key][tmp[i].c]) {
                                    final[key][tmp[i].c] = {};
                                    final[key][tmp[i].c].fail = 1;
                                } else {
                                    final[key][tmp[i].c].fail++;
                                }
                            }
                        }
                    }
                }
            }
        }
        // 跨組連倒的機率
        for (let key in final) {
            let per_rate = 0,
                per_count = 0;
            for (let inner_key in final[key]) {
                per_rate += final[key][inner_key].fail / 15;
                per_count++;
            }
            rate += per_rate / per_count;
            count++;
        }
        final = {};
        if (rate != 0) {
            final.rate = rate / count;
        }
        // console.log(final);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(JSON.stringify(final));
    })
}


// checkRate();