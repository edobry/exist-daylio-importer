const
    nconf = require("nconf");

nconf.argv().file("conf.json")
    .defaults({
        action: "process"
    });

const
    { log, logJSON } = require("./util"),

    { parseAndSyncDaylio } = require("./syncDaylio");

exports.handler = async (event, context) => {
    log("EVENT: ");
    logJSON(event);

    //parse zapier-mediated google drive webhook event
    const { file } = event;

    log(file);

    parseAndSyncDaylio(file);
};
