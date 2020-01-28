const
    fs = require("fs"),

    { log, logJSON } = require("./util"),

    nconf = require("nconf"),
    { google } = require("googleapis");

const creds = JSON.parse(fs.readFileSync("./exist-daylio-importer-63ecb1859a91.json", "UTF-8"));

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

// const credentials = fs.readFileSync('credentials.json', "UTF-8");

const authorize = () => {
    logJSON(creds)

    const client = google.auth.fromJSON(creds);
    client.scopes = ["https://www.googleapis.com/auth/drive.readonly"];

    return client;
};

const folderMimeType = "application/vnd.google-apps.folder";

const daylioQuery = `mimeType='${folderMimeType}' and name='Daylio'`;

const drive = google.drive({
    version: 'v3',
    auth: authorize()
});

const queryFiles = (query, callback) =>
    drive.files.list({
        q: query,
        pageSize: 10,
        fields: 'nextPageToken, files(id, name)',
    }, callback);

const listFiles = () => {
    queryFiles(daylioQuery, (err, res) => {
        if(err) {
            log('The API returned an error: ' + err);
            return;
        }

        const files = res.data.files;

        //TODO: log debug
        // logJSON(res);

        if(files.length) {
            log('Files:');
            files.map(({ name, id }) => {
                log(`${name} (${id})`);

                queryFiles(`'${id} in parents'`, (err, res) => {
                    if(err) {
                        log('The API returned an error: ' + err);
                        return;
                    }

                    const files = res.data.files;

                    //TODO: log debug
                    // logJSON(res);

                    if(files.length) {
                        log('Files:');
                        files.map(({ name, id }) =>
                            log(`${name} (${id})`));
                    } else
                        log('No files found.');
                });
            });

        } else
            log('No files found.');
    });
};

module.exports = { listFiles };
