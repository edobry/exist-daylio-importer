const
    { log, logJSON } = require("./util"),

    { parseAndSyncDaylio } = require("./syncDaylio");

exports.handler = async function(event, context) {
    log("EVENT: ");
    logJSON((event);

    //parse zapier-mediated google drive webhook event
    const { file } = event.payload;

    log(file);

    parseAndSyncDaylio(file);
};
