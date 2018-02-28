module.exports = function(data)
{
    var keyboard = data.map(e => [{text:e}]);
    for(var i = 0; i < keyboard.length-1; i++)
    {
        keyboard[i].push(keyboard[i+1][0]);
        keyboard.splice(i+1,1);
    }
    return keyboard;
}