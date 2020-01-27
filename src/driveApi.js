const
    fs = require("fs"),
    readline = require("readline"),

    { log, logJSON } = require("./util"),

    nconf = require("nconf"),
    { google } = require("googleapis");

nconf.file("google-cred", "./exist-daylio-importer-63ecb1859a91.json");

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

const TOKEN_PATH = 'token.json';

const credentials = fs.readFileSync('credentials.json', "UTF-8");

authorize(JSON.parse(credentials), listFiles);

const authorize = (credentials, callback) => {
    const { client_secret, client_id, redirect_uris }
        = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    //TODO
};


function listFiles(auth) {
  const drive = google.drive({version: 'v3', auth});
  drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = res.data.files;
    if (files.length) {
      console.log('Files:');
      files.map((file) => {
        console.log(`${file.name} (${file.id})`);
      });
    } else {
      console.log('No files found.');
    }
  });
}
