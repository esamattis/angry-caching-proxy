
module.exports = {

    "apt-get": function(req, res) {

        // Cache all archive.ubuntu.com, fi.archive.ubuntu.com etc. requests
        if (!/^.*archive.ubuntu.com$/.test(req.headers.host)) return false;

        // Example:
        // http://archive.ubuntu.com/ubuntu/pool/main/g/git/git-core_1.7.10.4-1ubuntu1_all.deb
        if (/^.*\.deb$/.test(req.url)) {
            return true;
        }
    },


    "npm": function(req, res) {

        if (req.headers.host !== "registry.npmjs.org") return false;


        // Node modules are in .tgz files
        // Example: http://registry.npmjs.org/boom/-/boom-0.4.2.tgz
        if (/^.*\.tgz$/.test(req.url)) {
            return true;
        }

    },


    "rubygems": function(req, res) {
        var hosts = {
            "rubygems.org": true,
            "rubygems.global.ssl.fastly.net": true
        };

        if (!hosts[req.headers.host]) return false;

        if (/^.*\.gem$/.test(req.url)) {
            return true;
        }
    }

};
