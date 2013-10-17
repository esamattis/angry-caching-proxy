
var express = require("express");
var fs = require("graceful-fs");
var path = require("path");
var Q = require("q");
var http = require("http");
var xtend = require("xtend");
var args = require("./args");
var filesize = require("filesize");

var writeFile = Q.denodeify(fs.writeFile);
var readFile = Q.denodeify(fs.readFile);
var readdir = Q.denodeify(fs.readdir);
var unlink = Q.denodeify(fs.unlink);
var stat = Q.denodeify(fs.stat);

Q.longStackSupport = true;


var app = express();

app.set("view engine", "hbs");
app.set("views", __dirname + "/views");

app.get("/", function(req, res, next) {

    readdir(args.directory).then(function(files) {
        var readPromises = files.filter(function(filePath) {
            return (/\.json$/).test(filePath);
        }).map(function(metaDataFile) {
            var metaDataFilePath = path.join(args.directory, metaDataFile);
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
            cacheDir: args.directory,
            files: files,
            total: filesize(total)
        });
    }, next);


});

app.get("/client.js", function(req, res) {
    res.sendfile(__dirname + "/client.js");
});

app.get("/req/:sha1", function(req, res, next) {
    var filePath = path.join(args.directory, req.params.sha1);
    res.sendfile(filePath);
});

app.delete("/req/:sha1", function(req, res, next) {
    var filePath = path.join(args.directory, req.params.sha1);

    console.log("Deleting", filePath);
    Q.all([unlink(filePath), unlink(filePath + ".json")]).then(function() {
        res.json({ deleted: filePath });
    }, next);

});

app.post("/deleteall", function(req, res, next) {
    readdir(args.directory).then(function(files) {
        return Q.all(files.map(function(filePath) {
            return unlink(path.join(args.directory, filePath));
        }));
    }).then(function() {
        res.redirect("/");
    }, next);
});


app.use(require("./proxy"));

var server = http.createServer(app);
server.listen(Number(args.port) || 8000, function() {
    console.log("Listening on", server.address().port);
});

var testWriteFile = path.join(args.dir, "README");
writeFile(testWriteFile, "Angry Caching Proxy cache files").then(function() {
    console.log("Using cache directory", args.dir);
}, function(err) {
    console.log("Cannot write to", args.dir, err);
    process.exit(1);
});
