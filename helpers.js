const https = require('https')
const ip = require('ip')
const moment = require('moment-timezone')
const Request = require('request')
const num2word = require('numbers2words')

/**
 * Given a request obj tries to get the source IP
 * It looks at req.ip and then at the x-forwarded-for header
 * until it gets a proper, non-private IP
 * @param {express.Request} req An object representing the HTTP
 * request received
 * @return {string} The alleged source IP
 */
function getSourceIP(req){
    console.log(`ip: ${req.ip}`)
    console.log(`x-forwarded-for: ${req.headers['x-forwarded-for']}`)
    if(req.ip && !ip.isPrivate(req.ip)){
        return req.ip
    }
    const xforw = req.headers['x-forwarded-for']
    if(xforw && !ip.isPrivate(xforw)){
        return xforw
    }
    /* Extend with more exotic headers */
    /* Come up with a reasonable fallback */
}


/**
 * Given an IP, tries to geolocalize it, potentially obtaining timezone,
 * country and city
 * @param {string} ip The IP to geolocalize
 * @return {Promise<object>}
 */
function geolocIP (ip) {
    // we could validate the IP here
    return new Promise((resolve, reject) => {
        Request.get(`http://ip-api.com/json/${ip}`, (err, resp, body) => {
            if (resp.statusCode == 200) {
                const json_body = JSON.parse(body)
                resolve(json_body)
            }
            else {
                reject('There was an error while geolocalizing the IP')
            }
        })
    })
}


/**
 * Produces a datetime object of the current time, localized according
 * to some geoloc info
 * @param {object} geoloc_info Contains geoloc info, hopefully time zone,
 * country and city
 * @return {moment.Moment}
 */
function localizeCurrTime (geoloc_info) {
    const now = moment(new Date()).tz('UTC')
    if(geoloc_info.timezone){
        console.log(`timezone: ${geoloc_info.timezone}`)
        const localized_dt = now.clone().tz(geoloc_info.timezone)
        return localized_dt
    }
        return now
}


/**
 * Given an object containing geoloc info (tz, country, city hopefully)
 * obtains the name of the inermost geolocation entity available that
 * would be relevant to localize time.
 * If nothing is found, it defaults to 'Greenwhich'
 * @param {object} geoloc_info Contains geoloc info, hopefully time zone,
 * country and city
 * @return {str} The name of the innermost geographical entity encountered
 */
function mostDetailedLocTime(geoloc_info){
    if(geoloc_info.city){
        return geoloc_info.city
    }
    
    if(geoloc_info.country){
        return geoloc_info.country
    }

    if (geoloc_info.timezone) {
        return geoloc_info.timezone.split('/')[1]
    }

    return 'Greenwhich'
}

/**
 * Given an IP tries to geolocalize it and produce a time string
 * for the corresponding timezone. Failing that produces a time string
 * for Greenwich.
 * @param {string} ip The IP to geolocalize
 * @return {Promise<string>}
 */
function getLocalizedTimeString(ip){
    return new Promise((resolve, reject) => {
        geolocIP(ip)
            .then(geodata => {
                const localized_dt = localizeCurrTime(geodata)
                const location = mostDetailedLocTime(geodata)
                const time_str = getTimeAsText(localized_dt, location)
                resolve(time_str)
            })
            .catch(err => reject(err))
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

module.exports.getSourceIP = getSourceIP
module.exports.geolocIP = geolocIP
module.exports.localizeCurrTime = localizeCurrTime
module.exports.mostDetailedLocTime = mostDetailedLocTime
module.exports.getLocalizedTimeString = getLocalizedTimeString
module.exports.handleGoogleAudio = handleGoogleAudio
module.exports.getTimeAsText = getTimeAsText