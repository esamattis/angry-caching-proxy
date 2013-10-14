
function isDebRequest(req, res) {

    if (!/^.*archive.ubuntu.com$/.test(req.headers.host)) return false;

    if (/^.*\.deb$/.test(req.url)) {
        return true;
    }

}

module.exports = isDebRequest;
