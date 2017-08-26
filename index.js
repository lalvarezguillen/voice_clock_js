const ip = require('ip')
const express = require('express')
const googleTTS = require('google-tts-api')
const helpers = require('./helpers')

const app = express()
const voice_clock_env = process.env.VOICE_CLOCK_ENV
console.log(voice_clock_env)


/**
 * Handles GET requests to the root endpoint.
 * Serves some info about this API
 * @function
 * @name get/
 */
app.get('/', function (req, res) {
    const root_info = {
        version: 0.1,
        desc: 'Simple API to test out now.sh',
        links: [
            {
                url: '/now',
                method: 'GET',
                desc: 'Attempts to report the current time in the user\'s location. ' +
                      'Failing that it reports current UTC time'
            },
            {
                url: '/weather',
                method: 'GET',
                desc: 'Gives the user a current brief on the weather at his/her location'
            }
        ]
    }
    res.send(root_info)
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

app.get('/weather/:city*?', function (req, res) {
    if (!req.params.city) {
        const source_ip = helpers.getSourceIP(req)
        helpers.geolocIP(source_ip)
        .then(geoloc_info => {
            if (!geoloc_info.city) {
                if (voice_clock_env === 'dev') {
                    geoloc_info.city = 'Caracas'
                }
                else {
                    res.send({error: 'Unable to get your location'})
                    return
                }
            }
            console.log(`voice_clock_env: ${voice_clock_env}`)
            console.log(`city: ${geoloc_info.city}`)
            helpers.getLocalWeatherDescription(geoloc_info.city)
            .catch(err => {res.send('Unable to get data for the requested city'); return; })
            .then(weather_desc => googleTTS(weather_desc, 'en', 1))
            .catch(err => res.send(err))
            .then(url => helpers.handleGoogleAudio(url, req, res))
        })
        
    }
    else{
        helpers.getLocalWeatherDescription(req.params.city)
        .then(weather_desc => googleTTS(weather_desc, 'en', 1))
        .catch(err => res.send(err))
        .then(url => helpers.handleGoogleAudio(url, req, res))
    }
})


app.listen(3000, function() {
    console.log('Listening on port 3000')
})
