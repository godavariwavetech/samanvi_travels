// auth.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
// const credentials = require('./credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
 console.log(path.resolve(__dirname, '../utils/credentials.json'));
function authorize() {
    // console.log(credentials)
    // console.log(path.resolve(__dirname, 'credentials.json'));
const credentialsPath = path.join(__dirname, 'credentials.json');
console.log(credentialsPath,'credentialsPath')
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if token.json exists; if not, start authorization flow
  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    return Promise.resolve(oAuth2Client);
  } else {
    return getAccessToken(oAuth2Client);
  }
}

// Function to get and save the access token asynchronously
function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this URL:', authUrl);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    readline.question('Enter the code from that page here: ', (code) => {
      readline.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error retrieving access token', err);
          return reject(err);
        }
        oAuth2Client.setCredentials(token);

        // Save token to a file
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) {
            console.error('Error saving token:', err);
            return reject(err);
          }
          console.log('Token stored to', TOKEN_PATH);
          resolve(oAuth2Client); // Return the authorized client
        });
      });
    });
  });
}

module.exports = { authorize };
