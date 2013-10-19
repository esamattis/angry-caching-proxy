
var express = require("express");
var fs = require("graceful-fs");
var path = require("path");
var Q = require("q");
Q.longStackSupport = true;
var http = require("http");
var xtend = require("xtend");
var config = require("./config");
var filesize = require("filesize");

var writeFile = Q.denodeify(fs.writeFile);
var readFile = Q.denodeify(fs.readFile);
var readdir = Q.denodeify(fs.readdir);
var unlink = Q.denodeify(fs.unlink);
var stat = Q.denodeify(fs.stat);


var app = express();

app.set("view engine", "hbs");
app.set("views", __dirname + "/views");

app.use(require("./proxy")(config.triggerFns, config.directory));

app.get("/", function(req, res, next) {

    readdir(config.directory).then(function(files) {
        var readPromises = files.filter(function(filePath) {
            return (/\.json$/).test(filePath);
        }).map(function(metaDataFile) {
            var metaDataFilePath = path.join(config.directory, metaDataFile);
            var fileName = metaDataFile.replace(/\.json$/, "");

            var meta = readFile(metaDataFilePath).then(function(data) {
                return JSON.parse(data.toString());
            });

            return Q.all([meta, stat(metaDataFilePath.replace(/\.json$/, ""))])
                .spread(function(metaData, fileStat) {
                    return xtend(metaData, fileStat, {
                        sha1: fileName
                    });
                });
        });

        return Q.allSettled(readPromises).then(function(all) {
            return all.filter(function(meta) {
                if (meta.state === "fulfilled") {
                    return true;
                } else {
                    console.error("Failed to read", meta);
                    return false;
                }
            }).map(function(meta) {
                return meta.value;
            });
        });
    }).then(function(files) {
        var total = files.reduce(function(memo, file) {
            return memo + file.size;
        }, 0);

        res.render("index", {
            cacheDir: config.directory,
            files: files,
            total: filesize(total)
        });
    }, next);


});

app.get("/client.js", function(req, res) {
    res.sendfile(__dirname + "/client.js");
});

app.get("/req/:sha1", function(req, res, next) {
    var filePath = path.join(config.directory, req.params.sha1);
    res.sendfile(filePath);
});

app.delete("/req/:sha1", function(req, res, next) {
    var filePath = path.join(config.directory, req.params.sha1);

    console.log("Deleting", filePath);
    Q.all([unlink(filePath), unlink(filePath + ".json")]).then(function() {
        res.json({ deleted: filePath });
    }, next);

});

app.post("/deleteall", function(req, res, next) {
    readdir(config.directory).then(function(files) {
        return Q.all(files.map(function(filePath) {
            return unlink(path.join(config.directory, filePath));
        }));
    }).then(function() {
        res.redirect("/");
    }, next);
});



var server = http.createServer(app);
server.listen(Number(config.port) || 8000, function() {
    console.log("PID", process.pid, "is listening on port", server.address().port);
});

var testWriteFile = path.join(config.directory, "README");
writeFile(testWriteFile, "Angry Caching Proxy cache files").then(function() {
    console.log("Using cache directory", config.directory);
}, function(err) {
    console.log("Cannot write to", config.directory, err);
    process.exit(1);
});
