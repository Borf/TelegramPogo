'use strict';

var pokedex = require('../pokedex'),
    logger = require('winston'),
    util = require('util');

/**
 * Stop command
 * @module command/stop
 */
module.exports = {

    /** Command name */
    name: '/list',

    /** Command regex pattern */
    pattern: /\/list/i,

    /** Command's description to be listed in /help */
    description: '/list - Shows your watched stuff',

    /** Is the command listed in Telegram's command list? */
    list: function(user) {
        return user.active;
    },

    /**
     * Callback to execute when a user executes the command.
     * @param {Object} msg - The Telegram message object.
     * @param {Array}  match - The regex match result.
     * @param {Object} user - The user's stored Mongoose model.
     * @param {Boolean} created - Was the user created as a result of the command call?
     */
    callback: function(msg, match, user, created) {
        var pokemon = "";
        user.watchlist.forEach(p =>
        {
            pokemon += pokedex.pokedex[p.id].name;
            if(p.iv > 0)
            {
                pokemon += ", only if IV > " + p.iv;
                if(p.showunknowniv)
                    pokemon += ", also show if no IV is known";
            }
            else   
                pokemon += ", no IV filter";
            pokemon += " (" + p.priority + ")\n";
        })
        return pokemon;
    }

};