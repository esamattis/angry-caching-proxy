
var hosts = {
    "registry.npmjs.org": true,
};

function isNodeModuleRequest(req, res) {
    if (!hosts[req.headers.host]) return false;

    if (/^.*\.tgz/.test(req.url)) {
        return true;
    }

}

module.exports = isNodeModuleRequest;
