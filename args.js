
var optimist = require("optimist");

var args= optimist
    .usage("Start Argry Caching Proxy.\n\nUsage: $0")
    .alias("p", "port")
    .describe("p", "Port to listen")

    .alias("d", "directory")
    .alias("h", "help")
    .describe("d", "Directory where to write cached files")
    .argv;

if (args.help) {
    optimist.showHelp();
    process.exit(0);
}


module.exports = args;
