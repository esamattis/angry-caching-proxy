
var optimist = require("optimist");
var xtend = require("xtend");

var config = {
    cacheDir: process.cwd() + "/angry-caching-proxy"
};

var args= optimist
    .usage("Start Argry Caching Proxy.\n\nUsage: $0")
    .alias("p", "port")
    .describe("p", "Port to listen")

    .alias("d", "cacheDir")
    .alias("d", "dir")
    .alias("h", "help")
    .describe("d", "Directory where to write cached files")
    .argv;

if (args.help) {
    optimist.showHelp();
    process.exit(0);
}

try {
    xtend(config, require("/etc/angry-caching-proxy/config.js"));
} catch(err) { }

module.exports = xtend(config, args);
