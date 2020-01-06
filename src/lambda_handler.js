const
    { log, logJSON } = require("./util"),
    syncDaylio = require("./syncDaylio");

exports.handler = async function(event, context) {
    log("EVENT: ");
    logJSON((event);

    //parse zapier-mediated google drive webhook event

    //download google drive file

    syncDaylio(/* pass downloaded file in */)
};
