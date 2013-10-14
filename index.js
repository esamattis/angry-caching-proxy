
var crypto = require("crypto");
var express = require("express");
var filed = require("filed");
var fs = require("fs");
var path = require("path");
var Q = require("q");
var request = require("request");

var stat = Q.denodeify(fs.stat);
var writeFile = Q.denodeify(fs.writeFile);

Q.longStackSupport = true;


var handlers = [
    require("./handlers/rubygems"),
    require("./handlers/npm"),
    require("./handlers/apt-get")
];

var cacheDir = __dirname + "/cache";
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
            console.log("Cache FAIL", toUrl(req), err);
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

app.listen(8000);

function promiseFromStreams() {
    return Q.all(Array.prototype.map.call(arguments, function(stream) {
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
    }));
}

function toUrl(req) {
    return req.url;
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
    console.log("Cache miss, creating", toUrl(req));

    var target = toCachePath(req);
    var cachePromise = cachePromises[target];
    if (cachePromises[target]) {
        return cachePromise;
    }

    var s = Date.now();
    var r = request(toUrl(req));


    var meta = Q.promise(function(resolve, reject) {
        r.on("response", function(clientRes) {
            resolve(writeMeta(req, clientRes));
        });
    });

    var file = filed(target);
    r.pipe(file);
    r.pipe(res);

    cachePromises[target] = cachePromise = Q.all([
        meta,
        promiseFromStreams(r),
        promiseFromStreams(file)
    ]);

    cachePromise.finally(function() {
        delete cachePromises[target];
        console.log("Cache CREATED in", Date.now() - s, "ms for", toUrl(req), toCacheKey(req));
    });

    return cachePromise;
}

function respondFromCache(req, res) {
    console.log("Cache hit for", toUrl(req), toCacheKey(req));

    res.sendfile(toCachePath(req));
    return promiseFromStreams(res);
}


function cacheResponse(req, res) {

    return stat(toCachePath(req)).then(function(info) {
        return respondFromCache(req, res);
    }, function(err) {
        return createCache(req, res);
    });
}

