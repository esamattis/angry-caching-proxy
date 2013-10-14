
var crypto = require("crypto");
var express = require("express");
var filed = require("filed");
var fs = require("fs");
var path = require("path");
var Q = require("q");
var http = require("http");
var request = require("request");
var args = require("./args");

var stat = Q.denodeify(fs.stat);
var writeFile = Q.denodeify(fs.writeFile);
var rename = Q.denodeify(fs.rename);

Q.longStackSupport = true;

var handlers = [
    require("./handlers/rubygems"),
    require("./handlers/npm"),
    require("./handlers/apt-get")
];

var cacheDir = args.directory || process.cwd() + "/acp-cache";
var app = express();

var cachePromises = {};

app.use(function(req, res, next) {

    if (!req.headers.host) {
        var msg = "Bad request, no host is set for " + req.url;
        console.log(msg);
        return next(new Error(msg));
    }

    var useCache = handlers.some(function(h) {
        return h(req, res);
    });

    if (useCache) {
        cacheResponse(req, res).fail(function(err) {
            console.log("Cache FAIL", req.url, err);
        });
        return;
    }

    console.log("Proxying", req.url);
    request({
        url: req.url,
        headers: req.headers
    }).on("error", function(err) {
        res.end("Upstream failed", 500);
    }).pipe(res);


});


function promiseFromStream(stream) {
    return Q.promise(function(resolve, reject) {
        stream.on("error", reject);

        // This event fires when no more data will be provided.
        stream.on("end", resolve);

        // Emitted when the underlying resource (for example, the backing file
        // descriptor) has been closed. Not all streams will emit this.
        stream.on("close", resolve);

        // When the end() method has been called, and all data has been flushed
        // to the underlying system, this event is emitted.
        stream.on("finish", resolve);
    });
}


function toCacheKey(req) {
    var h = crypto.createHash("sha1");
    h.update(req.url);
    return h.digest("hex");
}

function toCachePath(req) {
    return path.join(cacheDir, toCacheKey(req));
}

function writeMeta(origReq, clientRes) {
    return writeFile(
        toCachePath(origReq) + ".json",
        JSON.stringify({
            url: origReq.url,
            headers: clientRes.headers
        }, null, "    ")
  );
}

function createCache(req, res) {
    console.log("Cache miss, creating", req.url);

    var target = toCachePath(req);
    var tempTarget = target + "." + Math.random().toString(36).substring(7) +".tmp";

    var cachePromise = cachePromises[target];
    if (cachePromises[target]) {
        return cachePromise;
    }

    var s = Date.now();
    var clientRequest = request(req.url);

    var cacheWrite = Q.promise(function(resolve, reject) {
        clientRequest.on("error", reject);
        clientRequest.on("response", function(clientRes) {

            // Write cache only on 200 success
            if (clientRes.statusCode === 200) {
                var file = filed(tempTarget);

                resolve(Q.all([
                    writeMeta(req, clientRes),
                    promiseFromStream(file).then(function() {
                        return rename(tempTarget, target);
                    })
                ]));

                clientRequest.pipe(file);
            }

            // But always proxy the response to the client
            clientRequest.pipe(res);
        });

    });


    cachePromises[target] = cachePromise = Q.all([
        cacheWrite,
        promiseFromStream(clientRequest),
    ]);

    cachePromise.finally(function() {
        delete cachePromises[target];
        console.log("Cache CREATED in", Date.now() - s, "ms for", req.url, toCacheKey(req));
    });

    return cachePromise;
}

function respondFromCache(req, res) {
    console.log("Cache hit for", req.url, toCacheKey(req));

    res.sendfile(toCachePath(req));
    return promiseFromStream(res);
}


function cacheResponse(req, res) {

    return stat(toCachePath(req)).then(function(info) {
        return respondFromCache(req, res);
    }, function(err) {
        return createCache(req, res);
    });
}



var server = http.createServer(app);
server.listen(Number(args.port) || 8000, function() {
    console.log("Listening on", server.address().port);
});

var testWriteFile = path.join(cacheDir, "README");
writeFile(testWriteFile, "Angry Caching Proxy cache files").then(function() {
    console.log("Writing cached files to", cacheDir);
}, function(err) {
    console.log("Cannot write to", cacheDir, err);
    process.exit(1);
});
