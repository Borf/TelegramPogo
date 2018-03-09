'use strict';

var pokedex = require('../pokedex'),
    logger = require('winston'),
    config   = require('config.json')('./config.json'),
    buildkeyboard = require('../buildkeyboard');

/**
 * Start command
 * @module command/start
 */
module.exports = {

    /** Command name */
    name: '/start',

    /** Command regex pattern */
    pattern: /\/start/i,

    /** Command's description to be listed in /help */
    description: '/start - Start the bot',

    /** Is the command listed in Telegram's command list? */
    list: function(user) {
        return user.active === false;
    },

    /**
     * Callback to execute when a user executes the command.
     * @param {Object} msg - The Telegram message object.
     * @param {Array}  match - The regex match result.
     * @param {Object} user - The user's stored Mongoose model.
     * @param {Boolean} created - Was the user created as a result of the command call?
     */
    callback: function(msg, match, user, created) {
        if (created) {
            logger.info('Created new user with id %s', user.telegramId);
            // New users start with the default watchlist
            user.watchlist = [];
            user.state = 'tutorial1';
            user.save();
        } else {
            user.active = true;
            user.save();
        }

        logger.info('User %s is now active', user.telegramId);

        if(user.state == 'tutorial1')
            return { msg : "Welcome to the telegram bot. What is your pokemon go playername? By entering your pokemon go player name, you get notifications for your pokemon to check their IVs. If you don't want to enter your username, just type 'cancel' without the quotes.", keyboard:null }

        return 'Bot activated! Type /stop to stop.';
    },

    handler: function(msg, user)
    {
        if(user.state == "tutorial1")
        {
            user.state = "tutorial2";
            user.settings.ivname = msg;
            user.save();
            return { msg : "Awesome, would you like to get notifications about 100% IV pokemon?", keyboard: buildkeyboard(["yes", "no"])};
        }
        else if(user.state == "tutorial2")
        {
            user.state = "";
            user.miniv = msg.toLowerCase() == "yes" ? 100 : 101;
            user.save();
            return "You're ready to go. Use the /watch command to start watching for pokemon or raids, the /list to see the current filters and the /remove to remove things from your filters. For any help, send a message to @Borfy";
        }
    }
    

};