const
    nconf = require("nconf");

nconf.argv().file("conf.json")
    .defaults({
        action: "process"
    });

const
    { log, logJSON } = require("./util"),

    { syncLatestDaylioExport } = require("./syncDaylio");

const handleEvent = async event => {
    const { resource, path, httpMethod, headers, requestContext, body } = event;

    const { identity: { sourceIp, userAgent } } = requestContext;

    log(`Received a ${httpMethod} request for ${resource} from ${sourceIp} with a user-agent of ${userAgent}`);

    if(userAgent.includes("APIs-Google")) {
        const state = handleGoogleEvent(headers);
        if(state == "sync")
            return;

        if(["add", "update"].includes(state)) {
            log("Fetching latest Daylio export...");
            await syncLatestDaylioExport();
        }
    }

    if(body) {
        log("Request body:");
        logJSON(body);
    }

};

const handleGoogleEvent = headers => {
    const getGoogHeaderVal = name => headers[`X-Goog-${name}`];

    const id = getGoogHeaderVal("Resource-ID");
    const channelId = getGoogHeaderVal("Channel-ID");
    const expiration = getGoogHeaderVal("Channel-Expiration");
    const state = getGoogHeaderVal("Resource-State");

    log(`Received ${state} event on channel ${channelId} for resource ${id}`);
    log(`Channel expires: ${expiration}`);

    return state;
};

exports.handler = async (event, context) => {
    // log("EVENT: ");
    // logJSON(event);

    // log("CONTEXT: ");
    // logJSON(context);
    await handleEvent(event);
    log("Done!");
};
