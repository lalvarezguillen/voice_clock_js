const express = require('express')
const num2word = require('numbers2words')

const app = express()
const translator = new num2word('EN_US')

app.get('/', function (req, res) {
    res.send('Simple aplication to test now.sh')
})

app.get('/now', function (req, res) {
    const now = new Date()
    res.send(getTimeAsText(now))
})

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