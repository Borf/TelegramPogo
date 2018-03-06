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
            keyboard : buildkeyboard([ "Pokemon", "Raids", "Gyms", "Cancel"])
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
            } else if(user.state == "raids")
            {
                user.state = "watch raid";
                user.save();
                return { msg : 'What would you like to change?', keyboard:[ 'Show raids', 'Hide raids', 'Show pokemon', 'Hide Pokemon', 'Cancel' ]}
            }else  if(msg.toLowerCase() == "cancel")
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
            else if(!isNaN(parseInt(msg)))
                miniv = parseInt(msg);
            else if(msg == "No Filtering")
                miniv = 0;
            else
                return { msg : "Please enter IV filter", keyboard : "keep" };

            user.tmp.iv = miniv;
            user.markModified('tmp');

            if(miniv != 0)
            {
                user.state = "watch pokemon filter2";
                user.save();
                return { msg : "Would you like to see pokemon with a missing IV?", keyboard : buildkeyboard([ "yes", "no", 'cancel' ])};
            }
            user.state = "watch pokemon priority";
            user.save();
            return { msg : "What is the priority of this pokemon? . High priority pokemon will always be shown, low priority pokemon will only be shown if when you're active", keyboard : buildkeyboard([ "high", "low", 'cancel' ])};
        }
        else if(user.state == "watch pokemon filter2")
        {
            if(msg.toLowerCase() == 'yes')
                user.tmp.showunknowniv = true;
            else if(msg.toLowerCase() == 'no')
                user.tmp.showunknowniv = false;
            else
                return { msg : "Would you like to see pokemon with a missing IV?", keyboard : buildkeyboard([ "yes", "no", 'cancel' ])};

                user.markModified('tmp');
            user.state = "watch pokemon priority";
            user.save();
            return { msg : "What is the priority of this pokemon? . High priority pokemon will always be shown, low priority pokemon will only be shown if when you're active", keyboard : buildkeyboard([ "high", "low", 'cancel' ])};
        }
        else if(user.state == "watch pokemon priority")
        {
            if(msg == 'cancel')
            {
                user.state = '';
                user.save();
                return "ok";
            }
            if(msg != "high" && msg != "medium" && msg != "low")
                return { msg : "Priority please..." };
            if(user.tmp.iv > 0)
                user.addPokemonWatch(user.tmp.pokemon.id, user.tmp.iv, msg, user.tmp.showunknowniv);
            else
                user.addPokemonWatch(user.tmp.pokemon.id, user.tmp.iv, msg);

            user.state = "";
            user.save();
            return { msg : "Added pokemon " + user.tmp.pokemon.name};
        } else if (user.state == "watch raid")
        {
            if(msg.toLowerCase() == 'show raids')
            {
                user.state = "watch raid showlevel";
                user.save();
                return { txt: "What raid level would you like to see?", keyboard: [ "1", "2", "3", "4", "5" ] };
            } else if(msg.toLowerCase() == 'Hide raids')
            {
                user.state = "watch raid hidelevel";
                user.save();
                return { txt: "What raid level would you like to hide?", keyboard: [ "1", "2", "3", "4", "5" ] };
            } else if(msg.toLowerCase() == 'show pokemon')
            {
                user.state = "watch raid showpoke";
                user.save();
                return { txt: "What raid pokemon would you like to see?", keyboard: null };
            } else if(msg.toLowerCase() == 'Hide Pokemon')
            {
                user.state = "watch raid hidepoke";
                user.save();
                return { txt: "What raid pokemon would you like to hide?", keyboard: null };
            } else if(msg.toLowerCase() == 'Cancel')
            {
                user.state = '';
                user.save();
                return "ok";
            }
        } else if(user.state == "watch raid showlevel" || user.state == "watch raid hidelevel")
        {
            user.state = '';
            user.save();
            var level = parseInt(msg);
            if(!isNaN(level))
                addRaidFilter(
                    {
                        'type' : 'level',
                        'positive' : user.state == "watch raid showlevel",
                        'level' : parseInt(msg)
                    }
                )
            else
                return "Did not understand level";
            return "Raid filter added";
        }
        else if(user.state == "watch raid showpokemon" || user.state == "watch raid hidepokemon")
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
                addRaidFilter(
                    {
                        'type' : 'pokemon',
                        'positive' : user.state == "watch raid showpokemon",
                        'pokemon' : pokemon[0].id
                    });
    
                user.state = '';
                user.save();
                return 'Raid filter for pokemon ' + pokemon[0].name + ' added';
            }
            else
                return "wtf";
        }

        return null;
    }

};