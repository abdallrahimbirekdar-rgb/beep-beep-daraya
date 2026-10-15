package com.souqdaraya.app;

import java.time.Instant;

public class ReminderTimesTest {
    private static void check(String now, String time, String expected) {
        long actual=ReminderTimes.next(Instant.parse(now).toEpochMilli(),time);
        if(actual!=Instant.parse(expected).toEpochMilli())throw new AssertionError(now+" / "+time+" => "+Instant.ofEpochMilli(actual));
    }
    public static void main(String[] args) {
        check("2026-10-15T07:00:00Z","11:00","2026-10-15T08:00:00Z");
        check("2026-10-15T09:00:00Z","11:00","2026-10-16T08:00:00Z");
        check("2026-10-15T08:00:00Z","11:00","2026-10-16T08:00:00Z");
        check("2026-10-15T14:00:00Z","18:00","2026-10-15T15:00:00Z");
        check("2026-12-31T22:30:00Z","00:00","2027-01-01T21:00:00Z");
        for(String invalid:new String[]{null,"24:00","11:60","1:00","11:00:00","xx:xx"}) {
            try {ReminderTimes.next(0,invalid);throw new AssertionError("Accepted "+invalid);}
            catch(IllegalArgumentException expected) { }
        }
        System.out.println("Passed reminder calendar: city time, elapsed slots, midnight, year rollover, invalid inputs.");
    }
}
