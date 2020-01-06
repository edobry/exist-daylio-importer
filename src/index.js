const
    nconf = require("nconf"),

    { streamDaylioExport } = require("./daylioParser");

nconf.argv().file("conf.json")
    .defaults({
        action: "process"
    });

const
    { log, logJSON } = require("./util");

const pipeToStdout = stream => {
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

const actions = {
    processFile, getCode, getToken, getProfile, listOwnedAttributes,
    acquireAttributes, appendTags, syncDaylio
};

const requestedAction = nconf.get("action");

const actionHandler = actions[requestedAction];
if(!actionHandler)
    throw new Error(`Invalid action '${requestedAction}'`)

actionHandler();
