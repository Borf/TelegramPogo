'use strict';

var logger = require('winston'),
    config = require('config.json')('./config.json'),
    mongoose = require('mongoose'),
    TelegramBot = require('node-telegram-bot-api');


logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {'timestamp':true});


mongoose.Promise = global.Promise;
mongoose.connect(config.mongodb);
var db = mongoose.connection;
db.once('open', function() {
    logger.info('Connected to Mongodb on %s', config.mongodb);

    var bot = require('./src/bot');

});
db.on('error', function() {
    logger.error("Error connecting to mongodb");
});