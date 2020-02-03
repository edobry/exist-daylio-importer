const
    fs = require("fs"),

    { log, logJSON } = require("./util"),

    nconf = require("nconf"),
    { google } = require("googleapis");

const creds = JSON.parse(fs.readFileSync("./exist-daylio-importer-63ecb1859a91.json", "UTF-8"));

const driveReadOnlyScope = "https://www.googleapis.com/auth/drive.readonly";

const authorize = () => {
    const client = google.auth.fromJSON(creds);
    client.scopes = [driveReadOnlyScope];

    return client;
};

const drive = google.drive({
    version: 'v3',
    auth: authorize()
});

const folderMimeType = "application/vnd.google-apps.folder";

const folderNamed = name =>
    `mimeType='${folderMimeType}' and name='${name}'`;

const childOf = parentId =>
    `'${parentId}' in parents`;

const queryDrive = async query => {
    let result;
    try {
        result = await drive.files.list({
            q: query,
            pageSize: 10,
            fields: 'nextPageToken, files(id, name, createdTime)',
        });
    } catch({ errors }) {
        log("The API request errored:");
        errors.forEach(({ domain, reason, message, locationType, location }) =>
            log(`${message} for ${domain} ${locationType} '${location}': ${reason}`));

        logJSON(errors);
        return [];
    }

    const { data: { files } } = result;

    if(!files.length) {
        log('No files found.');
        return [];
    }

    return files;
};

const findDaylioFolderId = async () => {
    const folders = await queryDrive(
        folderNamed("Daylio"));

    if(folders.length > 1)
        throw new Error("More than one Daylio folder found!");

    return folders[0].id;
}

const getLatestDaylioExport = async () => {
    const daylioFolderId = await findDaylioFolderId();

    log(`Daylio folder id: ${daylioFolderId}`);

    const daylioExports = await queryDrive(
        childOf(daylioFolderId));

    // logJSON(daylioExports);

    const mostRecent = daylioExports
        .filter(({ name }) =>
            name.includes("daylio_export"))
        .reduce((a, b) =>
            new Date(a.createdTime) > new Date(b.createdTime)
                ? a : b);

    log(`Most recent export: ${mostRecent.name}`);
    log("Downloading...");

    const file = await downloadFile(mostRecent.id);

    return file;
};

const downloadFile = async id => {
    try {
        const { data } = await drive.files.get({
            fileId: id,
            alt: "media"
        });

        return data;
    } catch({ errors }) {
        log("Errors during file donwload:");
        logJSON(errors);
    }
};

const watchFolder = async id => {
    const response = await drive.files.watch({
        fileId: id,
        requestBody: {
            id: "exist-daylio-importer",
            kind: "api#channel",
            address: "https://importer.dobry.me/exist/",
            type: "web_hook",
            payload: true
        }
    });

    logJSON(response);
};

const watchDaylioFolder = async () => {
    const daylioFolderId = await findDaylioFolderId();
    await watchFolder(daylioFolderId);
};

module.exports = { getLatestDaylioExport, watchFolder, watchDaylioFolder };
