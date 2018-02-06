var SlackBot = require('slackbots');
var Profanity = require('profanity-util');
var DataStore = require("./datastore");
var Swearwords = require('./swearwords.json');

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

_updateUserTotals = function(user, word) {
    botStore.updateUserTotals(user, word);
};

_updateChannelTotals = function(channel, word) {
    botStore.updateChannelTotals(channel, word);
};

bot.on('start', function() {
    // Pre-populate the word, user, and channel databases.
    this.getChannels().then(function(channels){
        botStore.populateChannelList(channels.channels);
    });

    this.getUsers().then(function(users){
        botStore.populateUserList(users.members);
    });

    botStore.populateWordList(Swearwords);
});

bot.on('message', function(data) {
    console.log(data);

    if (_isChatMessage(data) && _isChannelConversation(data)) {
        var naughty = _getNaughtyWords(data);
        if (naughty.length > 0) {
            for(var i = 0; i < naughty.length; i++) {
                // TODO: If we were smart, we could totally just push a swear event and then react accordinly
                // on the server. But yeah... I'm not doing that.
                _updateWordList(naughty[i]);
                _updateEvents(data.user, data.channel, naughty[i]);
                _updateUserTotals(data.user, naughty[i]);
                _updateChannelTotals(data.channel, naughty[i]);
            }
        }
    }
});