var cluster = require("cluster");
var config = require("./config");


if (cluster.isMaster) {
    console.log("CONFIG", config);
    for (var i = 0; i < config.workers; i++) {
        cluster.fork();
    }
    cluster.on("exit", function(worker, code, signal) {
        console.log("worker " + worker.process.pid + " died");
    });
} else {
    require("./index");
}
