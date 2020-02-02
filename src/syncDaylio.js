const
    { log, logJSON } = require("./util"),
    { parseDaylioCsv } = require("./daylioParser"),
    { updateAttributes, appendTagsEndpoint } = require("./existApi"),
    { getLatestDaylioExport } = require("./driveApi");

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

const syncLatestDaylioExport = async () => {
    const file = await getLatestDaylioExport();
    await parseAndSyncDaylio(file);
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
                .map(normalizeTag)
                .map(value => ({
                    date,
                    value
                }))
        );

        return agg;
    }, {
        mood: [], tags: []
    });

    log(`Syncing ${mood.length} mood records...`);
    await updateAttributes(mood);

    log(`Syncing ${tags.length} tags...`);
    await appendTagsEndpoint(tags);
};

module.exports = { parseAndSyncDaylio, syncToExist, syncLatestDaylioExport };
