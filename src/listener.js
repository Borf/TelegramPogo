var events = require('events'),
    pokedex = require('./pokedex'),
    logger = require('winston'),
    User = require('./user'),
    bot = require('./bot'),
    moment = require('moment');


var queue = new events.EventEmitter();

var encounters = {};
var raids = {};
var gyms = {};


function fix(id)
{
    return id>>>8;
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
            handleEncounter(encounters[encounter_id]);
            encounters[encounter_id].timeout = null;
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
                console.log("I'm late!");
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
        
    logger.info("Pokemon " + pokemon[payload.pokemon_id] + " is having a raid party at " + gym);
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
                    'A ' + pokemon[payload.pokemon_id] + ' raid is starting at ' + gym + '\n' +
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


queue.on('gym_details', function(payload)
{
    if(!gyms[payload.id])
        gyms[payload.id] = {};
    gyms[payload.id].details = payload;
});

queue.on('gym', function(payload)
{
    var details;
    if (gyms[payload.gym_id] && gyms[payload.gym_id].details)
        details = gyms[payload.gym_id].details;
    gyms[payload.gym_id] = payload;
    if(details)
        gyms[payload.gym_id].details = details;
});

function handleEncounter(encounter)
{
    iv = 0;
    if(!encounter)
        console.log("oops");
    if(encounter.individual_attack)
        iv = Math.round(((encounter.individual_attack+encounter.individual_stamina+encounter.individual_defense) / 45) * 100);

    console.log(fix(encounter.encounter_id) + " Pokemon " + pokedex.pokedex[encounter.pokemon_id].name, "appeared (IV " + iv + "%, CP " + encounter.cp + ")");


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
    encounters = _.filter(seen, function(encounter) {
        return encounter.disappear > moment().unix();
    });
    logger.debug('Cleared seen and expired pokemon');
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