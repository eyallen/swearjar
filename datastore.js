var MongoClient = require('mongodb').MongoClient;

class DataStore {
    
    constructor(settings) {
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
    }

    getTopSwearWords(count) {
        var dbName = this.dbName;
        var wordCollection = this.wordCollection;

        return MongoClient.connect(this.connectionString).then((client) => {
            var db = client.db(dbName);
            return db.collection(wordCollection).find({count: {$gt: 0}}).sort({ count: -1}).limit(count).toArray()
        });
    }

    getTopSwearWordsByChannel(channel, count) {
        var dbName = this.dbName;
        var channelCollection = this.channelCollection;

        return MongoClient.connect(this.connectionString).then((client) => {
            var db = client.db(dbName);
            return db.collection(channelCollection).find({channel: channel}).project({word_counts: 1}).toArray();
        }).then((result) => {

        });
    }

    populateUserList(users) {
        var dbName = this.dbName;
        var userCollection = this.userCollection;

        MongoClient.connect(this.connectionString, function(err,client) {
            if (err) return;

            var db = client.db(dbName);
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                if (!user || !user.id) continue;

                db.collection(userCollection).updateOne(
                    { user: user.id },
                    {
                        $setOnInsert: { user: user.id, word_counts: {} }
                    },
                    { upsert: true }
                );
            }

            client.close();
        });
    }

    populateWordList(words) {
        var dbName = this.dbName;
        var wordCollection = this.wordCollection;

        MongoClient.connect(this.connectionString, function(err,client) {
            if (err) return;

            var db = client.db(dbName);
            for (var i = 0; i < words.length; i++) {
                var word = words[i];
                if (!word) continue;

                db.collection(wordCollection).updateOne(
                    { text: word },
                    {
                        $setOnInsert: { text: word, count: 0 }
                    },
                    { upsert: true }
                );
            }

            client.close();
        });
    }

    populateChannelList(channels) {
        var dbName = this.dbName;
        var channelCollection = this.channelCollection;

        MongoClient.connect(this.connectionString, function(err,client) {
            if (err) return;

            var db = client.db(dbName);
            for (var i = 0; i < channels.length; i++) {
                var channel = channels[i];
                if (!channel || !channel.id) continue;

                db.collection(channelCollection).updateOne(
                    { channel: channel.id },
                    {
                        $setOnInsert: { channel: channel.id,  word_counts: {} }
                    },
                    { upsert: true }
                );
            }

            client.close();
        });
    }

    updateWordList(word) {
        var dbName = this.dbName;
        var wordCollection = this.wordCollection;

        MongoClient.connect(this.connectionString, function(err,client) {
            if (err) return;

            var db = client.db(dbName);
            db.collection(wordCollection).updateOne(
                { text: word },
                {
                    $inc: { count: 1},
                    $setOnInsert: { text: word, count: 1, channel_count: {}, user_count: {} }
                },
                { upsert: true }
            );

            client.close();
        });
    }

    updateUserTotals(user, word) {
        var dbName = this.dbName;
        var wordCollection = this.wordCollection;
        var userCollection = this.userCollection;

        MongoClient.connect(this.connectionString, function(err,client) {
            if (err) return;

            var db = client.db(dbName);
            db.collection(wordCollection).findOne({ text: word }, function(err, wordDoc) {
                if (!err && wordDoc && wordDoc._id) {
                    var wordCountProp = "word_counts." + wordDoc._id;
                    
                    var update = {};
                    update[wordCountProp] = 1;

                    db.collection(userCollection).updateOne(
                        {
                            user: user
                        },
                        {
                            $inc: update,
                        }
                    );
                }

                client.close();
            })
        });
    }

    updateChannelTotals(channel, word) {
        var dbName = this.dbName;
        var wordCollection = this.wordCollection;
        var channelCollection = this.channelCollection;

        MongoClient.connect(this.connectionString, function(err,client) {
            if (err) return;

            var db = client.db(dbName);
            db.collection(wordCollection).findOne({ text: word }, function(err, wordDoc) {
                if (!err && wordDoc && wordDoc._id) {
                    var wordCountProp = "word_counts." + wordDoc._id;
                    
                    var update = {};
                    update[wordCountProp] = 1;

                    db.collection(channelCollection).updateOne(
                        {
                            channel: channel
                        },
                        {
                            $inc: update,
                        }
                    );
                }

                client.close();
            })
        });
    }

    updateSwearEvents(user, channel, word) {
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
            });
        });
    }
}

module.exports = DataStore;