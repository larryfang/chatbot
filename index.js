'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const api = require('./api');

const app = express();

var state = {step: "welcome"};
let db = {};

app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', function (req, res) {
    res.send("Hi I'm a chatbot");
});

app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'blondibytes') {
        res.send(req.query['hub.challenge'])
    } else {
        res.send("Wrong token");
    }
});

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = messaging_events[i]
        let sender = event.sender.id;
        db[sender] = db[sender] || {};
        let senderState = db[sender];

        if (event.message && event.message.quick_reply) {
            if (event.message.quick_reply.payload === 'parcel') {
                senderState.action = 'sendparcel';
                sendText(sender, 'please provide the post code where you send your parcel from');
            } else if (event.message.quick_reply.payload === 'faq') {
                senderState.action = 'faq';
                sendText(sender, "please ask me any questions in relation to mypost business");
            }
        } else if (event.message && event.message.text) {
            let text = event.message.text;
            if (text.toLowerCase() === 'hi') {
                senderState.step = 'starting';
                sendQuickReply(sender, getActionQuickReplies());
            } else if (senderState.action === 'sendparcel') {
                let postcode = parseInt(text);

                if(senderState.step === 'starting') {
                    if (postcode) {
                        api.lookupPostcode(postcode).then(function (data) {
                            senderState.step = 'from';
                            senderState.from = data.postcode;
                            sendText(sender, 'Please provide your postcode of the recipient of your parcel')
                        });
                    } else {
                        sendText(sender, 'please provide the post code in the right format');
                    }
                } else if (senderState.step === 'from') {
                    if (postcode) {
                        api.lookupPostcode(postcode).then(function (data) {
                            senderState.step = 'to';
                            senderState.to = data.postcode;
                            sendQuickReply(sender, getPackagingQuickReplies());
                        });
                    } else {
                        sendText(sender, 'please provide the post code in the right format');
                    }
                }
            }
        }
    }
    res.sendStatus(200)

});

function displayPackagingOptions() {
    return api.getPackagingTypes();
}

app.get('/order', (req, res) => {
    //TODO: encode base64 order + redirect to simplesend
});

const token = "EAADAcQndBogBADO4ohIPHjjrglohx1aWEVtaJtTEGFebKIljxJDUxE9kCSCrmkNusof3jjLaxkIIW1O6tEpHS2PWtceyg4GVVV0ZBOQQyIf8gwoYXrcYvUwKHSCzDxnMRMPagXm1uII7b0ccCwvMZA6yJMyPsttKR69vUZASQZDZD"
function sendText(sender, text) {

    let messageData = {text: text};
    console.log(messageData);
    if (text.indexOf('template') > -1) {
        messageData = {
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'generic',
                    elements: [
                        {
                            title: '24th Street',
                            'subtitle': '43 mins, 9 cars. 58 mins, 9 cars. 73 mins, 9 cars.',
                            'buttons': [{
                                'type': 'web_url',
                                'url': 'http://www.google.com/?q=' + text,
                                'title': 'Station Information'
                            }, {
                                'type': 'postback',
                                'title': 'Departures',
                                'payload': 'departures ' + text,
                            }, {
                                'type': 'web_url',
                                'url': 'http://auspost.com.au/',
                                'title': 'Directions'
                            }]
                        },
                        {
                            title: 'Daly City',
                            'subtitle': '43 mins, 9 cars. 58 mins, 9 cars. 73 mins, 9 cars. 1 min, 9 cars. 4 mins, 9 cars.'
                        },
                        {
                            title: 'Millbrae',
                            'subtitle': '8 mins, 4 cars. 23 mins, 4 cars. 38 mins, 4 cars. 13 mins, 5 cars.'
                        }
                    ]
                }
            }
        };
    }
    axios({
        url: "https://graph.facebook.com/v2.6/me/messages",
        params: {access_token: token},
        method: "POST",
        data: {
            recipient: {id: sender},
            message: messageData
        }
    });
}

function sendQuickReply(sender, quickReplies) {

    axios({
        url: "https://graph.facebook.com/v2.6/me/messages",
        params: {access_token: token},
        method: "POST",
        data: {
            recipient: {id: sender},
            message: quickReplies
        }
    })
}

function getActionQuickReplies() {
    let messageData = {
        text: "MyPost Business offers the following services in Messenger:",
        quick_replies: [
            {
                "content_type": "text",
                "title": "Send a Parcel",
                "payload": "parcel"
            },
            {
                "content_type": "text",
                "title": "FAQ",
                "payload": "faq"
            }
        ]
    };
    return messageData;
}

function getPackagingQuickReplies() {
    console.log()
    let messageData = {
        text: "Please select your packaging options:",
        quick_replies: [
            {
                "content_type": "text",
                "title": displayPackagingOptions()[0].label,
                "payload": displayPackagingOptions()[0].id
            },
            {
                "content_type": "text",
                "title": displayPackagingOptions()[1].label,
                "payload": displayPackagingOptions()[0].id
            }
        ]
    };
    return messageData;
}

function sendList(sender) {

    //TODO: Set DOMREG and DOMEXP dynamiccally.
    const message = {
        attachment: {
            type: 'template',
            payload: {
                template_type: 'list',
                'top_element_style': 'compact',
                'elements': [
                    {
                        'title': 'Parcel Post',
                        'image_url': 'https://00d2a94c.ngrok.io/assets/parcel.png',
                        'subtitle': 'Standard parcel post',
                        'buttons': [
                            {
                                'title': 'Use parcel post',
                                'type': 'web_url',
                                'url': `https://00d2a94c.ngrok.io/order?senderId=${sender}&deliveryOption=DOMREG`,
                                'webview_height_ratio': 'full',
                            }
                        ]
                    },
                    {
                        'title': 'Express Post',
                        'image_url': 'https://00d2a94c.ngrok.io/assets/express.png',
                        'subtitle': 'Express post',
                        'buttons': [
                            {
                                'title': 'Use express post',
                                'type': 'web_url',
                                'url': `https://00d2a94c.ngrok.io/order?senderId=${sender}&deliveryOption=DOMEXP`,
                                'webview_height_ratio': 'full',
                            }
                        ]
                    }
                ]
            }
        }
    };

    axios({
        url: "https://graph.facebook.com/v2.6/me/messages",
        params: {access_token: token},
        method: "POST",
        data: {
            recipient: {id: sender},
            message
        }
    });
}


app.listen(app.get('port'), function () {
    console.log("Running: port", app.get('port'));
});
