const
    { log, logJSON } = require("./util"),

    { readDaylioExport, parseDaylioCsv } = require("./daylioParser");
    syncDaylio = require("./syncDaylio");

exports.handler = async function(event, context) {
    log("EVENT: ");
    logJSON((event);

    //parse zapier-mediated google drive webhook event
    const { file } = event.payload;

    log("Parsing file...")
    const records = await parseDaylioCsv(file);

    //download google drive file

    log("Syncing to Exist...")
    syncDaylio(records);
};
