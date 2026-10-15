package com.souqdaraya.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;

/** Local reminders only. No push token, tracking SDK, network worker or exact alarm permission. */
final class OfferReminders {
    static final int PERMISSION_REQUEST = 41;
    static final String ACTION = "com.souqdaraya.app.OFFER_REMINDER";
    private static final String CHANNEL = "daily_offers_v1";
    private static final int MAX = 6;
    private static final long CONFIG_LIFETIME = 7L * 24 * 60 * 60 * 1000;
    private static final long MAX_DELAY = 2L * 60 * 60 * 1000;

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("daraya_offer_reminders", Context.MODE_PRIVATE);
    }
    private static void channel(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL,"تذكير بعروض اليوم",NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("شاهد عروض اليوم حسب الأوقات التي تحددها إدارة السوق");
            c.getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }
    private static boolean canNotify(Context c) {
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager manager = c.getSystemService(NotificationManager.class);
        if (!manager.areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = manager.getNotificationChannel(CHANNEL);
            if (ch != null && ch.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        }
        return true;
    }
    private static PendingIntent alarm(Context c, int slot, long due, boolean create) {
        Intent intent = new Intent(c,OfferReminderReceiver.class).setAction(ACTION).putExtra("slot",slot).putExtra("due",due);
        int flags = PendingIntent.FLAG_IMMUTABLE | (create ? PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_NO_CREATE);
        return PendingIntent.getBroadcast(c,600 + slot,intent,flags);
    }
    private static void cancel(Context c) {
        prefs(c).edit().remove("scheduled_signature").apply();
        AlarmManager manager = c.getSystemService(AlarmManager.class);
        for (int slot=0;slot<MAX;slot++) {
            PendingIntent pending = alarm(c,slot,0,false);
            if (pending != null) { manager.cancel(pending); pending.cancel(); }
        }
        c.getSystemService(NotificationManager.class).cancel(610);
    }
    static boolean applyConfig(Context c, JSONObject body) {
        // Accept settings only from the app's trusted, main-frame web message listener.
        try {
            JSONObject config=body.getJSONObject("config");
            if (!ReminderTimes.ZONE.equals(config.getString("timezone"))) return false;
            boolean active=config.getBoolean("enabled");
            JSONArray raw=config.getJSONArray("times"),times=new JSONArray();
            if (raw.length()>MAX || (active && raw.length()==0)) return false;
            java.util.Set<String> unique=new java.util.HashSet<>();
            for(int i=0;i<raw.length();i++) {
                String time=raw.getString(i);
                ReminderTimes.next(System.currentTimeMillis(),time);
                if(!unique.add(time))return false;
                times.put(time);
            }
            prefs(c).edit().putBoolean("configured",true).putBoolean("active",active)
                .putString("times",times.toString()).putLong("synced",System.currentTimeMillis()).apply();
            schedule(c);
            return true;
        } catch (Exception ignored) { return false; }
    }
    private static void cancelLegacyTest(Context c) {
        // A diagnostic queued by an older app version must never fire after this update.
        Intent intent=new Intent(c,OfferReminderReceiver.class).setAction("com.souqdaraya.app.TEST_SCHEDULED_OFFER");
        PendingIntent old=PendingIntent.getBroadcast(c,690,intent,PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);
        if(old!=null) {c.getSystemService(AlarmManager.class).cancel(old);old.cancel();}
        prefs(c).edit().remove("test_due").remove("test_received").remove("test_posted").apply();
    }
    static void schedule(Context c) {
        cancelLegacyTest(c);
        channel(c);
        SharedPreferences p=prefs(c);
        long now=System.currentTimeMillis();
        if(!p.getBoolean("consent",false)||!p.getBoolean("active",false)||!canNotify(c)||now-p.getLong("synced",0)>CONFIG_LIFETIME) {cancel(c);return;}
        String rawTimes=p.getString("times","[]");
        String signature="idle-v2:"+rawTimes;
        // Preserve alarms waiting inside their delivery window when the app resumes or syncs.
        if(signature.equals(p.getString("scheduled_signature",""))) {
            boolean allPresent=true;
            try {
                JSONArray times=new JSONArray(rawTimes);
                for(int i=0;i<times.length();i++)if(alarm(c,i,0,false)==null)allPresent=false;
            } catch(Exception ignored) {allPresent=false;}
            if(allPresent)return;
        }
        cancel(c);
        try {
            JSONArray times=new JSONArray(rawTimes);
            AlarmManager manager=c.getSystemService(AlarmManager.class);
            for(int i=0;i<Math.min(times.length(),MAX);i++) {
                long due=ReminderTimes.next(now,times.getString(i));
                setLocalAlarm(manager,due,alarm(c,i,due,true));
                p.edit().putLong("next_due_"+i,due).apply();
            }
            p.edit().putString("scheduled_signature",signature).apply();
        } catch (Exception ignored) { cancel(c); }
    }
    private static void setLocalAlarm(AlarmManager manager,long due,PendingIntent pending) {
        // Use the same OS scheduling path for all daily reminders.
        // No artificial one-hour window and no exact-alarm permission.
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,due,pending);
    }
    static void receive(Context c, Intent intent) {
        if(!ACTION.equals(intent.getAction())) {
            String action=intent.getAction();
            if(Intent.ACTION_BOOT_COMPLETED.equals(action)||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)||Intent.ACTION_TIME_CHANGED.equals(action)||Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {cancel(c);schedule(c);}
            return;
        }
        SharedPreferences p=prefs(c);
        int slot=intent.getIntExtra("slot",-1);
        long due=intent.getLongExtra("due",0),now=System.currentTimeMillis();
        if(slot<0||slot>=MAX||due<=0||!p.getBoolean("consent",false)||!p.getBoolean("active",false)||!canNotify(c)||now-p.getLong("synced",0)>CONFIG_LIFETIME)return;
        try {
            JSONArray times=new JSONArray(p.getString("times","[]"));
            if(slot>=times.length())return;
            long next=ReminderTimes.next(now,times.getString(slot));
            setLocalAlarm(c.getSystemService(AlarmManager.class),next,alarm(c,slot,next,true));
            p.edit().putLong("next_due_"+slot,next).apply();
        } catch(Exception ignored) {return;}
        if(now<due||now-due>MAX_DELAY)return;
        // Do not cancel another slot that is waiting for a delayed delivery.
        if(due<=p.getLong("last_due_"+slot,0))return;
        p.edit().putLong("last_due_"+slot,due).apply();
        if(postNotification(c))p.edit().putLong("last_scheduled_posted",now).apply();
    }
    private static boolean postNotification(Context c) {
        channel(c);
        Intent open=new Intent(c,MainActivity.class).setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("https://damascus-shop.com/#offers"))
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content=PendingIntent.getActivity(c,610,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(c,CHANNEL):new Notification.Builder(c);
        Notification notification=builder.setSmallIcon(R.drawable.ic_offer_notification)
            .setContentTitle("سوق داريا الإلكتروني").setContentText("شاهد عروض اليوم")
            .setContentIntent(content).setAutoCancel(true).setCategory(Notification.CATEGORY_REMINDER).build();
        try { c.getSystemService(NotificationManager.class).notify(610,notification);return true; }
        catch(SecurityException ignored) {return false;}
    }
    private static void openSystemSettings(Activity a) {
        Intent intent;
        if(Build.VERSION.SDK_INT>=26)intent=new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE,a.getPackageName());
        else intent=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+a.getPackageName()));
        a.startActivity(intent);
    }
    static void offerAtFirstOpen(Activity a) {
        if(a.isFinishing()||a.isDestroyed())return;
        SharedPreferences p=prefs(a);
        // Preserve an existing user's explicit choice, including opt-out.
        if(p.getBoolean("startup_offered",false)||p.contains("consent"))return;
        p.edit().putBoolean("startup_offered",true).apply();
        new AlertDialog.Builder(a).setTitle("تفعيل إشعارات عروض اليوم؟")
            .setMessage("هل ترغب بتلقي تذكير: «شاهد عروض اليوم»؟ تحدد إدارة السوق عدد التذكيرات وأوقاتها. يمكنك تشغيلها أو إيقافها لاحقًا من قسم عروض اليوم. يمكنك استخدام التطبيق دون تفعيلها.")
            .setPositiveButton("نعم، تفعيل الإشعارات",(d,w)->enableFromUser(a))
            .setNegativeButton("ليس الآن",(d,w)->p.edit().putBoolean("consent",false).apply())
            .show();
    }
    private static void enableFromUser(Activity a) {
        channel(a);
        SharedPreferences p=prefs(a);
        p.edit().putBoolean("consent",true).apply();
        if(Build.VERSION.SDK_INT>=33&&a.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) {
            if(p.getBoolean("permission_requested",false)&&!a.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {openSystemSettings(a);return;}
            p.edit().putBoolean("permission_requested",true).apply();
            a.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSION_REQUEST);
        } else if(!canNotify(a))openSystemSettings(a);
        else {
            schedule(a);
            Toast.makeText(a,p.getBoolean("configured",false)?"تم تفعيل تذكير عروض اليوم":"تم السماح بالتذكير. تُحمّل المواعيد عند الاتصال بالإنترنت.",Toast.LENGTH_LONG).show();
        }
    }
    static void showSettings(Activity a) {
        channel(a);
        SharedPreferences p=prefs(a);
        String times=p.getString("times","[]").replace("[","").replace("]","").replace("\"","");
        String status=p.getBoolean("consent",false)&&canNotify(a)?"مفعّل على هذا الهاتف":"متوقف على هذا الهاتف";
        new AlertDialog.Builder(a).setTitle("تذكير بعروض اليوم")
            .setMessage(status+"\n\nنص الإشعار: شاهد عروض اليوم\nالأوقات بتوقيت داريا: "+times+"\n\nتحدد الإدارة العدد والأوقات. تتحدث عند فتح التطبيق واتصاله بالإنترنت. التذكيرات تعمل عبر مجدول أندرويد، وقد يؤخرها النظام أو توفير البطارية. يتوقف التذكير بعد أسبوع دون مزامنة لحين فتح التطبيق مجددًا.")
            .setPositiveButton("تفعيل التذكير",(d,w)->enableFromUser(a))
            .setNegativeButton("إيقاف التذكير",(d,w)->{p.edit().putBoolean("consent",false).apply();cancel(a);Toast.makeText(a,"تم إيقاف التذكير",Toast.LENGTH_SHORT).show();})
            .setNeutralButton("إغلاق",null).show();
    }
    static void permissionResult(Activity a) {
        if(canNotify(a)) { schedule(a); Toast.makeText(a,"تم تفعيل تذكير عروض اليوم",Toast.LENGTH_LONG).show(); }
        else { prefs(a).edit().putBoolean("consent",false).apply();cancel(a);Toast.makeText(a,"يمكنك تفعيل الإشعارات لاحقًا من عروض اليوم",Toast.LENGTH_LONG).show(); }
    }
}
