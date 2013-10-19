var optimist = require("optimist");
var xtend = require("xtend");

var config = {
    cacheDir: process.cwd() + "/angry-caching-proxy",
    customTriggers: "/etc/angry-caching-proxy/triggers.js",
    port: 8080,
    triggers: [
        "apt-get",
        "npm",
        "rubygems"
    ]
};

try {
    config = xtend(config, require("/etc/angry-caching-proxy/config.json"));
} catch(err) { }

var args = optimist
    .usage("Start Argry Caching Proxy.\n\nUsage: $0")

    .alias("p", "port")
    .describe("p", "Port to listen")

    .alias("d", "directory")
    .alias("directory", "cacheDir")
    .describe("d", "Directory where to write cached files")

    .alias("t", "triggers")
    .describe("t", "Triggers to activate. Can be defined multiple times.")

    .alias("h", "help")
    .argv;

if (args.help) {
    optimist.showHelp();
    process.exit(0);
}

if (args.triggers) args.triggers = [].concat(args.triggers);
config = xtend(config, args);

var triggersObject = require("./buildin-triggers");
try {
    triggersObject = xtend(triggersObject, require(config.customTriggers));
} catch(err) { }

config.triggerFns = config.triggers.filter(function(triggerName) {
    return config.triggers.indexOf(triggerName) !== -1;
}).map(function(triggerName) {
    return triggersObject[triggerName];
}).filter(function(h) {
    return typeof(h) === "function";
});

console.log("CONFIG:", config);
module.exports = config;
