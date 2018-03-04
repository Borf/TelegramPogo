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


        var keyboard = []
        keyboard.push("Change minimum IV that will get sent");
        keyboard.push("Change name for IV personal IV scanning");
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
            if(msg == "Change name for IV personal IV scanning")
            {

            }
            else if(msg == "Change location")
            {

            }
            else if(msg == "Cancel")
            {
                user.state = "";
                user.save();
                return "Ok";
            }
            else if(msg == "Change minimum IV that will get sent")
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
    }

};