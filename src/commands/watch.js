'use strict';

var pokedex = require('../pokedex'),
    logger = require('winston'),
    config   = require('config.json')('./config.json'),
    buildkeyboard = require('../buildkeyboard');

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
            keyboard : buildkeyboard([ "Pokemon", "Raids", "High IV", "My IVs", "Gyms", "Cancel"])
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
                return "I don't understand";
        } else if(user.state == "watch pokemon")
        {
            var pokemon = pokedex.getPokemonIdByName(msg);
            if(pokemon.length != 1)
                pokemon = pokedex.getPokemonIdByFuzzyName(msg);
            if(pokemon.length > 20)
                return { msg : 'Too many pokemon found: ' + pokemon.length + ' found', keyboard: null };
            else if(pokemon.length > 1)
                return { msg : 'Please select a pokemon:', keyboard : buildkeyboard(pokemon.map(p => p.name)) };           
            else if(pokemon.length == 1)
            {
                user.tmp.pokemon = pokemon[0];
                user.markModified('tmp');
                user.state = 'watch pokemon filter';
                user.save();
                return { msg : 'Do you want IV filtering?', keyboard: buildkeyboard([">80", ">90", ">95", "100", "No Filtering"])}
            }
            else
                return "wtf";
        }
        else if(user.state == "watch pokemon filter")
        {
            var miniv = 0;
            if(msg[0] == ">")
                miniv = parseInt(msg.substring(1));
            else if(msg == "100")
                miniv = 100;
            else if(msg == "No Filtering")
                miniv = 0;
            else
                return { msg : "Please enter IV filter", keyboard : "keep" };

            user.tmp.iv = miniv;
            user.markModified('tmp');
            user.state = "watch pokemon priority";
            user.save();
            return { msg : "What is the priority of this pokemon? You can use this tag for filtering later on", keyboard : buildkeyboard([ "high", "medium", "low" ])};
        }
        else if(user.state == "watch pokemon priority")
        {
            if(msg != "high" && msg != "medium" && msg != "low")
                return { msg : "Priority please..." };
            user.addPokemonWatch(user.tmp.pokemon.id, user.tmp.iv, msg);
            user.state = "";
            user.save();
            return { msg : "Added pokemon " + user.tmp.pokemon.name};
        }

        return null;
    }

};