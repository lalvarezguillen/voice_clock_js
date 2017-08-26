import test from 'ava'
const moment = require('moment')
const sinon = require('sinon')
const helpers = require('./helpers')
const Request = require('request')
const Axios = require('axios')
const https = require('https')

test('getSourceIP prefers res.ip over xforwardedfor', t => {
    const req = {
        ip: '86.24.2.15',
        headers: {
            'x-forwarded-for': '88.34.12.115'
        }
    }
    const source_ip = helpers.getSourceIP(req)
    t.deepEqual(source_ip, '86.24.2.15')
})

test('getSourceIP disregards private IPs', t => {
    const req = {
        ip: '127.0.0.15',
        headers: {
            'x-forwarded-for': '88.24.2.15'
        }
    }
    const source_ip = helpers.getSourceIP(req)
    t.deepEqual(source_ip, '88.24.2.15')
})

test('localizeCurrTime defaults to UTC if not TZinfo', t => {
    const geolocinfo = {}
    const localized_dt = helpers.localizeCurrTime(geolocinfo)
    t.deepEqual(localized_dt.zoneName(),
                'UTC')
})

test('localizeCurrTime is able to localize time', t => {
    const geolocinfo = {
        timezone: 'America/Caracas'
    }
    const localized_dt = helpers.localizeCurrTime(geolocinfo)
    t.deepEqual(localized_dt.zoneName(),
                '-04')
})

test('mostDetailedLocTime works', t => {
    const test_data = [
        {},
        {city: 'Caracas', country: 'Venezuela'},
        {country: 'Venezuela', timezone: 'America/Caracas'},
        {
            city: 'Caracas',
            country: 'Venezuela',
            timezone: 'America/Caracas'
        },
        {timezone: 'America/Caracas'}
    ]
    const results = test_data.map(helpers.mostDetailedLocTime)
    const expected_results = [
        'Greenwich',
        'Caracas',
        'Venezuela',
        'Caracas',
        'Caracas'
    ]
    t.deepEqual(results, expected_results)
})

test('getTimeAsText inserts hours and minutes correctly', t => {
    const test_dt = moment(new Date(2017, 9, 9, 10, 5))
    const expected = 'It is, ten, five'
    const expected_in_result = helpers.getTimeAsText(test_dt)
                                      .indexOf(expected) >= 0
    t.deepEqual(expected_in_result, true)
})

test('getTimeAsText selects AM/PM properly', t => {
    const test_data = [
        moment(new Date(2017, 7, 9, 7, 15)),
        moment(new Date(2017, 7, 9, 12, 15)),
        moment(new Date(2017, 7, 9, 19, 15)),
    ]
    const time_strings = test_data.map(helpers.getTimeAsText)
    const am_in_string = time_strings.map(x => x.indexOf('AM') >= 0)
    const expected_results = [true, false, false]
    t.deepEqual(am_in_string, expected_results)
})

test('getTimeAsText selects o\'clock accordingly', t => {
    const test_data = [
        moment(new Date(2017, 7, 9, 10, 5)),
        moment(new Date(2017, 7, 9, 10, 0))
    ]
    const time_strings = test_data.map(helpers.getTimeAsText)
    const oclock_in_string = time_strings.map(x => x.indexOf('o\'clock') >= 0)
    const expected_results = [false, true]
    t.deepEqual(oclock_in_string, expected_results)
})

test('getWeatherAsText requires location and condition', t => {
    const meteodatas = [
        // missing location
        {
            current: {
                condition: {
                    text: 'rainy',
                    feelslike_c: 29
                }
            }
        },
        // missing condition
        {
            location: {
                name: 'Caracas'
            }
        }
    ]
    const weather_strings = meteodatas.map(helpers.getWeatherAsText);
    const expected_result = 'We weren\'t able to pinpoint your location'
    weather_strings.map(x => t.deepEqual(x, expected_result))
})

test('getWeatherAsText produces readable weather description', t => {
    const meteodata = {
        location: {
            name: 'Caracas'
        },
        current: {
            condition: {
                text: 'rainy'
            },
            feelslike_c: 29
        }
    }
    const weather_string = helpers.getWeatherAsText(meteodata)
    const expected = 'Currently, the weather in Caracas is rainy. ' +
                     'And the thermal sensation is twenty-nine ' +
                     'degrees Celsius'
    t.deepEqual(expected, weather_string)
})


test('getMeteorologicalData builds url properly', t => {
    const request_get = sinon.stub(Axios, 'get')
                             .resolves({
                                 status: 200,
                                 data: 'some data'
                             })
    helpers.getMetereologicalData('caracas')
    request_get.restore()
    const caracas_in_url = request_get.getCall(0).args[0]
                            .indexOf('caracas') >= 0
    t.deepEqual(caracas_in_url, true)
})

test('geolocIP builds URL properly', t => {
    const request_get = sinon.stub(Axios, 'get')
                             .resolves({
                                 status: 200,
                                 data: 'some data'
                            })
    helpers.geolocIP('127.0.0.1')
    request_get.restore()
    const ip_in_url = request_get.getCall(0).args[0]
                        .indexOf('127.0.0.1') >= 0
    t.deepEqual(ip_in_url, true)
})

test('handleGoogleAudio passses url down to http.get', t => {
    const https_get = sinon.stub(https, 'get')
    helpers.handleGoogleAudio('127.0.0.1')
    https_get.restore()
    const ip_was_arg = https_get.getCall(0).args[0] === '127.0.0.1'
    t.deepEqual(ip_was_arg, true)
})