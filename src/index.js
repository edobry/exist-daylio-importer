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
    { parseAndSyncDaylio } = require("./syncDaylio");


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

const syncDaylioFile = () =>
    parseAndSyncDaylio(fs.readFileSync(nconf.get("file")));

const actions = {
    processFile, getCode, getToken, getProfile, listOwnedAttributes,
    acquireAttributes, appendTags, syncDaylioFile
};

const requestedAction = nconf.get("action");

const actionHandler = actions[requestedAction];
if(!actionHandler)
    throw new Error(`Invalid action '${requestedAction}'`)

actionHandler();
