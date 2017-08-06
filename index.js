const rpn = require('request-promise-native')
const express = require('express')
const num2word = require('numbers2words')
const googleTTS = require('google-tts-api')

const app = express()
const translator = new num2word('EN_US')

app.get('/', function (req, res) {
    res.send('Simple aplication to test now.sh')
})

app.get('/now', function (req, res) {
    const now = new Date()
    const datetime_str = getTimeAsText(now)
    const req_opts = {
        resolveWithFullResponse: true
    }
    console.log(datetime_str)
    googleTTS(datetime_str, 'en', 1)
        .then(url => rpn.get(url, req_opts))
        .then(audio_res => handleGoogleAudio(audio_res, req, res))
})

function handleGoogleAudio (audio_res, user_req, user_res) {
    console.log(audio_res.body.length)
    console.log(user_res)
    /* user_res.writeHead(200, {
        'content-type': audio_res.headers['content-type'],
        'content-disposition': 'inline',
        'content-length': audio_res.headers['content-length'],
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Expires': '-1',
        'Pragma': 'no-cache',
    }) */
    console.log('about to return response')
    // audio_res.pipe(user_res)
    user_res.send(audio_res.body)
    user_res.end() 
    console.log('response returned')
    return
}

app.listen(3000, function() {
    console.log('Listening on port 3000')
})


function getTimeAsText (datetime_obj) {
    /*
    @description: Produces a readable time string from a datetime object.

    @arg datetime_obj: {Date} The date object to turn into human-readable
    string

    @return: {str} A human-readable time string
    */
    let hours_str, am_pm, minutes_str
    if(datetime_obj.getHours() < 12){
        hours_str = translator.toWords(datetime_obj.getHours())
        am_pm = 'AM'
    }
    else if(datetime_obj.getHours() == 12){
        hours_str = translator.toWords(datetime_obj.getHours())
        am_pm = 'PM'
    }
    else{
        hours_str = translator.toWords(datetime_obj.getHours() - 12)
        am_pm = 'PM'
    }

    if(datetime_obj.getMinutes() == 0){
        minutes_str = 'o\'clock'
    }
    else{
        minutes_str = translator.toWords(datetime_obj.getMinutes())
    }

    return ['It is', hours_str, minutes_str, am_pm].join(' ')
}