var TelegramBot = require('node-telegram-bot-api'),
    User = require('./user'),
    logger = require('winston'),
    config = require('config.json')('./config.json'),
    glob = require( 'glob' ),
    path = require( 'path' );
  
var bot = new TelegramBot(config.api_token, {polling: true});
var commands = [];

glob.sync( './src/commands/*.js' ).forEach( function( file ) {
    var command = require( path.resolve( file ) );
    commands.push(command);
    logger.info("Loading " + command.name);
    bot.onText(command.pattern, function(msg, match)
    {
        logger.info("Got " + command.name);
        User.findOrCreate({ telegramId: msg.from.id }, function(err, user, created) {
            if (err) 
            {
                logger.error(err);
                return;
            }
            user.state = "";
            var replyMessage = command.callback(msg, match, user, created, bot);

            var keyboard = generateReplyKeyboard(user);
                            // Send the generated reply message and update reply keyboard
            if (replyMessage) {
                if((typeof replyMessage) == "string")
                {
                }
                else if(Array.isArray(replyMessage))
                {
                    for(var i = 0; i < replyMessage.length-1; i++)
                        bot.sendMessage(msg.from.id, replyMessage[i]);
                    replyMessage = replyMessage[replyMessage.length-1];
                }
                else if(replyMessage.img)
                {
                    logger.info(replyMessage.img);
                    bot.sendPhoto(msg.from.id,replyMessage.img, { 'caption' : replyMessage.msg });
                    replyMessage = '';
                }
                else if(replyMessage.msg)
                {
                    if(replyMessage.keyboard)
                        keyboard = replyMessage.keyboard;
                    replyMessage = replyMessage.msg;
                }
                else
                    config.logger.info("reply Type: " + typeof replyMessage);


                if(replyMessage != '')
                {
                    if(keyboard)
                        bot.sendMessage(msg.from.id, replyMessage, {
                            reply_markup: {
                                keyboard: keyboard 
                            }
                        });
                    else
                        bot.sendMessage(msg.from.id, replyMessage);
                }
            }
        });
    });

});


bot.on('message', function(msg)
{
    if(msg.text[0] == '/')
      return;
    User.findOrCreate({ telegramId: msg.from.id }, function(err, user, created) {
        if (err) 
        {
            logger.error(err);
            return;
        }
        commands.map((command) =>
        {
            if(!command.handler)
                return;
            var replyMessage = command.handler(msg.text, user);
            if(!replyMessage)
                return;

            var keyboard = generateReplyKeyboard(user);
                            // Send the generated reply message and update reply keyboard
            if (replyMessage) {
                if((typeof replyMessage) == "string")
                {
                }
                else if(Array.isArray(replyMessage))
                {
                    for(var i = 0; i < replyMessage.length-1; i++)
                        bot.sendMessage(msg.from.id, replyMessage[i]);
                    replyMessage = replyMessage[replyMessage.length-1];
                }
                else if(replyMessage.img)
                {
                    logger.info(replyMessage.img);
                    bot.sendPhoto(msg.from.id,replyMessage.img, { 'caption' : replyMessage.msg });
                    replyMessage = '';
                }
                else if(replyMessage.msg)
                {
                    if(typeof(replyMessage.keyboard) !== 'undefined')
                        keyboard = replyMessage.keyboard;
                    replyMessage = replyMessage.msg;
                }
                else
                    config.logger.info("reply Type: " + typeof replyMessage);


                if(replyMessage != '')
                {
                    if(keyboard)
                    {
                        if(keyboard == "keep")
                            keyboard = null;
                        bot.sendMessage(msg.from.id, replyMessage, {
                            reply_markup: {
                                keyboard: keyboard 
                            }
                        });
                    }
                    else
                        bot.sendMessage(msg.from.id, replyMessage, {
                            reply_markup: {
                                hide_keyboard: true
                            }
                        });
                }
            }
        });
    });
});




module.exports = 
{
    bot : bot,

    sendNotification : function(users, caption, coords) {
        var that = this;
        users.map(function(user) {
            that.bot.sendMessage(user, caption)
            .then(function() {
                return that.bot.sendLocation(user, coords[0], coords[1], {
                    disable_notification: true
                });
            });
        });
    }


};



function generateReplyKeyboard(user) {
    var enabledCommandNames = commands.filter(function(command) {
        // Get enabled commands
        if (typeof command.list === 'function') {
            return command.list(user);
        }
        else return !!command.list;
    }).map(function(command) {
        // Construct Telegram API KeyboardButton objects
        return [{ text: command.name } ];
    });

    for(var i = 0; i < enabledCommandNames.length-1; i++)
    {
        enabledCommandNames[i].push(enabledCommandNames[i+1][0]);
        enabledCommandNames.splice(i+1,1);
    }

    return enabledCommandNames;
}