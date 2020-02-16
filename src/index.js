const
    fs = require("fs"),

    nconf = require("nconf");

nconf.argv().file("./conf.json")
    .defaults({
        action: "process"
    });

const
    { log, logJSON } = require("./util"),

    { streamDaylioExport } = require("./daylioParser"),
    { getCode, getToken, getProfile, listOwnedAttributes, acquireAttributes, appendTags } = require("./existApi"),
    { parseAndSyncDaylio, syncLatestDaylioExport } = require("./syncDaylio"),
    { getLatestDaylioExport, watchFolder, watchDaylioFolder } = require("./driveApi"),
    { getDaylioGoal, logDaylioSync } = require("./beeminderApi");

//TODO: implement logging library
//TODO: detect, filter, new unmapped moods
//TODO: handle sync event
//TODO: reimplement streaming
//TODO: configure eslint
//TODO: set up packaging
//TODO: set up deployment

const pipeToStdout = stream => {
    process.stdout.on("error", err => {
        //handle closed pipe
        if(err.code == "EPIPE")
            process.exit(0);
    });

    stream
        .pipe(map(obj => `${JSON.stringify(obj)}\n`))
        .pipe(process.stdout)
        .on("finish", () => {
            const { lines, records } = parser.info;

            log(`Done! Processed ${records} Daylio records`);
        });
};

const processFile = () =>
    pipeToStdout(
        streamDaylioExport());

const syncDaylioFile = async () => {
    const file = fs.readFileSync(nconf.get("file"), "UTF-8");
    await parseAndSyncDaylio(file);
};

const actions = {
    processFile, getCode, getToken, getProfile, listOwnedAttributes,
    acquireAttributes, appendTags, syncDaylioFile, getLatestDaylioExport,
    syncLatestDaylioExport, watchFolder, watchDaylioFolder, getDaylioGoal, logDaylioSync
};

const requestedAction = nconf.get("action");

const actionHandler = actions[requestedAction];
if(!actionHandler)
    throw new Error(`Invalid action '${requestedAction}'`)

actionHandler();
