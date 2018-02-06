var SwearJar = require('./swearjar');

var settings = {
    token: process.env.BOT_API_KEY,
    name: "SwearJar"
};

var swearJar = new SwearJar(settings);
swearJar.run();