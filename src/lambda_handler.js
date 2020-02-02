const
    nconf = require("nconf");

nconf.argv().file("conf.json")
    .defaults({
        action: "process"
    });

const
    { log, logJSON } = require("./util"),

    { syncLatestDaylioExport } = require("./syncDaylio");

exports.handler = async (event, context) => {
    log("EVENT: ");
    logJSON(event);

    log("Fetching latest Daylio export...")
    await syncLatestDaylioExport();

    log("Done!");
};
