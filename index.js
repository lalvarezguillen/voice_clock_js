const http = require('http')
const https = require('https')
const moment = require('moment-timezone')
const Request = require('request')
const express = require('express')
const num2word = require('numbers2words')
const googleTTS = require('google-tts-api')

const app = express()
const translator = new num2word('EN_US')

app.get('/', function (req, res) {
    res.send('<p>Simple aplication to test now.sh</p>'
             + '<p>Make a request to <a href="/now">/now</a>'
             + ' to attempt to get current time in your timezone</p>'
             + '<p>If that fails, it will display UTC time</p>')
})

app.get('/now', function (req, res) {
    console.log(req.headers['x-forwarded-for'])
    getLocalizedDatetime(req['headers']['x-forwarded-for'])
        .then(datetime_str => googleTTS(datetime_str, 'en', 1))
        .catch(datetime_str => googleTTS(datetime_str, 'en', 1))
            .then(url => handleGoogleAudio(url, req, res))
})

function getLocalizedDatetime(ip){
    return new Promise((resolve, reject) =>{
        Request.get("http://ip-api.com/json/"+ip, (err, resp, body) =>{
            json_body = JSON.parse(body)
            if(resp.statusCode == 200 && json_body.timezone){
                const now = moment(new Date()).tz('UTC')
                console.log(json_body.timezone)
                const localized_dt = now.clone().tz(json_body.timezone)
                console.log(localized_dt)
                resolve(getTimeAsText(localized_dt, json_body.timezone))
            }
            else {
                const now = moment(new Date()).tz('UTC')
                reject(getTimeAsText(now, null))
            }
        })
    })
}

function handleGoogleAudio (url, user_req, user_resp) {
    console.log(url)
     https.get(url, audio_resp => {
        user_resp.writeHead(200, {
            'cache-control': 'private, no-cache, no-store, must-revalidate',
            'expires': "-1",
            'pragma': "no-cache",
            "content-type": audio_resp.headers['content-type'],
            'content-disposition': 'inline'
        })
        audio_resp.pipe(user_resp) 
    }) 
}

app.listen(3000, function() {
    console.log('Listening on port 3000')
})


function getTimeAsText (datetime_obj, timezone) {
    /*
    @description: Produces a readable time string from a datetime object.

    @arg datetime_obj: {Date} The date object to turn into human-readable
    string

    @return: {str} A human-readable time string
    */
    if (timezone){
        var tz_str = 'in ' + timezone.split('/')[1]
    }
    else {
        var tz_str = 'in Greenwhich'
    }
    
    let hours_str, am_pm, minutes_str
    if(datetime_obj.hours() < 12){
        hours_str = translator.toWords(datetime_obj.hours())
        am_pm = 'AM'
    }
    else if(datetime_obj.hours() == 12){
        hours_str = translator.toWords(datetime_obj.hours())
        am_pm = 'PM'
    }
    else{
        hours_str = translator.toWords(datetime_obj.hours() - 12)
        am_pm = 'PM'
    }

    if(datetime_obj.minutes() == 0){
        minutes_str = 'o\'clock'
    }
    else{
        minutes_str = translator.toWords(datetime_obj.minutes())
    }

    return ['It is', hours_str, minutes_str, am_pm, tz_str].join(', ')
}