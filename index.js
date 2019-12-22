const
    fs = require("fs"),
    nconf = require("nconf"),
    through2 = require("through2"),
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

const dueProcess = () => {
    process.stdin.setEncoding('utf8');

    process.stdout.on("error", err => {
        //handle closed pipe
        if(err.code == "EPIPE")
            process.exit(0);
    });

    log("Transfomring Daylio records to Exist events...");

    process.stdin
        .pipe(parser)
        .pipe(map(convertDaylioRecord))
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

const getAuthCode = () => {
    const authUrl = auth.authorizationCode.authorizeURL({
        redirect_uri: "https://localhost/",
        scope: "read+write"
    });

    console.log(authUrl);
};

const getAccessToken = async code => {
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

const getProfile = async () => {
    const token = nconf.get("token.access_token");

    const client = Wreck.defaults({
        baseUrl: "https://exist.io/api/1/",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const promise = client.request("GET", "users/$self/today/");
    try {
        const res = await promise;
        const body = await Wreck.read(res, {
            json: true
        });

        console.log(JSON.stringify(body, null, 4));
    } catch(e) {
        throw new Error(e);
    }
}

const action = nconf.get("action");

if(action == "process")
    dueProcess();
else if(action == "getCode")
    getAuthCode();
else if(action == "getToken")
    getAccessToken(nconf.get("code"));
else if(action == "getProfile")
    getProfile();
else
    throw new Error(`Invalid action '${action}'`)
