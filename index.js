const
    fs = require("fs"),
    nconf = require("nconf"),
    through2 = require("through2"),
    toArray = require("stream-to-array"),
    csv = require("csv-parse"),
    oauth2 = require("simple-oauth2"),
    Wreck = require('@hapi/wreck');

nconf.argv().file("conf.json")
    .defaults({
        action: "process"
    });

const quietMode = nconf.any("quiet", "q");

const log = message => {
    if(!quietMode)
        console.log(message)
};

const parser = csv({
    delimeter: ',',
    columns: true
})

const moods = {
    "rad": 5,
    "content": 5,
    "good": 4,
    "meh": 3,
    "uneasy": 3,
    "sober": 4,
    "annoyed": 2
};

const convertDaylioRecord = record => {
    const { "﻿full_date": date, time, mood, activities, note } = record;

    return {
        date, time,
        mood: [mood, moods[mood]],
        tags: activities.split(' | ')
    };
};

const map = f => through2.obj(function(chunk, enc, callback) {
    this.push(f(chunk));

    return callback();
});

const countProcessed = () => {
    let processed = 0;

    return {
        report: () => processed,
        counter: () => processed++
    };
};

const streamDaylioExport = () => {
    process.stdin.setEncoding('utf8');

    process.stdout.on("error", err => {
        //handle closed pipe
        if(err.code == "EPIPE")
            process.exit(0);
    });

    log("Transfomring Daylio records to Exist events...");

    return process.stdin
        .pipe(parser)
        .pipe(map(convertDaylioRecord))
};

const readDaylioExport = () =>
    toArray(streamDaylioExport())

const processFile = () =>
    pipeToStdout(
        streamDaylioExport());

const pipeToStdout = stream => {
    stream
        .pipe(map(obj => `${JSON.stringify(obj)}\n`))
        .pipe(process.stdout)
        .on("finish", () => {
            const { lines, records } = parser.info;

            log(`Done! Processed ${records} Daylio records`);
        });
};

const auth = oauth2.create({
    client: nconf.get("client"),
    auth: {
        tokenHost: "https://exist.io",
        tokenPath: "/oauth2/access_token",
        authorizePath: "/oauth2/authorize"
    }
});

const oauthConf = {
    redirect_uri: "https://localhost/",
    scope: "read+write+append"
};

const getCode = () => {
    const authUrl = auth.authorizationCode.authorizeURL(oauthConf);

    console.log(authUrl);
};

const getToken = async () => {
    const code = nconf.get("code")

    const tokenConfig = {
        code,
        ...oauthConf
    };

    try {
        const result = await auth.authorizationCode.getToken(tokenConfig);
        const accessToken = auth.accessToken.create(result);

        console.log(accessToken);
    } catch (error) {
        console.log('Access Token Error', error.message);
    }
};

const initExistClient = () =>
    Wreck.defaults({
        baseUrl: "https://exist.io/api/1/",
        headers: {
            "Authorization": `Bearer ${nconf.get("token:access_token")}`
        }
    });

const existRequest = async (method, endpoint, body) => {
    const client = initExistClient();

    const options = {};
    if(body)
        options.payload = body;

    try {
        const response = await client.request(method, endpoint, options);
        const body = await Wreck.read(response, {
            json: true
        });

        return body;
    } catch(e) {
        throw new Error(e);
    }
};

const logJSON = obj => console.log(JSON.stringify(obj, null, 4));

const getProfile = async () => {
    const profile = await existRequest("GET", "users/$self/today/");

    logJSON(profile);
};

const listOwnedAttributes = async () => {
    const ownedAttrs = await existRequest("GET", "attributes/owned/");
    
    logJSON(ownedAttrs);
};

const acquireAttributes = async () => {
    const attrsToAcquire = nconf.get("attrs").split(',');
    console.log(attrsToAcquire);

    const body = attrsToAcquire.map(attr => ({
        name: attr,
        active: true
    }));

    logJSON(body);

    const result = await existRequest("POST", "attributes/acquire/", body);

    logJSON(result);
};

const appendTags = async () => {
    const tags = nconf.get("tags").split(',');
    console.log(tags);

    const body = tags.map(tag => ({
        value: tag
    }));

    return appendTagsEndpoint(body);
};

const appendTagsEndpoint = async tags => {
    const { failed, success } = await existRequest("POST", "attributes/custom/append/", tags);

    console.log(`Result: ${success.length} suceeded, ${failed.length} failed`);
    if(failed)
        logJSON(failed);
};

const updateAttributes = async attrs => {
    const { failed, success } = await existRequest("POST", "attributes/update/", attrs);

    console.log(`Result: ${success.length} suceeded, ${failed.length} failed`);
    if(failed)
        logJSON(failed);
};

const normalizeTag = tag =>
    tag.replace(' ', '_');

const syncDaylio = async () => {
    const records = await readDaylioExport();

    const { mood, tags } = records.reduce((agg, { date, tags, mood }) => {
        agg.mood.push({
            date,
            name: "mood",
            value: mood[1]
        });

        agg.tags = agg.tags.concat(
            tags
                .filter(tag => tag.length > 0)
                .map(tag => ({
                    date,
                    value: normalizeTag(tag)
                }))
        );

        return agg;
    }, {
        mood: [], tags: []
    });

    console.log(`Syncing ${mood.length} mood records to daylio`);
    await updateAttributes(mood);

    console.log(`Syncing ${tags.length} tags to daylio....`);
    await appendTagsEndpoint(tags);

    console.log("done!")
};

const actions = {
    processFile, getCode, getToken, getProfile, listOwnedAttributes,
    acquireAttributes, appendTags, syncDaylio
};

const requestedAction = nconf.get("action");

const actionHandler = actions[requestedAction];
if(!actionHandler)
    throw new Error(`Invalid action '${requestedAction}'`)

actionHandler();
