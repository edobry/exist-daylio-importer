const
    Readable = require("stream").Readable,

    through2 = require("through2"),
    toArray = require("stream-to-array"),
    csv = require("csv-parse");

const parser = csv({
    delimeter: ',',
    columns: true,
    quote: "'"
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

const parseDaylioCsv = content =>
    toArray(
        parseDaylioCsvStream(
            stringToStream(content)));

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
