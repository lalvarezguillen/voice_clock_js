function getTimeAsText (datetime_obj){
    /*
    @description: Produces a readable time string from a datetime object.

    @arg datetime_obj: {Date} The date object to turn into human-readable
    string

    @return: {str} A human-readable time string
    */
    let base_12_hours, am_pm, minutes_string
    if(datetime_obj.getHours() < 12){
        base_12_hours = datetime_obj.getHours()
        am_pm = 'AM'
    }
    else if(datetime_obj.getHours() == 12){
        base_12_hours = datetime_obj.getHours()
        am_pm = 'PM'
    }
    else{
        base_12_hours = datetime_obj.getHours() - 12
        am_pm = 'PM'
    }

    if(datetime_obj.getMinutes() == 0){
        minutes_string = 'o\'clock'
    }
    else{
        minutes_string = datetime_obj.getMinutes()
    }

    return ['It is', base_12_hours, minutes_string, am_pm].join(' ')
}