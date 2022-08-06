"use strict";
const cool = require('cool-ascii-faces');
const express = require('express');
const app = express();
var express_ws = require('express-ws')(app);
const port = process.env.PORT || 3000;
console.log('port:', port);
//app.get('/', (req, res) => { res.send({'hello':'world'}); });
var connections = {};
var gCount = 0;
var tmpConnection = [];
// tick: heartbeat
// id: user id
// key: key
// status: connected | disconnected
// msg: message
// connectionCnt: connection count
// error
app.use('/', express.static('./'));
app.get('/cool', (req, res) => res.send(cool()));
app.ws('/', (ws, request) => {
    ws._key = undefined;
    console.log('connected');
    ws.on('message', (msg) => {
        console.log(msg);
        if (msg.length == 0)
            return;
        try {
            let objMessage = JSON.parse(msg);
            if (!ws._key) {
                if (!!objMessage.key) {
                    ws._key = objMessage.key;
                    ws._id = gCount;
                    if (!connections[ws._key]) {
                        connections[ws._key] = [];
                    }
                    let name = objMessage.name;
                    ws._name = name;
                    connections[ws._key].push(ws);
                    let count = connections[ws._key].length;
                    for (let sock of connections[ws._key]) {
                        sock.send(JSON.stringify({ name, status: 'connected', connectionCnt: count }));
                    }
                    gCount = gCount + 1;
                }
            }
            else {
                if (!!objMessage.msg) {
                    for (let sock of connections[ws._key]) {
                        if (sock._id !== ws._id)
                            sock.send(JSON.stringify({ msg: objMessage.msg, name: objMessage.name }));
                    }
                }
                if (!!objMessage.tick) {
                    ws.send(JSON.stringify({ 'tick': 'ok' }));
                }
            }
        }
        catch (e) {
            console.log(e);
            for (let sock of connections[ws._key]) {
                if (sock._id === ws._id)
                    sock.send(JSON.stringify({ error: e + '\n' + msg }));
            }
        }
    });
    ws.on('close', (msg) => {
        console.log('socket closed');
        connections[ws._key] = connections[ws._key].filter((sock) => sock._id !== ws._id);
        let count = connections[ws._key].length;
        for (let sock of connections[ws._key]) {
            sock.send(JSON.stringify({ name: ws._name, status: 'disconnected', connectionCnt: count }));
        }
    });
});
app.listen(port, () => console.log(`Listening port is ${port}`));
