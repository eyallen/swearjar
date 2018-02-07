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

    printStats(channel) {
        var stats = "Hey there potty mouths.\n";
        stats += "Most popuplar swear word: \n";
        stats += "Biggest potty mouth: \n";
        stats += "Channel with the worst language: \n";

        this.botStore.getTopSwearWords(5);

        this.postMessage(channel, stats);
    }

    _isChatMessage(message) {
        return message.type === 'message' && Boolean(message.text);
    }

    _isChannelConversation(message) {
        return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
    }

    _isFromSwearJar(message) {
        return message.user === this.user.id;
    }

    _isSwearJarMention(message) {
        return message.text.includes("@" + this.user.id);
    }

    _getNaughtyWords(message) {
        return Profanity.check(message.text);
    }

    _updateWordList(word) {
        this.botStore.updateWordList(word);
    }

    _updateEvents(user, channel, word) {
        this.botStore.updateSwearEvents(user, channel, word);
    }

    _updateUserTotals(user, word) {
        this.botStore.updateUserTotals(user, word);
    }

    _updateChannelTotals(channel, word) {
        this.botStore.updateChannelTotals(channel, word);
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

        // Pre-populate the word, user, and channel databases.
        this.getChannels().then(function(channels){
            self.botStore.populateChannelList(channels.channels);
        });

        this.getUsers().then(function(users){
            self.botStore.populateUserList(users.members);
        });

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
            this.printStats(message.channel);
        }

        if (!this._isFromSwearJar(message)) {

            var naughty = this._getNaughtyWords(message);
            if (naughty.length > 0) {
                for(var i = 0; i < naughty.length; i++) {
                    // TODO: If we were smart, we could totally just push a swear event and then react accordinly
                    // on the server. But yeah... I'm not doing that.
                    this._updateWordList(naughty[i]);
                    this._updateEvents(message.user, message.channel, naughty[i]);
                    this._updateUserTotals(message.user, naughty[i]);
                    this._updateChannelTotals(message.channel, naughty[i]);
                }
            }
        }
    }
}

module.exports = SwearJar;