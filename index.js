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

const getCode = () => {
    const authUrl = auth.authorizationCode.authorizeURL({
        redirect_uri: "https://localhost/",
        scope: "read+write"
    });

    console.log(authUrl);
};

const getToken = async () => {
    const code = nconf.get("code")

    const tokenConfig = {
        code,
        redirect_uri: 'http://localhost:3000/callback',
        scope: "read+write"
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

const existRequest = async (client, method, endpoint, callback) => {
    const promise = client.request(method, endpoint);
    try {
        const res = await promise;
        const body = await Wreck.read(res, {
            json: true
        });

        return body;
    } catch(e) {
        throw new Error(e);
    }
};

const logJSON = obj => console.log(JSON.stringify(obj, null, 4));

const endpoint = (method, path, handler, body) => async () => {
     console.log(nconf.get("token:access_token"))
     const body = await existRequest(initExistClient(), method, path);
     handler(body);
}

const getProfile = endpoint("GET", "users/$self/today/", profile => {
    console.log("got profile");
    logJSON(profile);
});

const listOwnedAttributes = endpoint("GET", "attributes/owned/", ownedAttrs => {
    logJSON(ownedAttrs);
});

const acquireAttributes = endpoint("POST", "attributes/acquire/", ownedAttrs => {
    logJSON(ownedAttrs);
});

const actions = {
    processFile, getCode, getToken, getProfile, listOwnedAttributes, acquireAttributes
};

const requestedAction = nconf.get("action");

const actionHandler = actions[requestedAction];
if(!actionHandler)
    throw new Error(`Invalid action '${requestedAction}'`)

actionHandler();
