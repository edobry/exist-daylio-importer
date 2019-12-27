const
    { log, logJSON } = require("./util"),
    { readDaylioExport } = require("./daylioParser"),
    { updateAttributes, appendTagsEndpoint } = require("./existApi");

const normalizeTag = tag =>
    tag.replace(' ', '_');

module.exports = async () => {
    const records = await readDaylioExport();

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

    log("done!")
};
