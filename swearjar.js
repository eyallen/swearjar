var SlackBot = require('slackbots');
var Profanity = require('profanity-util');
var MongoClient = require('mongodb').MongoClient;

var settings = {
    token: process.env.BOT_API_KEY,
    name: "Swear Jar"
};

// TODO: As with everything else, organize
var dbHost = process.env.DB_HOST;
var dbUser = process.env.DB_USER;
var dbPass = process.env.DB_PASS;
var dbConnection = "mongodb://" + dbUser + ":" + encodeURIComponent(dbPass) + "@" + dbHost + ":10255/?ssl=true&replicaSet=globaldb";
 
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

// TODO: This is dumb, I should really just pre-populate the word list
_updateWordList = function(word) {
    MongoClient.connect(dbConnection, function(err,client) {
        if (err) return;

        var db = client.db("swear_jar");
        db.collection("bad_words").updateOne(
            { text: word },
            {
                $inc: { count: 1},
                $setOnInsert: { text: word, count: 1 }
            },
            {upsert: true }
        );

        client.close();
    });
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
            }
        }
    }
});