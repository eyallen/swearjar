var SlackBot = require('slackbots');
var Profanity = require('profanity-util');
var DataStore = require("./datastore");
var Swearwords = require('./swearwords.json');

// TODO: We should respond to new channels and new users...
class SwearJar extends SlackBot {

    constructor(settings) {
        super(settings);

        this.settings = settings || {};
        this.settings.token = this.settings.token || process.env.BOT_API_KEY;
        this.settings.name = this.settings.name || "SwearJar";
        this.user = null;

        this.botStore = new DataStore();
    }

    run() {
        this.on('start', this._onStart);
        this.on('message', this._onMessage);
    }

    printStats(user, channel) {
        var that = this;

        var topWords = this.botStore.getTopSwearWords(5);
        var topWordsByChannel = this.botStore.getTopSwearWordsByChannel(channel, 5);
        var topWordsByUser = this.botStore.getTopSwearWordsByChannel(channel, 5);

        var values;
        Promise.all([topWords, topWordsByChannel, topWordsByUser]).then((result) => {
            values = result;
            return that.postMessage(channel, "Hey there potty mouths.\n");
        }).then(()=>{
            return that._printTopWords(channel, values[0]);
        }).then(()=>{
            return that._printTopWordsByChannel(channel, values[1]);
        }).then(()=>{
            return that._printTopWordsByUser(channel, values[2]);
        });
    }

    _printTopWords(channel, words) {
        if (!words.length) {
            return;
        }

        var that = this;
        return this.postMessage(channel, "The top swear words used here are:\n").then(()=> {
            var list = "\n";
            for (var i=0; i < words.length; i++) {
                list += (i+1) + ". " + words[i].text + "\n";
            }

            return that.postMessage(channel, list);
        });
    }

    _printTopWordsByChannel(channel, words) {
        if (!words.length) {
            return;
        }

        var that = this;
        return this.postMessage(channel, "The top swear words in this channel are:\n").then(()=> {
            var list = "\n";
            for (var i=0; i < words.length; i++) {
                list += (i+1) + ". " + words[i].text + "\n";
            }

            return that.postMessage(channel, list);
        });
    }

    _printTopWordsByUser(channel, words) {
        if (!words.length) {
            return;
        }

        var that = this;
        return this.postMessage(channel, "The top swear words by you are:\n").then(()=> {
            var list = "\n";
            for (var i=0; i < words.length; i++) {
                list += (i+1) + ". " + words[i].text + "\n";
            }

            return that.postMessage(channel, list);
        });
    }

    _isChatMessage(message) {
        return message.type === 'message' && Boolean(message.text);
    }

    _isChannelConversation(message) {
        return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
    }

    _isFromSwearJar(message) {
        return message.user === this.user.id ||
               (message.username && message.username.toLowerCase() == this.user.name.toLowerCase());
    }

    _isSwearJarMention(message) {
        return message.text.includes("@" + this.user.id);
    }

    _getNaughtyWords(message) {
        return Profanity.check(message.text);
    }

    _updateWordList(user, channel, word) {
        this.botStore.updateWordList(user, channel, word);
    }

    _updateEvents(user, channel, word) {
        this.botStore.updateSwearEvents(user, channel, word);
    }

    _loadBotUser() {
        var self = this;
        this.user = this.users.filter(function (user) {
            return user.name.toLowerCase() === self.name.toLowerCase();
        })[0];
    }

    _onStart() {
        var self = this;

        this._loadBotUser();
        this.botStore.populateWordList(Swearwords);
    }

    _onMessage(message) {
        console.log(message);

        if (!this._isChatMessage(message) ||
            !this._isChannelConversation(message))
        {
            return;
        }

        if (this._isSwearJarMention(message)) {
            this.printStats(message.user, message.channel);
        }

        if (!this._isFromSwearJar(message)) {
            var naughty = this._getNaughtyWords(message);
            if (naughty.length > 0) {
                for(var i = 0; i < naughty.length; i++) {
                    // TODO: If we were smart, we could totally just push a swear event and then react accordinly
                    // on the server. But yeah... I'm not doing that.
                    this._updateWordList(message.user, message.channel, naughty[i]);
                    this._updateEvents(message.user, message.channel, naughty[i]);
                }
            }
        }
    }
}

module.exports = SwearJar;