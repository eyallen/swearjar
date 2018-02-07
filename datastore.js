var MongoClient = require('mongodb').MongoClient;

class DataStore {
    
    constructor(settings) {
        this.settings = settings || {};
        this.dbName = this.settings.dbName || "swear_jar";
        this.dbHost = this.settings.dbHost || process.env.DB_HOST;
        this.dbUser = this.settings.dbUser || process.env.DB_USER;
        this.dbPass = this.settings.dbPass || process.env.DB_PASS;

        this.wordCollection = this.settings.wordCollection || "bad_words";
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
        var wordCollection = this.wordCollection;

        return MongoClient.connect(this.connectionString).then((client) => {
            var db = client.db(dbName);
            
            var query = {};
            query["channel_count." + channel] = { $gt: 0 }

            var sort = {};
            sort["channel_count." + channel] = -1;

            return db.collection(wordCollection).find(query).sort(sort).limit(count).toArray();
        });
    }

    getTopSwearWordsByUser(user, count) {
        var dbName = this.dbName;
        var wordCollection = this.wordCollection;

        return MongoClient.connect(this.connectionString).then((client) => {
            var db = client.db(dbName);
            
            var query = {};
            query["user_count." + user] = { $gt: 0 }

            var sort = {};
            sort["user_count." + user] = -1;

            return db.collection(wordCollection).find(query).sort(sort).limit(count).toArray();
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
                        $setOnInsert: { text: word, count: 0, channel_count: {}, user_count: {} }
                    },
                    { upsert: true }
                );
            }

            client.close();
        });
    }

    updateWordList(user, channel, word) {
        var dbName = this.dbName;
        var wordCollection = this.wordCollection;

        MongoClient.connect(this.connectionString, function(err,client) {
            if (err) return;

            var db = client.db(dbName);

            var update = { count: 1 };
            update["user_count." + user] = 1;
            update["channel_count." + channel] = 1;

            db.collection(wordCollection).updateOne(
                { text: word },
                {
                    $inc: update
                }
            );

            client.close();
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