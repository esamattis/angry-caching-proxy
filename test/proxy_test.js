/*global it, describe, before, beforeEach, after */

var APP_PORT = 7000;
var PROXY_PORT = 7001;
var CACHE_DIR = __dirname + "/cache";

var express = require("express");
var http = require("http");
var url = require("url");
var proxy = require("../proxy");
var assert = require("assert");
var fs = require("fs");
var rimraf = require("rimraf");
var request = require("request").defaults({
    proxy: "http://localhost:" + PROXY_PORT
});

var app = express();

function appUrl(path) {
    return "http://localhost:" + APP_PORT + path;
}

function randomResponse() {
    return "RES: " + Math.random().toString(36).substring(7);
}

app.all("/data", function(req, res) {
    res.end(randomResponse());
});

app.get("/other", function(req, res) {
    res.end(randomResponse());
});

app.get("/broken-data", function(req, res) {
    res.send(500, randomResponse());
});

app.all("/echo", function(req, res) {
    req.pipe(res);
});


var proxyApp = express();

proxyApp.use(proxy([
    function(req, res) {
        var u = url.parse(req.url);
        return (/data$/).test(u.pathname);
    }
], CACHE_DIR));


describe("Angry Caching Proxy", function() {
    beforeEach(function() {
        rimraf.sync(CACHE_DIR);
        fs.mkdirSync(CACHE_DIR);
    });

    before(function(done) {
        this.appServer = http.createServer(app);
        this.appServer.listen(APP_PORT, done);
    });
    after(function(done) {
        this.appServer.close(done);
    });

    before(function(done) {
        this.proxyServer = http.createServer(proxyApp);
        this.proxyServer.listen(PROXY_PORT, done);
    });
    after(function(done) {
        this.proxyServer.close(done);
    });

    it("can proxy requests", function(done) {
        request({
            method: "GET",
            url: appUrl("/data")
        }, function(err, res, body) {
            if (err) return done(err);
            assert(
                /^Angry Caching Proxy/.test(res.headers.via),
                "Bad via header: "+ res.headers.via
            );
            done();
        });
    });

    it("can proxy POST requests", function(done) {
        request({
            method: "POST",
            url: appUrl("/echo"),
            form: {
                foo: "bar"
            }
        }, function(err, res, body) {
            if (err) return done(err);
            assert.equal(body, "foo=bar");
            done();
        });
    });

    it("can proxy PUT requests", function(done) {
        var req = request({
            method: "PUT",
            url: appUrl("/echo"),
        }, function(err, res, body) {
            if (err) return done(err);
            assert.equal(body, "foo");
            done();
        });

        req.end("foo");
    });

    it("caches GET 200", function(done) {
        request({
            method: "GET",
            url: appUrl("/data")
        }, function(err, res, body) {
            if (err) return done(err);
            assert(body.match(/^RES/));

            assert(
                /^Miss /.test(res.headers["x-cache"]),
                "Expected a miss header from : " + res.headers["x-cache"]
            );

            var prevBody = body;
            request({
                method: "GET",
                url: appUrl("/data")
            }, function(err, res, body) {
                if (err) return done(err);
                assert(body.match(/^RES/));
                assert(
                    /^Hit /.test(res.headers["x-cache"]),
                    "Expected a hit header from : " + res.headers["x-cache"]
                );

                assert.equal(prevBody, body);
                done();
            });
        });
    });

    it("creates different caches for different querytrings", function(done) {
        request({
            method: "GET",
            url: appUrl("/data?foo=bar")
        }, function(err, res, body) {
            if (err) return done(err);
            assert(body.match(/^RES/));
            var prevBody = body;
            assert(
                /^Miss /.test(res.headers["x-cache"]),
                "Expected a miss header from : " + res.headers["x-cache"]
            );
            request({
                method: "GET",
                url: appUrl("/data?foo=baz")
            }, function(err, res, body) {
                if (err) return done(err);
                assert(body.match(/^RES/));
                assert(
                    /^Miss /.test(res.headers["x-cache"]),
                    "Expected a miss header from : " + res.headers["x-cache"]
                );
                assert.notEqual(prevBody, body);
                done();
            });
        });
    });

    [
        {
            method: "GET",
            path: "/other"
        },
        {
            method: "GET",
            path: "/broken-data"
        },
        {
            method: "POST",
            path: "/data"
        },
        {
            method: "PUT",
            path: "/data"
        },
        {
            method: "DELETE",
            path: "/data"
        },
        {
            method: "PATCH",
            path: "/data"
        }
    ].forEach(function(opts) {
        it("does not cache " + opts.method + " " + opts.path, function(done) {
            request({
                method: opts.method,
                url: appUrl(opts.path)
            }, function(err, res, body) {
                if (err) return done(err);
                assert(body.match(/^RES/));
                var prevBody = body;
                request({
                    method: opts.method,
                    url: appUrl(opts.path)
                }, function(err, res, body) {
                    if (err) return done(err);
                    assert(body.match(/^RES/));
                    assert.notEqual(prevBody, body, "It was cached!");
                    done();
                });
            });
        });
    });

});
