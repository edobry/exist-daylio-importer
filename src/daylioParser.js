const
    fs = require("fs"),
    Readable = require("stream").Readable,

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

const readStream = stream => {
    stream.setEncoding('utf8');

    process.stdout.on("error", err => {
        //handle closed pipe
        if(err.code == "EPIPE")
            process.exit(0);
    });

    log("Transfomring Daylio records to Exist events...");

    return stream;
};

const parseDaylioCsvStream = stream =>
    stream
        .pipe(parser)
        .pipe(map(convertDaylioRecord));

const parseDaylioCsv = content =>
    toArray(
        parseDaylioCsvStream(
            stringToStream(content)));

const readDaylioExportStream = stream =>
    toArray(
        streamDaylioExport(stream));

const stringToStream = content => {
    const stream = new Readable();
    stream._read = () => {};
    stream.push(content);
    stream.push(null);

    return stream;
};

module.exports = {
    streamDaylioExport, readDaylioExport, readDaylioExportStream, parseDaylioCsv
};
