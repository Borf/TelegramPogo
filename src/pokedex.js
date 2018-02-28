'use strict';

/**
 * Pokedex module
 * @module pokedex
 */

var fs = require('fs'),
    _ = require('lodash'),
    logger = require('winston'),
    util = require('util'),
    pokedex = JSON.parse(fs.readFileSync(__dirname + '/../db/pokemon.json'));


for(var id in pokedex)
{
    pokedex[id].id = parseInt(id);
}


/** Dictionary of known Pokémon */
exports.pokedex = pokedex;

/**
 * Returns the Pokédex number for the given Pokémon
 * @param {String} name - Name of the Pokémon
 * @returns {Number|undefined} Pokédex number for the Pokémon
 */
exports.getPokemonIdByName = function(name) {
    return _.findKey(pokedex, function(p) {
        return p.toLowerCase() === name.toLowerCase();
    });
};

exports.getPokemonIdByFuzzyName = function(name) {
    return _.filter(pokedex, function(p) {
        return p.name.toLowerCase().indexOf(name.toLowerCase()) != -1;
    });
};


// Receives an array and returns the pokedex numbers of the given pokemen
// If a given pokemon name doesn't exist, it is ignored.
exports.getPokemonIdsByNames = function(names) {
    return names.map(function(name) {
        return exports.getPokemonIdByName(name);
    }).filter(function(p) {
        return p !== undefined;
    }).map(function(p) {
        return Number(p);
    });
};

exports.getPokemonIdsFromArgumentString = function (str) {
    var args = str.split(/[\s,]/).filter(function(value) {
        return value !== '';
    });

    var ids = [];

    args.map(function(pokemon) {
        if (!isNaN(Number(pokemon))) {
            // Pokedex number passed
            ids.push(Number(pokemon));
        } else {
            // Pokémon name passed
            var id = Number(exports.getPokemonIdByName(pokemon));
            if (id !== NaN) ids.push(id);
        }
    });

    return ids;
};


exports.fuzzyFindPokemonIdsFromArgumentString = function (str) {
    var args = str.split(/[\s,]/).filter(function(value) {
        return value !== '';
    });

    var ids = [];

    args.map(function(pokemon) {
        if (!isNaN(Number(pokemon))) {
            // Pokedex number passed
            ids.push(Number(pokemon));
        } else {
            // Pokémon name passed
            var newIds = exports.getPokemonIdByFuzzyName(pokemon);
            ids = ids.concat(newIds);
        }
    });

    return ids;
};