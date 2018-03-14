'use strict';

var pokedex = require('../pokedex'),
    logger = require('winston'),
    buildkeyboard = require('../buildkeyboard'),
    config   = require('config.json')('./config.json');

/**
 * Start command
 * @module command/start
 */
module.exports = {

    /** Command name */
    name: '/settings',

    /** Command regex pattern */
    pattern: /\/settings/i,

    /** Command's description to be listed in /help */
    description: '/settings - Change some settings',

    /** Is the command listed in Telegram's command list? */
    list: function(user) {
        return user.active === true;
    },

    /**
     * Callback to execute when a user executes the command.
     * @param {Object} msg - The Telegram message object.
     * @param {Array}  match - The regex match result.
     * @param {Object} user - The user's stored Mongoose model.
     * @param {Boolean} created - Was the user created as a result of the command call?
     */
    callback: function(msg, match, user, created) {
        var settings = '';
        settings += "\nShow all pokemon over " + user.settings.miniv + '% IV';
        settings += "\nYour charactername is '" + user.settings.ivname + "'";
        settings += "\nI've seen " + user.ivwatch.length + " of your pokemon";

        var keyboard = []
        keyboard.push("Change minimum IV that will get sent");
        keyboard.push("Change name for personal IV scanning");
        keyboard.push("Reset IV scanning pokemon");
        keyboard.push("Change location");
        keyboard.push("Cancel");
        
        user.state = 'settings';
        user.save();

        return { msg: 'Current settings: ' + settings, keyboard : buildkeyboard(keyboard) };
    },

    handler : function(msg, user)
    {
        if(user.state == "settings")
        {
            if(msg.toLowerCase() == "change name for personal iv scanning")
            {
                user.state = "settings ivname";
                user.save();
                return { msg : "Please type your player name. Your current name is " + user.settings.ivname, keyboard: null };
            }
            else if(msg.toLowerCase() == "reset iv scanning pokemon")
            {
                user.ivwatch = [];
                user.save();
                return "Resetted pokemon scanned";
            }
            else if(msg == "Change location")
            {

            }
            else if(msg.toLowerCase() == "cancel")
            {
                user.state = "";
                user.save();
                return "Ok";
            }
            else if(msg.toLowerCase() == "change minimum iv that will get sent")
            {
                user.state = "settings miniv";
                user.save();
                return { msg : "Please type the minimum IV you want to see (Currently " + user.settings.miniv + ")", keyboard: null };
            }
        }
        else if(user.state == "settings miniv")
        {
            user.settings.miniv = parseInt(msg);
            user.state = "";
            user.save();
            return "Setting changed to " + user.settings.miniv;
        }
        else if(user.state == "settings ivname")
        {
            user.settings.ivname = msg;
            user.state = "";
            user.save();
            return "Setting changed to " + user.settings.ivname;
        }
    }

};