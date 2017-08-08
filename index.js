const https = require('https')
const ip = require('ip')
const moment = require('moment-timezone')
const Request = require('request')
const express = require('express')
const num2word = require('numbers2words')
const googleTTS = require('google-tts-api')

const app = express()
const translator = new num2word('EN_US')


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
    /* Eventually look into validating if req.ip is a valid public IP
    before using x-forwarded-for */
    const source_ip = getSourceIp(req)
    getLocalizedTimeString(source_ip)
        .then(datetime_str => googleTTS(datetime_str, 'en', 1))
        .catch(err => res.send(err))
        .then(url => handleGoogleAudio(url, req, res))
})


/**
 * Given a request obj tries to get the source IP
 * It looks at req.ip and then at the x-forwarded-for header
 * until it gets a proper, non-private IP
 * @param {express.Request} req An object representing the HTTP
 * request received
 * @return {string} The alleged source IP
 */
function getSourceIp(req){
    console.log(`ip: ${req.ip}`)
    console.log(`x-forwarded-for: ${req.headers['x-forwarded-for']}`)
    if(req.ip && !ip.isPrivate(req.ip)){
        return req.ip
    }
    const xforw = req.headers['x-forwarded-for']
    if(xforw && !isPrivate(xforw)){
        return xforw
    }
    /* Extend with more exotic headers */
    /* Come up with a reasonable fallback */
}


/**
 * Given an IP tries to geolocalize it and produce a time string
 * for the corresponding timezone. Failing that produces a time string
 * for Greenwich.
 * @param {string} ip The IP to geolocalize
 * @return {Promise<string>}
 */
function getLocalizedTimeString(ip){
    return new Promise((resolve, reject) =>{
        Request.get(`http://ip-api.com/json/${ip}`, (err, resp, body) =>{
            json_body = JSON.parse(body)
            if(resp.statusCode == 200){
                if(json_body.timezone){
                    console.log(`timezone: ${json_body.timezone}`)
                    const now = moment(new Date()).tz('UTC')
                    const localized_dt = now.clone().tz(json_body.timezone)
                    let location
                    if(json_body.city){
                        location = json_body.city
                    }
                    else if(json_body.country){
                        location = json_body.country
                    }
                    else {
                        location = json_body.timezone.split('/')[1]
                    }
                    resolve(getTimeAsText(localized_dt, location))
                }
                else{
                    const now = moment(new Date()).tz('UTC')
                    resolve(getTimeAsText(now, 'Greenwich'))
                }
            }
            else{
                reject('We encountered an error while processing your request')
            }
        })
    })
}


/**
 * Requests Google's Text2Speech API to produce the audio of a datetime string.
 * @param {string} url The URL of Google's TTS to call
 * @param {express.Request} user_req The expressjs request object
 * @param {express.Response} user_resp The expressjs response object
 */
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


/**
    Produces a readable time string from a datetime object.
    @param {Date} datetime_obj The date object to turn into human-readable
    string
    @param {string} location A string describing the user's location.
    @return {string} A human-readable time string
*/
function getTimeAsText (datetime_obj, location) {
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

    return ['It is', hours_str, minutes_str, am_pm, 'in ' + location].join(', ')
}