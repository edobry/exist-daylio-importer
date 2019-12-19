const
    fs = require("fs"),
    nconf = require("nconf"),
    through2 = require("through2"),
    csv = require("csv-parse");

nconf.argv().required([]);

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

log("Transfomring Daylio records to Exist events...")

process.stdin.setEncoding('utf8');

process.stdout.on("error", err => {
    //handle closed pipe
    if(err.code == "EPIPE")
        process.exit(0);
});

dueProcess();
