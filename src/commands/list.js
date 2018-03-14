'use strict';

var pokedex = require('../pokedex'),
    logger = require('winston'),
    util = require('util'),
    buildkeyboard = require('../buildkeyboard');

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
        user.state = "list";
        user.save();
        return { msg: "What would you like to list?", keyboard: buildkeyboard([ "Pokemon", "Raids" ]) };
    },


    handler: function(msg, user)
    {
        if(user.state == "list")
        {
            user.state = "";
            user.save();
            if(msg.toLowerCase() == "pokemon")
            {
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
            else if(msg.toLowerCase() == "raids")
            {
                var msg = '';
                for(var i = 0; i < user.raidwatchlist.length; i++)
                {
                    var txt = user.raidwatchlist[i].positive ? 'Showing ' : 'Ignoring ';

                    if(user.raidwatchlist[i].type == 'level')
                        txt += 'all level ' + user.raidwatchlist[i].level + ' raids';
                    else if(user.raidwatchlist[i].type == 'pokemon')
                        txt += 'all ' + pokedex.pokedex[user.raidwatchlist[i].pokemon].name + ' raids';

                    msg += "\n" + txt;
                }
                return "your raid filters: " + msg;
            }
        }
    }

};