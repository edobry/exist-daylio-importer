const
    nconf = require("nconf");

const util = {};

const quietMode = nconf.any("quiet", "q");

util.log = message => {
    if(!quietMode)
        console.log(message)
};

util.logJSON = obj => log(JSON.stringify(obj, null, 4));

module.exports = util;
