
var express = require("express");
var fs = require("graceful-fs");
var path = require("path");
var Q = require("q");
var http = require("http");
var args = require("./args");

var writeFile = Q.denodeify(fs.writeFile);

Q.longStackSupport = true;



var app = express();

app.set("view engine", "hbs");
app.set("views", __dirname + "/views");

app.get("/", function(req, res) {
    res.render("index", {
        foo: "SDAFASF"
    });
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
