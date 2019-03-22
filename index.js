import { config } from 'dotenv';
import express from 'express';
import request from 'request';
import cors from 'cors';
import querystring from 'querystring';
import cookieParser from 'cookie-parser';

config({ path: "./.env" });

// Node environment variables

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PORT = process.env.PORT;
const environment = process.env.NODE_ENV
const redirect_uri = 'http://localhost:3000/authorize';

// END 

// Middleware for express server

var app = express();
app.use(cors())
  .use(cookieParser());

// END

// SPOTIFY Web services setup
/***
 * Making use of Authorizatio Flow:
 * 1) Requets authorization to access data
 * 2) Request access and refres token
 * 3) use token in requests to Web API and so on
 */
app.get('/authorize', (req, res) => {
  var scopes = 'user-read-email user-library-modify user-library-read playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing';

  res.redirect('https://accounts.spotify.com/authorize?' + querystring.stringify({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: scopes,
    redirect_uri: redirect_uri
  }));
});

app.get('/token', (req, res) => {
  // Request refresh and access token
  var code = req.query.code || null;
  if (code !== null) {
    var accessOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': `Basic ${new Buffer(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      },
      json: true
    };

    request.post(accessOptions, (error, response, body) => {
      if (!error && (response.statusCode === 200)) {
        var {
          access_token,
          refresh_token
        } = body;

        res.status(200).send({
          access_token,
          refresh_token
        });
      } else {
        console.log(body);
        res.status(500).send('error were cause by spotify web services');
      }
    });
  } else {
    res.status(404).send('No code received');
  }
});



app.get('/refreshtoken', (req, res) => {
  // Get refresh token to request access
  var { refresh_token } = req.query;

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': `Basic ${new Buffer(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && (response.statusCode === 200)) {
      var {
        access_token
      } = body;

      res.status(200).send({
        access_token
      });
    } else {
      res.status(500).send(error);
    }
  });
});

// END SPOTIFY Web services setup


/**
 * Checkparams and perform request to spotify services
 * @param {Object} request options 
 * @
 */

app.get('/call_spotify_services', (req, res) => {
  var { access_token, refresh_token, method, endpoint, params } = req.query;
  
  if (access_token) {
    let url = params ? `https://api.spotify.com${endpoint}?${querystring.stringify(JSON.parse(params))}` : `https://api.spotify.com${endpoint}`;
    var requestOptions = {
      url: url,
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      json: true
    };
    request[method](requestOptions, (error, response, body) => {
      if (!error && response && (response.statusCode === 200)) {
        //  Everything cool
        res.status(200).send({...body});
      } else if (response && response.statusCode === 401) {
        //  Refresh token
        var authOptions = {
          url: 'https://accounts.spotify.com/api/token',
          headers: {
            'Authorization': `Basic ${new Buffer(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
          },
          form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
          },
          json: true
        };

        request.post(authOptions, (error_token, response_token, body_token) => {
          if (!error_token && (response_token.statusCode === 200)) {
            access_token = body_token.access_token;
            
            // Overwriting headers with new access token
            requestOptions.headers = {
              'Authorization': `Bearer ${access_token}`
            }
            // Making request
            request[method](requestOptions, (error_new, response_new, body_new) => {
              if (!error_new && (response_new.statusCode === 200)) {
                //  Everything cool
                res.status(200).send({
                  ...body_new,
                  access_token: access_token
                });
              } else {
                res.status(500).send(error_new); // Very unhandled error.
              }
            });
          } else {
            res.status(500).send({...body});
          }
        });
      } else {
        res.status(500).send({...body});
      }
    });
  } else {
    res.status(500).send('No access_token provided');
  }
});


/**
 * Recomentdation engine
 */

app.listen(PORT || 8080, () => {
  console.log(`Listening on port ${PORT || 8080}`)
})