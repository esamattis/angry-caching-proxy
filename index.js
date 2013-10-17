
var express = require("express");
var fs = require("graceful-fs");
var path = require("path");
var Q = require("q");
var http = require("http");
var xtend = require("xtend");
var args = require("./args");

var writeFile = Q.denodeify(fs.writeFile);
var readFile = Q.denodeify(fs.readFile);
var readdir = Q.denodeify(fs.readdir);
var stat = Q.denodeify(fs.stat);

Q.longStackSupport = true;


var app = express();

app.set("view engine", "hbs");
app.set("views", __dirname + "/views");

app.get("/", function(req, res, next) {

    readdir(args.directory).then(function(files) {
        var allMeta = files.filter(function(filePath) {
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

        return Q.all(allMeta);
    }).then(function(files) {
        res.render("index", {
            cacheDir: args.directory,
            files: files
        });
    }, next);


});


app.use(require("./proxy"));

var server = http.createServer(app);
server.listen(Number(args.port) || 8000, function() {
    console.log("Listening on", server.address().port);
});

var testWriteFile = path.join(args.dir, "README");
writeFile(testWriteFile, "Angry Caching Proxy cache files").then(function() {
    console.log("Writing cached files to", args.dir);
}, function(err) {
    console.log("Cannot write to", args.dir, err);
    process.exit(1);
});
