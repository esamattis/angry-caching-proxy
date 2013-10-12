

var hosts = {
    "rubygems.org": true,
    "rubygems.global.ssl.fastly.net": true
};

function rubygems(req, res) {
    if (!hosts[req.headers.host]) return false;

    if (/^.*\.gem$/.test(req.url)) {
        return true;
    }

}

module.exports = rubygems;
