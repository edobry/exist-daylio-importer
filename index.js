const
    fs = require("fs"),
    nconf = require("nconf"),
    transform = require("stream-transform"),
    through2 = require("through2"),
    JsonStreamStringify = require("json-stream-stringify"),
    csv = require("csv-parse");

nconf.argv();
nconf.required([
    ]);

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

const daylioTransform = through2.obj(function(chunk, enc, callback) {
    this.push(convertDaylioRecord(chunk));

    return callback();
});

const stringify = through2.obj(function(chunk, enc, callback) {
    this.push(`${JSON.stringify(chunk)}\n`);

    return callback();
});

const countProcessed = () => {
    let processed = 0;

    return {
        report: () => processed,
        counter: () => processed++
    };
}

const dueProcess = () => {
    process.stdin
        .pipe(parser)
        .pipe(daylioTransform)
        // .pipe(spy(counter))
        .pipe(stringify)
        .pipe(process.stdout)
        .on("finish", () => {
            const { lines, records } = parser.info;

            log(`Done! Processed ${records} Daylio records`);
        });
};

log("Transfomring Daylio records to Exist events...")

process.stdin.setEncoding('utf8');

process.stdout.on("error", err => {
    if(err.code == "EPIPE")
        process.exit(0);
});


dueProcess();

// process.stdin.on("readable",
//     dueProcess);
