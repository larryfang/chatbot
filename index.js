'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const api = require('./api');
const token = "EAADAcQndBogBADO4ohIPHjjrglohx1aWEVtaJtTEGFebKIljxJDUxE9kCSCrmkNusof3jjLaxkIIW1O6tEpHS2PWtceyg4GVVV0ZBOQQyIf8gwoYXrcYvUwKHSCzDxnMRMPagXm1uII7b0ccCwvMZA6yJMyPsttKR69vUZASQZDZD"

const app = express();

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
        let event = messaging_events[i];
        let sender = event.sender.id;
        db[sender] = db[sender] || {};
        let senderState = db[sender];

        if (event.message && event.message.quick_reply) {
            let { payload } = event.message.quick_reply;

            if (payload === 'parcel') {
                senderState.action = 'sendparcel';
                sendText(sender, 'please provide the post code where you send your parcel from');
            } else if (payload === 'faq') {
                senderState.action = 'faq';
                sendText(sender, "please ask me any questions in relation to mypost business");
            } else if (payload === 'postOffice') {
                senderState.action = 'postOffice';
                sendQuickReply(sender, getNearestPostOfficesQuickReplies());
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
        } else if(event.message && event.message.attachments) {
            const attachment = event.message.attachments[0];

            if(attachment.type === 'location') {
                const { lat, long } = attachment.payload.coordinates;

                api.getNearPostOffices(lat, long)
                  .then((result) => {
                    sendList(sender, getPostOfficesList(result.data, `${lat},${long}`))
                  });
            }
        }
    }
    res.sendStatus(200)

});

function displayPackagingOptions() {
    return api.getPackagingTypes();
}

app.get('/order', (req, res) => {
    const state = db[req.query.senderId];
    res.redirect(`https://ptest.npe.auspost.com.au/mypost-business/simple-send/?to=${state.to}&from=${state.from}&packagingType=${state.packagingType}&develiveryOption=${query.deliveryOption}`);
});

function sendText(sender, message) {

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
    return {
        text: "MyPost Business offers the following services in Messenger:",
        quick_replies: [
            {
                "content_type": "text",
                "title": "Send a Parcel",
                "payload": "parcel"
            },
            {
                'content_type': 'text',
                'title': 'Find the nearest P.O.',
                'payload': 'postOffice'
            },
            {
                "content_type": "text",
                "title": "FAQ",
                "payload": "faq"
            }
        ]
    };
}

function getPackagingQuickReplies() {
    return {
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
                "payload": displayPackagingOptions()[1].id
            }
        ]
    };
}

function getNearestPostOfficesQuickReplies() {
    return {
        text: "Please share your location:",
        quick_replies: [
            {
                'content_type': 'location'
            }
        ]
    }
}

function getDeliveryOptionsList() {
    //TODO: Set DOMREG and DOMEXP dynamiccally.
    return [
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
    ];
}

function getPostOfficesList(postOffices, currentUserLocation) {
    return postOffices.map((postOffice) => ({
        title: postOffice.name,
        subtitle: `${postOffice.address1} ${postOffice.address2} ${postOffice.address3}`,
        default_action: {
            type: 'web_url',
            url: `https://www.google.com/maps/dir/${currentUserLocation}/${postOffice.latitude},${postOffice.longitude}`,
            'webview_height_ratio': 'tall',
        }
    })).splice(0, 3);
}

function sendList(sender, elements) {
    const message = {
        attachment: {
            type: 'template',
            payload: {
                template_type: 'list',
                'top_element_style': 'compact',
                elements
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
