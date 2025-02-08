/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var xhub = require('express-x-hub');
// var request = require('request');
var axios = require('axios'); // Import axios for API requests

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));

app.use(xhub({ algorithm: 'sha1', secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var token = process.env.TOKEN || 'token';
var received_updates = [];

app.get('/', function(req, res) {
  console.log(req);
  res.send('<pre>' + JSON.stringify(received_updates, null, 2) + '</pre>');
});

app.get(['/facebook', '/instagram', '/threads'], function(req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == token
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

app.post('/facebook', function(req, res) {
  console.log('Facebook request body:', req.body);

  if (!req.isXHubValid()) {
    console.log('Warning - request header X-Hub-Signature not present or invalid');
    res.sendStatus(401);
    return;
  }

  console.log('request header X-Hub-Signature validated');
  // Process the Facebook updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.post('/instagram', async function (req, res) {
  console.log('Instagram request body:', req.body);

  if (!req.body.entry || !req.body.entry[0].messaging) {
    return res.sendStatus(400); // Return bad request if no messaging data
  }

  let messagingEvent = req.body.entry[0].messaging[0];

  if (messagingEvent.message && messagingEvent.sender) {
    let senderId = messagingEvent.sender.id;
    let messageText = messagingEvent.message.text;

    try {
      await axios.post(
        'https://graph.facebook.com/v19.0/me/messages',
        {
          recipient: { id: senderId },
          message: { text: messageText },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PAGE_ACCESS_TOKEN}`, // Set your Page Access Token in env
          },
        }
      );

      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error.response ? error.response.data : error.message);
    }
  }

  received_updates.unshift(req.body);
  res.sendStatus(200);
});


app.post('/threads', function(req, res) {
  console.log('Threads request body:');
  console.log(req.body);
  // Process the Threads updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.listen();
