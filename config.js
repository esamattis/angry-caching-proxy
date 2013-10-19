var optimist = require("optimist");
var xtend = require("xtend");

var config = {
    directory: process.cwd() + "/angry-caching-proxy",
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

    .describe("port", "Port to listen")
    .alias("p", "port")

    .describe("directory", "Directory where to write cached files")
    .alias("directory", "d")

    .describe("triggers", "Triggers to activate. Can be defined multiple times.")
    .alias("t", "triggers")

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
