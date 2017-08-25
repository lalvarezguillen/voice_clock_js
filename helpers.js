const https = require('https')
const ip = require('ip')
const moment = require('moment-timezone')
const Request = require('request')
const num2word = require('numbers2words')
const Axios = require('axios')
const translator = new num2word('EN_US')
const api_key = 'c8c07d9b9e8b4b569f4212704171108'

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
        Axios.get(`http://ip-api.com/json/${ip}`).then(resp => {
            if (resp.status == 200) {
                resolve(resp.data)
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

    return 'Greenwich'
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
 * Obtains a text description of the weather from the estimated
 * location of IP
 * @param {string} ip The IP where the request originated from
 * @return {promise<string>} A textual description of the local
 * weather
 */
function getLocalWeatherDescription (city) {
    return new Promise((resolve, reject) => {
        getMetereologicalData(city)
            .catch(err => err)
            .then(meteodata => {
                const weather_description = getWeatherAsText(meteodata)
                resolve(weather_description)
            })
            
    })
}

/**
 * Obtains the meteorological data for for a particular location
 * @param {obj} geodata Contains geolocation data, ideally a city name
 * under geodata.city
 * @return {obj} Contains meteorological data.
 */
function getMetereologicalData (city) {
    return new Promise((resolve, reject) => {
        // This is here for developing purpose. If the city is not provided
        // this function should return null or smething like that
        const url = `http://api.apixu.com/v1/current.json?key=${api_key}&q=${city}`
        console.log(url)
        Request.get(url, (err, resp, body) => {
            if (resp && resp.statusCode == 200) {
                const body_obj = JSON.parse(body)
                resolve(body_obj)
            }
            else {
                reject('Unable to gather meteorological data')
            }
        })
    })
}

/**
 * Creates a description of the current weather from an object that contains
 * meteorological data
 */
function getWeatherAsText(meteodata) {
    const there_is_location = meteodata.location && meteodata.location.name
    const there_is_condition = meteodata.current && meteodata.current.condition
    if(there_is_location && there_is_condition) {
        const loc_str = `Currently, the weather in ${meteodata.location.name} is `
        const cond_str = `${meteodata.current.condition.text}. `
        const temp_str = 'And the thermal sensation is ' +
                         `${translator.toWords(parseInt(meteodata.current.feelslike_c))} ` +
                         'degrees Celsius'
        return loc_str + cond_str + temp_str
    }
    return 'We weren\'t able to pinpoint your location'
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
    @param {moment.Moment} datetime_obj The date object to turn into human-readable
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
module.exports.getLocalWeatherDescription = getLocalWeatherDescription
module.exports.getWeatherAsText = getWeatherAsText
module.exports.getMetereologicalData = getMetereologicalData