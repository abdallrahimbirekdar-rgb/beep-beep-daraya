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
    private static final String TEST_ACTION = "com.souqdaraya.app.TEST_SCHEDULED_OFFER";

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
    static void schedule(Context c) {
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
        // Use the same OS scheduling path for daily reminders and the short diagnostic.
        // No artificial one-hour window and no exact-alarm permission.
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,due,pending);
    }
    static void receive(Context c, Intent intent) {
        if(TEST_ACTION.equals(intent.getAction())) {
            SharedPreferences p=prefs(c);
            long due=intent.getLongExtra("due",0),now=System.currentTimeMillis();
            if(!p.getBoolean("consent",false)||!canNotify(c)||due<=0||now<due||now-due>MAX_DELAY)return;
            if(p.getLong("test_due",0)!=due)return;
            boolean sent=postNotification(c);
            p.edit().remove("test_due").putLong("test_received",now).putBoolean("test_posted",sent).apply();
            return;
        }
        if(!ACTION.equals(intent.getAction())) {cancel(c);schedule(c);return;}
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
    static void test(Activity a) {
        if(!prefs(a).getBoolean("consent",false)||!canNotify(a)) {
            Toast.makeText(a,"فعّل التذكير واسمح بإشعارات التطبيق أولًا",Toast.LENGTH_LONG).show();
            showSettings(a);
            return;
        }
        postNotification(a);
        Toast.makeText(a,"أُرسل إشعار تجريبي. اسحب شريط الإشعارات لعرضه.",Toast.LENGTH_LONG).show();
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
    static void showSettings(Activity a) {
        channel(a);
        SharedPreferences p=prefs(a);
        String times=p.getString("times","[]").replace("[","").replace("]","").replace("\"","");
        String status=p.getBoolean("consent",false)&&canNotify(a)?"مفعّل على هذا الهاتف":"متوقف على هذا الهاتف";
        new AlertDialog.Builder(a).setTitle("تذكير بعروض اليوم")
            .setMessage(status+"\n\nنص الإشعار: شاهد عروض اليوم\nالأوقات بتوقيت داريا: "+times+"\n\nتحدد الإدارة العدد والأوقات. تتحدث عند فتح التطبيق واتصاله بالإنترنت. التذكيرات تعمل عبر مجدول أندرويد، وقد يؤخرها النظام أو توفير البطارية. يتوقف التذكير بعد أسبوع دون مزامنة لحين فتح التطبيق مجددًا.")
            .setPositiveButton("تفعيل التذكير",(d,w)->{
                if(!p.getBoolean("configured",false)) { Toast.makeText(a,"اتصل بالإنترنت وافتح عروض اليوم لتحميل مواعيد التذكير أولًا.",Toast.LENGTH_LONG).show();return; }
                p.edit().putBoolean("consent",true).apply();
                if(Build.VERSION.SDK_INT>=33&&a.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) {
                    if(p.getBoolean("permission_requested",false)&&!a.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) { openSystemSettings(a);return; }
                    p.edit().putBoolean("permission_requested",true).apply();
                    a.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSION_REQUEST);
                } else if(!canNotify(a))openSystemSettings(a);
                else { schedule(a); Toast.makeText(a,"تم تفعيل تذكير عروض اليوم على هذا الهاتف",Toast.LENGTH_LONG).show(); }
            })
            .setNegativeButton("إيقاف التذكير",(d,w)->{p.edit().putBoolean("consent",false).apply();cancel(a);Toast.makeText(a,"تم إيقاف التذكير",Toast.LENGTH_SHORT).show();})
            .setNeutralButton("اختبار الإشعارات",(d,w)->showTests(a)).show();
    }
    private static String stamp(long value) {
        if(value<=0)return "لا يوجد";
        java.text.SimpleDateFormat format=new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss",java.util.Locale.US);
        format.setTimeZone(java.util.TimeZone.getTimeZone(ReminderTimes.ZONE));
        return format.format(new java.util.Date(value));
    }
    private static void showTests(Activity a) {
        new AlertDialog.Builder(a).setTitle("اختبار الإشعارات")
            .setItems(new String[]{"إشعار تجريبي الآن","اختبار إشعار مجدول بعد دقيقة","عرض حالة الجدولة"},(d,w)->{
                if(w==0)test(a);
                else if(w==1)scheduledTest(a);
                else showStatus(a);
            }).setNegativeButton("إغلاق",null).show();
    }
    private static void scheduledTest(Activity a) {
        if(!prefs(a).getBoolean("consent",false)||!canNotify(a)) {
            Toast.makeText(a,"فعّل التذكير واسمح بالإشعارات أولًا",Toast.LENGTH_LONG).show();showSettings(a);return;
        }
        long due=System.currentTimeMillis()+60000L;
        Intent intent=new Intent(a,OfferReminderReceiver.class).setAction(TEST_ACTION).putExtra("due",due);
        PendingIntent pending=PendingIntent.getBroadcast(a,690,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        try {
            setLocalAlarm(a.getSystemService(AlarmManager.class),due,pending);
            prefs(a).edit().putLong("test_due",due).remove("test_received").remove("test_posted").apply();
            new AlertDialog.Builder(a).setTitle("تم حجز اختبار مجدول")
                .setMessage("موعد الاختبار بتوقيت داريا: "+stamp(due)+"\n\nارجع للشاشة الرئيسية للهاتف وانتظر. الاختبار يستخدم مجدول أندرويد ومستقبل الإشعارات نفسه، ولا يغير مواعيد الإدارة. قد يتأخر بسبب قيود النظام. بعده افتح «عرض حالة الجدولة» لرؤية النتيجة.")
                .setPositiveButton("حسنًا",null).show();
        } catch(Exception e) {Toast.makeText(a,"لم يتم حجز الاختبار المجدول",Toast.LENGTH_LONG).show();}
    }
    private static void showStatus(Activity a) {
        SharedPreferences p=prefs(a);
        StringBuilder status=new StringBuilder("الأوقات التالية بتوقيت داريا\n");
        status.append("آخر مزامنة: ").append(stamp(p.getLong("synced",0))).append("\n");
        status.append("الإشعارات مسموحة: ").append(canNotify(a)?"نعم":"لا").append("\n");
        status.append("التذكير مفعّل على الهاتف: ").append(p.getBoolean("consent",false)?"نعم":"لا").append("\n");
        status.append("آخر إشعار يومي أرسله المجدول: ").append(stamp(p.getLong("last_scheduled_posted",0))).append("\n\n");
        long received=p.getLong("test_received",0),pending=p.getLong("test_due",0);
        if(received>0)status.append(p.getBoolean("test_posted",false)?"نجح الاختبار المجدول: النظام شغّل المهمة وأرسل الإشعار في ":"شغّل النظام المهمة لكن لم يسمح بإرسال الإشعار في ").append(stamp(received));
        else if(pending>0)status.append("الاختبار المجدول بانتظار التنفيذ منذ الموعد: ").append(stamp(pending));
        else status.append("لم يُنفّذ اختبار مجدول بعد.");
        try {
            JSONArray times=new JSONArray(p.getString("times","[]"));
            if(p.getBoolean("consent",false)&&p.getBoolean("active",false))for(int i=0;i<times.length();i++)status.append("\nالتذكير ").append(i+1).append(": ").append(stamp(p.getLong("next_due_"+i,0)));
        } catch(Exception ignored) { }
        new AlertDialog.Builder(a).setTitle("حالة الجدولة على هذا الهاتف").setMessage(status.toString()).setPositiveButton("إغلاق",null).show();
    }
    static void permissionResult(Activity a) {
        if(canNotify(a)) { schedule(a); Toast.makeText(a,"تم تفعيل تذكير عروض اليوم",Toast.LENGTH_LONG).show(); }
        else { prefs(a).edit().putBoolean("consent",false).apply();cancel(a);Toast.makeText(a,"يمكنك تفعيل الإشعارات لاحقًا من عروض اليوم",Toast.LENGTH_LONG).show(); }
    }
}
