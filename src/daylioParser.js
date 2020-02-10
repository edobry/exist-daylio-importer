const
    Readable = require("stream").Readable,

    { log, logJSON } = require("./util"),

    through2 = require("through2"),
    toArray = require("stream-to-array"),
    csv = require("csv-parse"),
    parseSync = require("csv-parse/lib/sync");

const parserConfig = {
    delimeter: ',',
    columns: true,
    quote: "'",
    bom: true
};

const parser = csv(parserConfig);

const moods = {
    "rad": 5,
    "content": 5,
    "excited": 5,
    "good": 4,
    "alright": 4,
    "meh": 3,
    "uneasy": 3,
    "sober": 4,
    "annoyed": 2,
    "bad": 2,
    "awful": 1
};

const convertDaylioRecord = record => {
    const { "full_date": date, time, mood, activities } = record;

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

const parseDaylioCsvStream = stream =>
    stream
        .pipe(parser)
        .pipe(map(convertDaylioRecord));

const parseDaylioCsvFromStdin = () =>
    parseDaylioCsvStream(process.stdin);

const parseDaylioCsv = content => {
    //replace double quotes w/ single to aid in escaping
    const cleanedContent = content
        .replace(/"/g, "'");

    const parsedRecords = parseSync(cleanedContent, parserConfig);
    return parsedRecords.map(convertDaylioRecord);
};

const streamDaylioExport = stream =>
    stream.setEncoding('utf8');

const stringToStream = content => {
    const stream = new Readable();
    stream._read = () => {};
    stream.push(content);
    stream.push(null);

    return stream;
};

module.exports = {
    streamDaylioExport, parseDaylioCsvFromStdin, parseDaylioCsv
};
