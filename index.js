'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const app = express();
app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json());


app.get('/', function (req, res) {
    res.send("Hi I'm a chatbot")

})

app.get('/webhook/', function(req,res) {
    
    if (req.query['hub.verify_token'] === 'blondibytes' ) {
        res.send(req.query['hub.challenge'])
    }
    res.send("Wrong token");
})

app.post('/webhook/', function(req,res) {
    let messaging_events =  req.body.entry[0].messaging;
    for (let i=0; i < messaging_events.length; i++) {
        let event = messaging_events[i]
        let sender = event.sender.id;
        if(event.message && event.message.text) {
            let text = event.message.text
            sendText(sender, text)
        } else if (event.message && event.message.attachments[0].type === 'image' ) {
            sendImage(sender, event.message.attachments[0].payload.url)
        }    else if (event.postback && event.postback.payload) {
            if (event.postback.payload.indexOf('departures') > -1) {
                sendText(sender, event.postback.payload);
            }
        }
    }
    res.sendStatus(200)

})

function sendImage(sender, imageUrl) {
    let messageData = {attachment: {
            type: "image",
            payload: {
                url: "https://auspost.com.au/content/dam/auspost_corp/home/enrique/photo-selling-online.jpg.auspostimage.550*0.default.low.jpg"
            }
        }
    }

    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: {access_token: token} ,
        method: "POST",
        json: {
            recipient: {id: sender},
            message: messageData
        }
    })
}

// {
//     "setting_type": "call_to_actions",
//     "thread_state": "new_thread",
//     "call_to_actions":[{
//     "message":{
//         "text":"Hello! This is a Messenger bot!"
//     }
// }]
// }
const token = "EAADAcQndBogBADO4ohIPHjjrglohx1aWEVtaJtTEGFebKIljxJDUxE9kCSCrmkNusof3jjLaxkIIW1O6tEpHS2PWtceyg4GVVV0ZBOQQyIf8gwoYXrcYvUwKHSCzDxnMRMPagXm1uII7b0ccCwvMZA6yJMyPsttKR69vUZASQZDZD"
function sendText(sender, text) {
    // let messageData = {attachment: {
    //         type: "image",
    //         payload: {
    //             url: "https://auspost.com.au/mypost-business/assets/mypost-business-app/images/mypost-business-logo.svg"
    //         }
    //     }
    // }
    let messageData = { text: text};

    if (text.indexOf('template') > -1) {
        messageData = {
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'generic',
                    elements: [
                        {
                            title: '24th Street',
                            'subtitle': '43 mins, 9 cars. 58 mins, 9 cars. 73 mins, 9 cars.' ,
                            'buttons': [{
                                'type': 'web_url',
                                'url': 'http://www.google.com/?q=' + text ,
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
    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: {access_token: token} ,
        method: "POST",
        json: {
            recipient: {id: sender},
            message: messageData
        }
    })
    console.log()
}

app.listen(app.get('port'), function () {
    console.log("Running: port")
}
)
