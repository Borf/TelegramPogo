'use strict';

var mongoose = require('mongoose'),
    Pokedex = require('./pokedex'),
    config = require('config.json')('./config.json'),
	_ = require('lodash'),
    Schema = mongoose.Schema;

var UserSchema = new Schema({
    telegramId: String,
    active: {
        type: Boolean,
        default: true
    },
    watchlist: {
        type: [Number], // Collection of pokedex numbers
        default: []
    },
    raidwatchlist: {
        type: [Schema.Types.Mixed],
        default: []
    },
    state: {
        type: [Schema.Types.String],
        default: ""
    }
});

UserSchema.plugin(require('mongoose-findorcreate'));


UserSchema.methods.addRaidFilter = function(filter)
{
	this.raidwatchlist.push(filter);
	this.save();
}

UserSchema.methods.testRaidFilter = function(raid)
{
	var positive = false;
	var negative = false;
	
	_.forEach(this.raidwatchlist, function(filter)
	{
		if(filter.type == 'level')
		{
			if(raid.level == filter.level)
			{
				positive |= filter.positive;
				negative |= !filter.positive;
			}
		}
		else if(filter.type == 'pokemon')
			if(raid.pokemon_id == filter.pokemon_id)
			{
				positive |= filter.positive;
				negative |= !filter.positive;
			}
	});
	return positive && !negative;
}



module.exports = mongoose.model('User', UserSchema);