package com.souqdaraya.app;

import java.util.Calendar;
import java.util.TimeZone;

/** Calendar-based daily times: follows city civil time, not a fixed 24-hour interval. */
final class ReminderTimes {
    static final String ZONE = "Asia/Damascus";
    static long next(long now, String time) {
        if (time == null || !time.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]"))
            throw new IllegalArgumentException("Invalid reminder time");
        Calendar next = Calendar.getInstance(TimeZone.getTimeZone(ZONE));
        next.setTimeInMillis(now);
        next.set(Calendar.HOUR_OF_DAY, Integer.parseInt(time.substring(0,2)));
        next.set(Calendar.MINUTE, Integer.parseInt(time.substring(3,5)));
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= now) next.add(Calendar.DATE, 1);
        return next.getTimeInMillis();
    }
}
