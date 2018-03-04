'use strict';

var pokedex = require('../pokedex'),
    logger = require('winston'),
    buildkeyboard = require('../buildkeyboard'),
    util = require('util');

/**
 * Stop command
 * @module command/remove
 */
module.exports = {

    /** Command name */
    name: '/remove',

    /** Command regex pattern */
    pattern: /\/remove/i,

    /** Command's description to be listed in /help */
    description: '/remove - Removes something from watchlist',

    /** Is the command listed in Telegram's command list? */
    list: function(user) {
        return user.active && (user.watchlist.length > 0 || user.raidwatchlist.length > 0);
    },

    /**
     * Callback to execute when a user executes the command.
     * @param {Object} msg - The Telegram message object.
     * @param {Array}  match - The regex match result.
     * @param {Object} user - The user's stored Mongoose model.
     * @param {Boolean} created - Was the user created as a result of the command call?
     */
    callback: function(msg, match, user, created) {
        user.state = "remove";
        user.save();
        return { 
            msg : 'What would you like to remove?',
            keyboard : buildkeyboard([ "Pokemon", "Raids", "Cancel"])
        };
    },


    handler : function(msg, user)
    {
        if(user.state == "remove")
        {
            if(msg.toLowerCase() == "pokemon")
            {
                user.state = "remove pokemon";
                user.save();
                return { msg : 'Please type the name of the pokemon', keyboard: buildkeyboard(user.watchlist.map(w => pokedex.pokedex[w.id].name)) }
            } else  if(msg.toLowerCase() == "cancel")
            {
                user.state = "";
                user.save();
                return { msg : 'Ok' }
            }
            else
                return "I don't understand";
        } else if(user.state == "remove pokemon")
        {
            var ids = pokedex.getPokemonIdByName(msg);
            if(ids.length != 1)
                ids = pokedex.getPokemonIdByFuzzyName(msg);
            if(ids.length != 1)
                return { msg : "Unknown pokemon name", keyboard:null };
            user.removePokemonWatch(ids[0].id);
            user.state = "";
            user.save();
            return "Removed " + msg;
        }
    }

};