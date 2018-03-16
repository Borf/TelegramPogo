var events = require('events'),
    pokedex = require('./pokedex'),
    logger = require('winston'),
    User = require('./user'),
    bot = require('./bot'),
    moment = require('moment'),
    _ = require('lodash'),
    fs = require('fs'),
    moves = JSON.parse(fs.readFileSync('./db/moves.json'));


var queue = new events.EventEmitter();

var encounters = {};
var raids = {};
var gyms = {};

function fix(id)
{
    var newId = id>>>8;
    //console.log("Id " + id + "turns into " + newId);
    return newId;
}

queue.on('pokemon', function(payload)
{
    var encounter_id = fix(payload.encounter_id);

    if(encounters[encounter_id])
    {
        logger.info("Got double encounter for " + encounter_id);
        return;
    }
    encounters[encounter_id] = payload;
    encounters[encounter_id].timeout = setTimeout(function(encounter_id)
    {
        return function()
        {
            if(encounters[encounter_id])
            {
                handleEncounter(encounters[encounter_id]);
                encounters[encounter_id].timeout = null;
            }
            else
            logger.error("error getting encounter")
        }        
    }(encounter_id), 90000);
});


queue.on('iv', function(payload)
{
    iv = Math.round(((payload.individual_attack+payload.individual_stamina+payload.individual_defense) / 45) * 100);

    var encounter_id = fix(payload.encounter_id);

    if(encounters[encounter_id])
    {
        if(encounters[encounter_id].timeout || encounters[encounter_id].individual_attack == null)
        {
            if(encounters[encounter_id].timeout != null)
            {
                clearTimeout(encounters[encounter_id].timeout);
                encounters[encounter_id].timeout = null;
            }
            else
                console.log("I'm late for a " + pokedex.pokedex[payload.pokemon_id].name + ", IV match too late, so people might get a double message");
            encounters[encounter_id].individual_attack = payload.individual_attack;
            encounters[encounter_id].individual_defense = payload.individual_defense;
            encounters[encounter_id].individual_stamina = payload.individual_stamina;
            encounters[encounter_id].cp = payload.cp;
            handleEncounter(encounters[encounter_id]);
        }
    }
    else
    {
        //logger.info("Unknown encounter "+encounter_id+" ("+pokedex.pokedex[payload.pokemon_id].name+") for IV scan: " + iv + "% IV");
        encounters[encounter_id] = payload;
        handleEncounter(payload);
    }
});

queue.on('raid', function(payload)
{
    var gym = payload.gym_id;
    if(gyms[payload.gym_id] && gyms[payload.gym_id].details)
        gym = gyms[payload.gym_id].details.name;
        
    logger.info("Pokemon " + pokedex.pokedex[payload.pokemon_id].name + " is having a raid party at " + gym);
    logger.info("Ends in " + Math.round((payload.end - (Date.now()/1000))/60) + " minutes");
    logger.info("Starts in " + Math.round((payload.start - (Date.now()/1000))/60) + " minutes");
    if(raids[payload.spawn])
    {
        logger.info("Duplicate raid, ignoring");
        return;
    }

    User.find({ active: true })
        .then(function(users) {
            users = users.filter(function(user) { return user.testRaidFilter(payload); });

            var userIds = users.map(function(user) {
                return user.telegramId;
            });

            if (userIds.length) {
                bot.sendNotification(
                    userIds,
                    'A ' + pokedex.pokedex[payload.pokemon_id].namep + ' raid is starting at ' + gym + '\n' +
                    "Starts in " + Math.round((payload.start - (Date.now()/1000))/60) + " minutes, " +
                    "Ends in " + Math.round((payload.end - (Date.now()/1000))/60) + " minutes\n" +
                    "Disappears at " + disappearTime(payload.end) + "\n" +
                    "Moves: " + moves[payload.move_1].name + ", " + moves[payload.move_2].name,
                    [payload.latitude, payload.longitude]
                );
            }
        });
});


queue.on('egg', function(payload)
{
    logger.info("Got egg: ", payload);

});


queue.on('gym', function(payload) {
    if(gyms[payload.gym_id] && gyms[payload.gym_id].details)
        payload.details = gyms[payload.gym_id].details;

    if(gyms[payload.gym_id])
    {
        var oldTeam = gyms[payload.gym_id].team_id;
        var newTeam = payload.team_id;
        if(oldTeam != newTeam)
        {
            var gymName = payload.gym_id;
            if(gyms[payload.gym_id] && gyms[payload.gym_id].details && gyms[payload.gym_id].details.name)
                gymName = gyms[payload.gym_id].details.name;
            console.log("Gym " + gymName + " changed from " + oldTeam + " to " + newTeam);
            gyms[payload.gym_id] = payload;
            queue.emit('gymchange', { 'data' : payload, 'old' : oldTeam, 'new' : newTeam });
        }
    }
    gyms[payload.gym_id] = payload;
});


queue.on('gym_details', function(payload) {
    console.log("Details");
    if(gyms[payload.id] != undefined && gyms[payload.id].details)
    {
        var oldPlayers = gyms[payload.id].details.pokemon.slice();
        var newPlayers = payload.pokemon.slice();
        
        if(oldPlayers.length > 0 || newPlayers.length > 0)
        {
            for(var i = 0; i < newPlayers.length; i++)
            {
                   for(var ii = 0; ii < oldPlayers.length; ii++)
                {
                    if(newPlayers[i].trainer_name == oldPlayers[ii].trainer_name &&
                        Math.abs(newPlayers[i].deployment_time - oldPlayers[ii].deployment_time) < 5)
                    {
                        newPlayers.splice(i, 1);
                        oldPlayers.splice(ii, 1);
                        i--;
                        ii--;
                        break;
                    }
                }
            }
               for(var ii = 0; ii < oldPlayers.length; ii++)
            {
                for(var i = 0; i < newPlayers.length; i++)
                {
                    if(newPlayers[i].trainer_name == oldPlayers[ii].trainer_name &&
                        Math.abs(newPlayers[i].deployment_time - oldPlayers[ii].deployment_time) < 5)
                    {
                        newPlayers.splice(i, 1);
                        oldPlayers.splice(ii, 1);
                        i--;
                        ii--;
                        break;
                    }
                }
            }
            
            if(newPlayers.length != 0 || oldPlayers.length != 0)
            {
                logger.info("Pokemon changed for gym " + payload.name);
                for(var i = 0; i < oldPlayers.length; i++)
                    queue.emit('gymkick', { gym : gyms[payload.id], player : oldPlayers[i] });
                for(var i = 0; i < newPlayers.length; i++)
                    queue.emit('gymadd', { gym : gyms[payload.id], player : newPlayers[i] });
            }
        }
    }
    if(gyms[payload.id] == undefined)
        gyms[payload.id] = {};
       gyms[payload.id].details = payload;
});



queue.on('gymadd', function(data)
{
    logger.info("Player " + data.player.trainer_name + " put a " + pokedex.pokedex[data.player.pokemon_id].name + " in the gym " + data.gym.details.name + "(" + data.player.deployment_time + ")");
    console.log("Player " + data.player.trainer_name + " put a " + pokedex.pokedex[data.player.pokemon_id].name + " in the gym " + data.gym.details.name + "(" + data.player.deployment_time + ")");
//		logger.info("IV: " + Math.round((data.player.iv_defense + data.player.iv_stamina + data.player.iv_attack) / .45) + ", CP: " + data.player.cp);

    User.find({ active: true })
        .then(function(users) {
            users = users.filter(function(user) { return user.settings.ivname.toLowerCase() == data.player.trainer_name.toLowerCase() && user.ivwatch.indexOf(data.player.pokemon_uid) == -1; });
            _.forEach(users, u =>
            {
                u.ivwatch.push(data.player.pokemon_uid);
                u.save();
            });

            var userIds = users.map(function(user) {
                return user.telegramId;
            });

            if (userIds.length) {
                bot.sendSimpleNotification(
                    userIds,
                    'Pokemon ' + pokedex.pokedex[data.player.pokemon_id].name + '(' + data.player.cp + ") has an IV of " + Math.round((data.player.iv_defense + data.player.iv_stamina + data.player.iv_attack) / .45) + '%\n' +
                    "Attack: " + data.player.iv_attack + ", Defense: " + data.player.iv_defense + ", Stamina: " + data.player.iv_stamina
                );
            }
            
            
        });
});



queue.on("broadcast", function(data)
{
    console.log("Broadcast: " + data);

    User.find({ active: true })
        .then(function(users) {
            var userIds = users.map(function(user) {
                return user.telegramId;
            });

            if (userIds.length) {
                bot.sendSimpleNotification(
                    userIds,
                    data
                );
            }
            
            
        });
    
});


queue.on("error", function(data)
{
    console.log("Error happened");
    console.log(data);
});



function handleEncounter(encounter)
{
    iv = 0;
    if(!encounter)
    {
        console.log("oops");
        return;
    }
    if(encounter.individual_attack)
        iv = Math.round(((encounter.individual_attack+encounter.individual_stamina+encounter.individual_defense) / 45) * 100);

    //console.log(fix(encounter.encounter_id) + " Pokemon " + pokedex.pokedex[encounter.pokemon_id].name, "appeared (IV " + iv + "%, CP " + encounter.cp + ")");


    var sentUsers = [];
    
    User.find({ active: true, watchlist: { "$elemMatch" : { 'id' : encounter.pokemon_id } } } )
    .then(function(users) {
        var userIds = users.filter(function(user) {
            if(iv == 0)
                return user.watchlist.find(p => p.id == encounter.pokemon_id && (p.iv == 0 || p.showunknowniv)) !== undefined;
            return user.watchlist.find(p => p.id == encounter.pokemon_id && p.iv <= iv) !== undefined;
        }).map(function(user) {
            return user.telegramId;
        });
        sentUsers.concat(userIds);
        if (userIds.length) {
            bot.sendNotification(
                userIds,
                'A wild ' + pokedex.pokedex[encounter.pokemon_id].name + ' appeared!\n' +
                timeToDisappear(encounter.disappear_time) + ' left, ' +
                (iv > 0 ? ("IV: " + iv + "%, CP: " + encounter.cp + "\n") : "") + 
                'disappears at ' + disappearTime(encounter.disappear_time) + '\n',
                [encounter.latitude, encounter.longitude]
            );
        }
    }).then(function()
    {
        User.find({ active: true, 'settings.miniv': { $lte : iv } } )
        .then(function(users) {
            var userIds = users.map(function(user) {
                return user.telegramId;
            }).filter(function(user) {
                return sentUsers.indexOf(user) == -1;
            });;
            sentUsers.concat(userIds);
            if (userIds.length) {
                bot.sendNotification(
                    userIds,
                    'A wild ' + pokedex.pokedex[encounter.pokemon_id].name + ' appeared!\n' +
                    timeToDisappear(encounter.disappear_time) + ' left, ' +
                    (iv > 0 ? ("IV: " + iv + "%, CP: " + encounter.cp + "\n") : "") + 
                    'disappears at ' + disappearTime(encounter.disappear_time) + '\n',
                    [encounter.latitude, encounter.longitude]
                );
            }
        });
    });
}


//cleanup
setInterval(function()
{
    var count = Object.keys(encounters).length;
    var time = moment().unix();
    encounters = _.pickBy(encounters, function(encounter) {
        if(encounter)
            return encounter.disappear_time > moment().unix();
        return false;
    });
//    console.log('Cleared ' + (count - Object.keys(encounters).length) +' seen and expired pokemon');
}, 60 * 1000);



function timeToDisappear(timestamp) {
    var diff = moment.unix(timestamp).diff(moment());
    return moment.duration(diff).humanize();
}

function disappearTime(timestamp) {
    return moment.unix(timestamp).format('HH:mm:ss');
}

function getMap(lat, lon, cb) {
    return request({
        method: 'GET',
           uri: 'https://maps.googleapis.com/maps/api/staticmap',
           qs: {
               center: lat + ',' + lon,
               zoom: 16,
               size: '1080x1080',
               key: config.gmap_key,
               markers: lat + ',' + lon
           },
           callback: cb
    });
};

module.exports = queue;