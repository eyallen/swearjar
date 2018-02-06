var SlackBot = require('slackbots');
var Profanity = require('profanity-util');
var DataStore = require("./datastore");

var settings = {
    token: process.env.BOT_API_KEY,
    name: "Swear Jar"
};

var bot = new SlackBot(settings);
var botStore = new DataStore();

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


_updateWordList = function(word) {
    botStore.updateWordList(word);
};

_updateEvents = function(user, channel, word) {
    botStore.updateSwearEvents(user, channel, word);
};

bot.on('start', function()
{
});

bot.on('message', function(data) {
    console.log(data);

    if (_isChatMessage(data) && _isChannelConversation(data)) {
        var naughty = _getNaughtyWords(data);
        if (naughty.length > 0) {
            for(var i = 0; i < naughty.length; i++) {
                _updateWordList(naughty[i]);
                _updateEvents(data.user, data.channel, naughty[i]);
            }
        }
    }
});