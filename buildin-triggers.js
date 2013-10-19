
module.exports = {

    "apt-get": function isDebRequest(req, res) {
        // Cache all archive.ubuntu.com, fi.archive.ubuntu.com etc. requests
        if (!/^.*archive.ubuntu.com$/.test(req.headers.host)) return false;

        // http://archive.ubuntu.com/ubuntu/pool/main/g/git/git-core_1.7.10.4-1ubuntu1_all.deb
        var deb = /^.*\.deb$/;

        return deb.test(req.url);
    },


    "npm": function isNodeModuleRequest(req, res) {

        if (req.headers.host !== "registry.npmjs.org") return false;

        // Node modules are in .tgz files
        // http://registry.npmjs.org/boom/-/boom-0.4.2.tgz
        var tgz = /^.*\.tgz$/;
        return tgz.test(req.url);

    },


    "rubygems": function isRubyGemRequest(req, res) {
        var hosts = {
            "rubygems.org": true,
            "production.cf.rubygems.org": true,
            "rubygems.global.ssl.fastly.net": true
        };

        if (!hosts[req.headers.host]) return false;

        // http://rubygems.org/gems/actionmailer-3.2.14.gem
        var gem = /^.*\.gem$/;
        // http://rubygems.org/quick/Marshal.4.8/eventmachine-1.0.3-java.gemspec.rz
        var gemspec = /^.*\.gemspec\.rz/;

        return gem.test(req.url) || gemspec.test(req.url);
    },

    "pypi": function isPypiRequest(req, res) {
        var hosts = {
            "pypi.python.org": true
        };

        if (!hosts[req.headers.host]) return false;

        // http://pypi.python.org/packages/source/P/Products.DCWorkflow/Products.DCWorkflow-2.3.0-beta.tar.gz
        // http://pypi.python.org/packages/source/P/Products.PloneTestCase/Products.PloneTestCase-0.9.17.zip
        var egg = /^.*packages\/source\/.*(\.tar\.gz|\.zip)$/;
        return egg.test(req.url);

    }

};
