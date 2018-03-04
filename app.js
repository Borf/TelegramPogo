'use strict';

var logger = require('winston'),
    config = require('config.json')('./config.json'),
    mongoose = require('mongoose'),
    TelegramBot = require('node-telegram-bot-api'),
    express = require('express'),
    bodyParser = require('body-parser'),
    jsonParser = bodyParser.json(),
    listener = require('./src/listener');


logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {'timestamp':true});


mongoose.Promise = global.Promise;
mongoose.connect(config.mongodb);
var db = mongoose.connection;
db.once('open', function() {
    logger.info('Connected to Mongodb on %s', config.mongodb);

    var app = express();
    app.use(jsonParser);
    app.listen(config.port, e => { console.log("Listening on ", config.port); });
    app.post("/", function(req, res)
    {
        for(var i in req.body)
        {
            var el = req.body[i];
            listener.emit(el.type, el.message);
        }
        res.status(200).send();
    });

    var bot = require('./src/bot');

});
db.on('error', function() {
    logger.error("Error connecting to mongodb");
});