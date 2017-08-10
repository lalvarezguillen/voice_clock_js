import test from 'ava'
const moment = require('moment')
const helpers = require('./helpers')

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