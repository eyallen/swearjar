var MongoClient = require('mongodb').MongoClient;

var DataStore = function Constructor(settings) {
    this.settings = settings || {};
    this.dbName = this.settings.dbName || "swear_jar";
    this.dbHost = this.settings.dbHost || process.env.DB_HOST;
    this.dbUser = this.settings.dbUser || process.env.DB_USER;
    this.dbPass = this.settings.dbPass || process.env.DB_PASS;

    this.wordCollection = this.settings.wordCollection || "bad_words";
    this.userCollection = this.settings.userCollection || "user_totals";
    this.channelCollection = this.settings.channelCollection || "channel_totals";
    this.eventsCollection = this.settings.eventsCollection || "events";

    this.connectionString =  "mongodb://" + this.dbUser + ":" + encodeURIComponent(this.dbPass) + "@" + this.dbHost + ":10255/?ssl=true&replicaSet=globaldb";
};

// TODO: This is dumb, I should really just pre-populate the word list
DataStore.prototype.updateWordList = function(word) {
    var dbName = this.dbName;
    var wordCollection = this.wordCollection;

    MongoClient.connect(this.connectionString, function(err,client) {
        if (err) return;

        var db = client.db(dbName);
        db.collection(wordCollection).updateOne(
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

DataStore.prototype.updateUserTotals = function(user, word) {
    
};

DataStore.prototype.updateChannelTotals = function(channel, word) {

};

DataStore.prototype.updateSwearEvents = function(user, channel, word) {
    var dbName = this.dbName;
    var wordCollection = this.wordCollection;
    var eventsCollection = this.eventsCollection;

    MongoClient.connect(this.connectionString, function(err,client) {
        if (err) return;

        var db = client.db(dbName);
        db.collection(wordCollection).findOne({ text: word }, function(err,wordDoc) {
            if (!err && wordDoc && wordDoc._id) {
                db.collection(eventsCollection).insertOne(
                    {
                        "time" : new Date().toISOString(),
                        "channel" : channel,
                        "user" : user,
                        "word" : wordDoc._id
                    }
                );
            }

            client.close();
        })
    });
};

module.exports = DataStore;