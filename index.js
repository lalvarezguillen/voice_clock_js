const https = require('https')
const ip = require('ip')
const moment = require('moment-timezone')
const Request = require('request')
const express = require('express')
const num2word = require('numbers2words')
const googleTTS = require('google-tts-api')
const helpers = require('./helpers')

const app = express()
console.log(helpers)


/**
 * Handles GET requests to the root endpoint.
 * Serves some info about this API
 * @function
 * @name get/
 */
app.get('/', function (req, res) {
    res.send('<p>Simple aplication to test now.sh</p>'
             + '<p>Make a request to <a href="/now">/now</a>'
             + ' to attempt to get current time in your timezone</p>'
             + '<p>If that fails, it will report UTC time</p>')
})


/**
 * Handles GET requests to /now.
 * Reads to the user the current time in his/her timezone.
 * @function
 * @name get/now
 */
app.get('/now', function (req, res) {
    const source_ip = helpers.getSourceIP(req)
    helpers.getLocalizedTimeString(source_ip)
        .then(datetime_str => googleTTS(datetime_str, 'en', 1))
        .catch(err => res.send(err))
        .then(url => helpers.handleGoogleAudio(url, req, res))
})


app.listen(3000, function() {
    console.log('Listening on port 3000')
})
