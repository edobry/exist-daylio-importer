const
    got = require("got"),
    nconf = require("nconf");

nconf.argv().file("conf.json");

const
    { log, logJSON } = require("./util");

const { username, auth_token, goalName } = nconf.get("beeminder");

const baseUrl = "https://www.beeminder.com/api/v1";

const goalEndpoint = "goals"

const daylioGoalUrl = `users/${username}/${goalEndpoint}/${goalName}`;

const bmApi = got.extend({
    prefixUrl: baseUrl,
    searchParams: { auth_token },
    responseType: 'json'
});

const getDaylioGoal = async () => {
    try {
        const response = await bmApi({
            method: "GET",
            url: `${daylioGoalUrl}.json`
        });

        log(response.body);
    } catch(e) {
        log(e);
        // log(e.response);
        // log(e.options);
    }
};

const logDaylioSync = async () => {
    log("Logging to Beeminder...");

    const vals = {
        value: 1,
        comment: "logged from exist-daylio-importer",
        sendmail: true,
        requestid: new Date().toLocaleDateString()
    };

    try {
        const response = await bmApi({
            method: "POST",
            url: `${daylioGoalUrl}/datapoints.json`,
            json: vals
        });

        const { id, status } = response.body;

        log(`Beeminder datapoint '${id}' ${status}`);

        return response;
    } catch(e) {
        const { errors } = e.response.body;

        if(errors == "Duplicate request") {
            log("Duplicate request, exiting");
            return;
        }

        else {
            log(errors);
            throw new Error("Unknown error!");
        }
    }
};

module.exports = { getDaylioGoal, logDaylioSync }
