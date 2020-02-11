const
    got = require("got"),
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

    try {
        const response = await bm.createDatapoint(daylioGoalName, {
            value: 1,
            comment: "logged from exist-daylio-importer",
            sendmail: true,
            requestid: new Date().toLocaleDateString()
        });

        const { id, status } = response;

        log(`Beeminder datapoint '${id}' ${status}`);

        return response;
    } catch(e) {
        if(e == "Duplicate request")
            return;

        else {
            log(e);
            throw new Error("Unknown error!");
        }
    }
};

module.exports = { getDaylioGoal, logDaylioSync }
