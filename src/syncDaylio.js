const
    { log, logJSON } = require("./util"),
    { parseDaylioCsv } = require("./daylioParser"),
    { updateAttributes, appendTagsEndpoint } = require("./existApi");

const normalizeTag = tag =>
    tag.replace(' ', '_');

const parseAndSyncDaylio = async file => {
    log("Parsing file...")
    const records = parseDaylioCsv(file);

    // log("Parsed: ");
    // log(records);

    log("Syncing to Exist...")
    await syncToExist(records);

    log("Done!");
};

const syncToExist = async records => {
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

    log(`Syncing ${mood.length} mood records to daylio`);
    await updateAttributes(mood);

    log(`Syncing ${tags.length} tags to daylio....`);
    await appendTagsEndpoint(tags);
};

module.exports = { parseAndSyncDaylio, syncToExist };
