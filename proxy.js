
var crypto = require("crypto");
var Q = require("q");
var args = require("./args");
var path = require("path");
var xtend = require("xtend");
var url = require("url");
var request = require("request");
var promisePipe = require("promisepipe");
var fs = require("graceful-fs");
var filed = require("filed");
var path = require("path");

var stat = Q.denodeify(fs.stat);
var writeFile = Q.denodeify(fs.writeFile);
var rename = Q.denodeify(fs.rename);

var handlers = [
    require("./handlers/rubygems"),
    require("./handlers/npm"),
    require("./handlers/apt-get")
];

function angryCachingProxy(req, res, next) {

    var u = url.parse(req.url);
    if (!u.host) {
        return next();
    }

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

    console.log("Proxying", req.method, req.url);
    promisePipe(
        req,
        request({
                method: req.method,
                url: req.url,
                headers: xtend({
                    "X-Proxy": "angry-caching-proxy"
                }, req.headers)
            }),
        res
    ).fail(function(err) {
        console.error("Proxying failed:", err.message, req.method, req.url);
        res.write("Angry Caching Proxy - Upstream failed: " + err.message);
        res.end("\n", 500);

        // Ensure that this connection gets closed
        req.setTimeout(100);
    });

}

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
    return path.join(args.dir, toCacheKey(req));
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

    var s = Date.now();
    var clientRequest = request(req.url);

    var cacheWrite = Q.promise(function(resolve, reject) {
        clientRequest.on("error", reject);
        clientRequest.on("response", function(clientRes) {

            // Write cache only on 200 success
            if (clientRes.statusCode === 200) {
                var file = filed(tempTarget);

                resolve(Q.all([
                    promiseFromStream(res),
                    writeMeta(req, clientRes),
                    promiseFromStream(file).then(function() {
                        return rename(tempTarget, target);
                    })
                ]));

                clientRequest.pipe(file);
            } else {
                resolve(promiseFromStream(res));
            }

            // But always proxy the response to the client
            clientRequest.pipe(res);
        });

    });


    var cachePromise = Q.all([
        cacheWrite,
        promiseFromStream(clientRequest),
    ]);

    cachePromise.finally(function() {
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

module.exports = angryCachingProxy;
