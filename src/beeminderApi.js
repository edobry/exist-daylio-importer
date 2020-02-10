const
    beeminder = require("beeminder"),
    nconf = require("nconf");

nconf.argv().file("conf.json");

const
    { log, logJSON } = require("./util");

const bm = beeminder(nconf.get("beeminder:auth_token"));

const daylioGoalName = "daylio-checkins";

const getDaylioGoal = async () => {
    const response = await bm.getGoal(daylioGoalName);
    logJSON(response);
};

const logDaylioSync = async () => {
    log("Logging to Beeminder...");

    const response = await bm.createDatapoint(daylioGoalName, {
        value: 1,
        comment: "logged from exist-daylio-importer",
        sendmail: true,
        requestid: "test-request"
    });

    logJSON(response);
};

module.exports = { getDaylioGoal, logDaylioSync }
