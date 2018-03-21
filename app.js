'use strict';

var logger = require('winston'),
    config = require('config.json')('./config.json'),
    mongoose = require('mongoose'),
    TelegramBot = require('node-telegram-bot-api'),
    express = require('express'),
    bodyParser = require('body-parser'),
    jsonParser = bodyParser.json(),
    listener = require('./src/listener'),
    path = require('path');


logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {'timestamp':true});


mongoose.Promise = global.Promise;
mongoose.connect(config.mongodb);
var db = mongoose.connection;
db.once('open', function() {
    logger.info('Connected to Mongodb on %s', config.mongodb);

    var app = express();
    app.use(jsonParser);
    app.listen(config.port, config.host, e => { console.log("Listening on ", config.port); });
    app.post("/", function(req, res)
    {
        for(var i in req.body)
        {
            var el = req.body[i];
            listener.emit(el.type, el.message);
        }
        res.status(200).send();
    });

    app.get("/", function(req,res)
    {
        res.sendFile(path.join(__dirname, "admin.html"));
    });
    app.get("/data.json", function(req,res)
    {
        var data = {};
        

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data))
    });

    var bot = require('./src/bot');

});
db.on('error', function() {
    logger.error("Error connecting to mongodb");
});