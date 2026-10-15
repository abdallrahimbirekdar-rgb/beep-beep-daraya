package com.souqdaraya.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class OfferReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        OfferReminders.receive(context,intent);
    }
}
