'use strict';

var pokedex = require('../pokedex'),
    logger = require('winston'),
    config   = require('config.json')('./config.json');

/**
 * Start command
 * @module command/watch
 */
module.exports = {

    /** Command name */
    name: '/watch',

    /** Command regex pattern */
    pattern: /\/watch/i,

    /** Command's description to be listed in /help */
    description: '/watch - watch for events',

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
    callback: function(msg, match, user, created, bot) {
        user.state = "watch";
        user.save();
        return { 
            msg : 'What would you like to watch?',
            keyboard : [ [ { "text" : "Pokemon" }, { "text" : "Raids" } ],
                         [ { "text" : "My IVs" }, { "text" : "Cancel" } ] ]
        };
    },


    handler : function(msg, user)
    {
        if(user.state == "watch")
        {
            if(msg.toLowerCase() == "pokemon")
            {
                user.state = "watch pokemon";
                user.save();
                return { msg : 'Please type the name of the pokemon', keyboard: null }
            } else  if(msg.toLowerCase() == "cancel")
            {
                user.state = "";
                user.save();
                return { msg : 'Ok' }
            }
            else
                return { 
                    msg : 'What would you like to watch?',
                    keyboard : [ [ { "text" : "Pokemon" }, { "text" : "Raids" } ],
                                [ { "text" : "High IV" }, { "text" : "My IVs" } ],
                                [ { "text" : "Gyms" }, { "text" : "Cancel" } ] ]
                };  
        }

        return null;
    }

};