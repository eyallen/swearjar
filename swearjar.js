var SlackBot = require('slackbots');
var Profanity = require('profanity-util');

var settings = {
    token: process.env.BOT_API_KEY,
    name: "Swear Jar"
};

var bot = new SlackBot(settings);

// TODO: Move these to a prototype or something
_isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

_isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
};

_getNaughtyWords = function(message) {
    return Profanity.check(message.text);
};

bot.on('start', function()
{
    bot.postMessageToChannel("swearjartest", "its on");
});

bot.on('message', function(data) {
    console.log(data);

    if (_isChatMessage(data) && _isChannelConversation(data))
    {
        var naughty = _getNaughtyWords(data);
        if (naughty.length > 0) {
            console.log("naughty naughty: " + naughty);
        }
    }
});