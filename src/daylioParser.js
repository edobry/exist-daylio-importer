const
    fs = require("fs"),

    util = require("./util"),

    through2 = require("through2"),
    toArray = require("stream-to-array"),
    csv = require("csv-parse");

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
    "annoyed": 2,
    "bad": 2,
    "awful": 1
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

module.exports = {
    streamDaylioExport, readDaylioExport
};
