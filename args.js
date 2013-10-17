
var optimist = require("optimist");

var args= optimist
    .usage("Start Argry Caching Proxy.\n\nUsage: $0")
    .alias("p", "port")
    .describe("p", "Port to listen")

    .alias("d", "directory")
    .alias("d", "dir")
    .alias("h", "help")
    .describe("d", "Directory where to write cached files")
    .argv;

if (args.help) {
    optimist.showHelp();
    process.exit(0);
}

args.directory = args.directory || process.cwd() + "/acp-cache";

module.exports = args;
