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
            sendText(sender, "Text echo:" + text.substring(0,100))
        }
    }
    res.sendStatus(200)

})

const token = "EAADAcQndBogBAIzs4Wnkn4D1duPED7ZAyBh5htLaKUnxb4Rj5D8OZCf7brvDzEQra27bzgELvnWZBCSuqSSHxtgGB22UTf19OimRrtehv5WowZAPVHJ2SA8jR2kPlkgTEQCXzuSVl0ZCuUoH0LaxBwvgoflFgpA8BnNZCyZBwkgKAZDZD"
function sendText(sender, text) {
    // let messageData = {attachment: {
    //         type: "image",
    //         payload: {
    //             url: "https://auspost.com.au/mypost-business/assets/mypost-business-app/images/mypost-business-logo.svg"
    //         }
    //     }
    // }
    let messageData = {
        attachment: {
            type: 'template',
            payload: {
                template_type: 'generic',
                elements: [
                    {
                        title: '24th Street',
                        'subtitle': '43 mins, 9 cars. 58 mins, 9 cars. 73 mins, 9 cars.'
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
    // let messageData = { text: text};
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
