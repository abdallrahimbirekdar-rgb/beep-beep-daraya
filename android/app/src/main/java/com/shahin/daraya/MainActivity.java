package com.souqdaraya.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.*;

/** Small native shell. Orders and authentication use the existing HTTPS site. */
public class MainActivity extends Activity {
    private static final String SITE = "https://damascus-shop.com/";
    private static final int PICK_FILE = 7;
    private static final int LOCATION_PERMISSION = 8;
    private static final int STARTUP_LOCATION_PERMISSION = 9;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private WebView web;
    private ProgressBar progress;
    private LinearLayout error;
    private ValueCallback<Uri[]> fileCallback;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(255,246,235));
        root.setOnApplyWindowInsetsListener((v,insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(i.left,i.top,i.right,i.bottom);
            } else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        progress = new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        root.addView(progress,new LinearLayout.LayoutParams(-1,6));
        FrameLayout content = new FrameLayout(this);
        root.addView(content,new LinearLayout.LayoutParams(-1,0,1));
        web = new WebView(this);
        content.addView(web,new FrameLayout.LayoutParams(-1,-1));
        error = new LinearLayout(this);
        error.setOrientation(LinearLayout.VERTICAL);
        error.setGravity(android.view.Gravity.CENTER);
        error.setPadding(32,32,32,32);
        error.setBackgroundColor(Color.rgb(255,246,235));
        TextView text = new TextView(this);
        text.setText("سوق داريا\nتعذر الاتصال بالإنترنت\nتحقق من الاتصال ثم حاول مجدداً.");
        text.setGravity(android.view.Gravity.CENTER);
        text.setTextSize(21);
        error.addView(text);
        Button retry = new Button(this);
        retry.setText("إعادة المحاولة");
        retry.setOnClickListener(v -> { error.setVisibility(View.GONE); web.reload(); });
        error.addView(retry);
        error.setVisibility(View.GONE);
        content.addView(error,new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        int installedCode=0;
        try { installedCode=getPackageManager().getPackageInfo(getPackageName(),0).versionCode; }
        catch(android.content.pm.PackageManager.NameNotFoundException ignored) {}
        settings.setUserAgentString(settings.getUserAgentString()+" ShahinAndroid/1.2 DarayaVersion/"+installedCode);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebView.setWebContentsDebuggingEnabled(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isSiteUrl(uri)) return false;
                if ("https".equals(uri.getScheme()) || "tel".equals(uri.getScheme()) || "mailto".equals(uri.getScheme()) || "geo".equals(uri.getScheme()) || "whatsapp".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); }
                    catch (android.content.ActivityNotFoundException e) { Toast.makeText(MainActivity.this,"لا يوجد تطبيق مناسب لفتح الرابط",Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon) { progress.setVisibility(View.VISIBLE); }
            @Override public void onPageFinished(WebView v,String url) { progress.setVisibility(View.GONE); }
            @Override public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError e) { if(req.isForMainFrame()) { progress.setVisibility(View.GONE); error.setVisibility(View.VISIBLE); } }
            // Certificate errors retain WebView's secure default: cancel.
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if(!isSiteUrl(Uri.parse(origin))) { callback.invoke(origin,false,false); return; }
                if(checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)==android.content.pm.PackageManager.PERMISSION_GRANTED || checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)==android.content.pm.PackageManager.PERMISSION_GRANTED) { callback.invoke(origin,true,false); return; }
                if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);
                locationCallback=callback;locationOrigin=origin;
                requestPermissions(new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION,android.Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION_PERMISSION);
            }
            @Override public void onGeolocationPermissionsHidePrompt() {
                // WebView canceled this request; do not invoke its callback again.
                locationCallback=null;locationOrigin=null;
            }
            @Override public void onProgressChanged(WebView v,int n) { progress.setProgress(n); }
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if(fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("image/*");
                try { startActivityForResult(picker,PICK_FILE); }
                catch (android.content.ActivityNotFoundException e) { fileCallback.onReceiveValue(null); fileCallback=null; }
                return true;
            }
        });
        web.setDownloadListener((url,ua,cd,mime,len) -> { if(url.startsWith("https://")) { try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url))); } catch(android.content.ActivityNotFoundException ignored) {} } });
        if(androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.WEB_MESSAGE_LISTENER)) {
            java.util.Set<String> origins=new java.util.HashSet<>(java.util.Arrays.asList("https://damascus-shop.com","https://www.damascus-shop.com"));
            androidx.webkit.WebViewCompat.addWebMessageListener(web,"DarayaImageShare",origins,(view,message,sourceOrigin,isMainFrame,reply)->{
                if(!isMainFrame||!isSiteUrl(sourceOrigin))return;
                try {
                    org.json.JSONObject body=new org.json.JSONObject(message.getData());
                    boolean isPdf=body.has("pdf");
                    String encoded=body.getString(isPdf?"pdf":"png");
                    if(encoded.length()>8*1024*1024)throw new IllegalArgumentException("Image too large");
                    byte[] bytes=android.util.Base64.decode(encoded,android.util.Base64.DEFAULT);
                    byte[] signature=isPdf?new byte[]{37,80,68,70,45}:new byte[]{(byte)137,80,78,71,13,10,26,10};
                    if(bytes.length<8||bytes.length>6*1024*1024)throw new IllegalArgumentException("Invalid PNG");
                    for(int i=0;i<signature.length;i++)if(bytes[i]!=signature[i])throw new IllegalArgumentException("Invalid PNG");
                    java.io.File folder=new java.io.File(getCacheDir(),"promo-shares");folder.mkdirs();
                    java.io.File[] old=folder.listFiles();if(old!=null)for(java.io.File f:old)if(f.lastModified()<System.currentTimeMillis()-86400000L)f.delete();
                    java.io.File file=java.io.File.createTempFile("daraya-",isPdf?".pdf":".png",folder);
                    try(java.io.FileOutputStream out=new java.io.FileOutputStream(file)){out.write(bytes);}
                    Uri image=androidx.core.content.FileProvider.getUriForFile(this,getPackageName()+".promo-files",file);
                    Intent share=new Intent(Intent.ACTION_SEND);share.setType(isPdf?"application/pdf":"image/png");share.putExtra(Intent.EXTRA_STREAM,image);
                    String shareText=body.optString("text","");if(shareText.length()>6000)shareText=shareText.substring(0,6000);share.putExtra(Intent.EXTRA_TEXT,shareText);
                    share.setClipData(android.content.ClipData.newRawUri("Product image",image));share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(share,isPdf?"حفظ أو مشاركة قائمة المنتجات":"مشاركة صورة الإعلان"));reply.postMessage("{\"ok\":true}");
                }catch(Exception e){reply.postMessage("{\"ok\":false,\"error\":\"Could not share image\"}");}
            });
        }
        if(androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.WEB_MESSAGE_LISTENER)) {
            java.util.Set<String> authOrigins=java.util.Collections.singleton("https://damascus-shop.com");
            androidx.webkit.WebViewCompat.addWebMessageListener(web,"DarayaAuth",authOrigins,(view,message,sourceOrigin,isMainFrame,reply)->{
                if(!isMainFrame||!"https://damascus-shop.com".equals(sourceOrigin.toString()))return;
                try {
                    Uri uri=Uri.parse(message.getData());
                    if(!"https".equals(uri.getScheme())||!"nxnqsudwccjlvyepuxfg.supabase.co".equals(uri.getHost())||
                       !"/auth/v1/authorize".equals(uri.getPath())||!"google".equals(uri.getQueryParameter("provider"))||
                       !"com.souqdaraya.app://auth/callback".equals(uri.getQueryParameter("redirect_to"))||
                       !"s256".equalsIgnoreCase(uri.getQueryParameter("code_challenge_method"))||
                       uri.getQueryParameter("code_challenge")==null)throw new IllegalArgumentException();
                    getSharedPreferences("daraya_oauth",MODE_PRIVATE).edit().putLong("started",System.currentTimeMillis()).apply();
                    startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE));
                    reply.postMessage("{\"ok\":true}");
                }catch(Exception e){
                    getSharedPreferences("daraya_oauth",MODE_PRIVATE).edit().remove("started").apply();
                    reply.postMessage("{\"ok\":false}");
                }
            });
        }
        String destination = destination(getIntent());
        if(destination != null) web.loadUrl(freshUrl(destination));
        else if(state == null || web.restoreState(state) == null) web.loadUrl(freshUrl(SITE+"#home"));
        if(state==null)offerLocationPermission();
    }
    private void offerLocationPermission() {
        if(checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)==android.content.pm.PackageManager.PERMISSION_GRANTED ||
           checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)==android.content.pm.PackageManager.PERMISSION_GRANTED)return;
        android.content.SharedPreferences preferences=getSharedPreferences("daraya_permissions",MODE_PRIVATE);
        if(preferences.getBoolean("location_offered",false))return;
        preferences.edit().putBoolean("location_offered",true).apply();
        new android.app.AlertDialog.Builder(this)
            .setTitle("الأماكن الأقرب إليك")
            .setMessage("اسمح لسوق داريا الإلكتروني باستخدام موقعك أثناء استخدام التطبيق لعرض الأماكن الأقرب إليك. يمكنك متابعة التصفح دون السماح.")
            .setPositiveButton("السماح بالموقع",(dialog,which)->requestPermissions(
                new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION,android.Manifest.permission.ACCESS_COARSE_LOCATION},
                STARTUP_LOCATION_PERMISSION))
            .setNegativeButton("لاحقًا",null).show();
    }
    private static String freshUrl(String url) {
        return Uri.parse(url).buildUpon().appendQueryParameter("app-open",Long.toString(System.currentTimeMillis())).build().toString();
    }
    private static boolean isSiteUrl(Uri uri) {
        return "https".equals(uri.getScheme()) && ("damascus-shop.com".equals(uri.getHost()) || "www.damascus-shop.com".equals(uri.getHost()));
    }
    private String destination(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        if(uri == null) return null;
        if("com.souqdaraya.app".equals(uri.getScheme()) && "auth".equals(uri.getHost()) && "/callback".equals(uri.getPath())) {
            android.content.SharedPreferences prefs=getSharedPreferences("daraya_oauth",MODE_PRIVATE);
            long started=prefs.getLong("started",0);
            prefs.edit().remove("started").apply();
            String code=uri.getQueryParameter("code");
            if(started==0||System.currentTimeMillis()-started>600000L||code==null||!code.matches("[0-9a-fA-F-]{36}")){
                Toast.makeText(this,"لم يكتمل تسجيل الدخول. حاول مجددًا / Sign-in failed. Please try again.",Toast.LENGTH_LONG).show();
                return SITE+"#account";
            }
            return Uri.parse(SITE).buildUpon().appendQueryParameter("code",code).fragment("account").build().toString();
        }
        if(isSiteUrl(uri)) return uri.toString();
        if("daraya".equals(uri.getScheme()) && "store".equals(uri.getHost())) {
            String id = uri.getLastPathSegment();
            if(id != null && id.matches("[0-9a-fA-F-]{36}")) return SITE+"#store/"+id;
        }
        return null;
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String target = destination(intent);
        if(target != null) { error.setVisibility(View.GONE); web.loadUrl(freshUrl(target)); }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(result==RESULT_OK && data!=null && data.getData()!=null ? new Uri[]{data.getData()} : null);
            fileCallback=null;
        }
    }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results) {
        super.onRequestPermissionsResult(request,permissions,results);
        if(request==STARTUP_LOCATION_PERMISSION) {
            boolean granted=checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)==android.content.pm.PackageManager.PERMISSION_GRANTED ||
                checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)==android.content.pm.PackageManager.PERMISSION_GRANTED;
            Toast.makeText(this,granted?"تم تفعيل الموقع. استخدم الأقرب إليك لعرض الأماكن القريبة.":"يمكنك متابعة التصفح وتفعيل الموقع لاحقًا من الأقرب إليك.",Toast.LENGTH_LONG).show();
        }
        if(request==LOCATION_PERMISSION && locationCallback!=null) {
            boolean granted=checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)==android.content.pm.PackageManager.PERMISSION_GRANTED || checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)==android.content.pm.PackageManager.PERMISSION_GRANTED;
            GeolocationPermissions.Callback callback=locationCallback;
            String origin=locationOrigin;
            locationCallback=null;locationOrigin=null;
            if(web!=null)web.onResume();
            callback.invoke(origin,granted,false);
            if(!granted)new android.app.AlertDialog.Builder(this)
                .setTitle("إذن الموقع")
                .setMessage("لتحديد الأماكن الأقرب، اسمح باستخدام الموقع أثناء استخدام التطبيق. يمكنك تفعيل الإذن من إعدادات التطبيق.")
                .setPositiveButton("فتح الإعدادات",(dialog,which)->startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName()))))
                .setNegativeButton("لاحقًا",null).show();
        }
    }
    @Override protected void onPause() { super.onPause(); if(web!=null&&locationCallback==null){web.evaluateJavascript("window.dispatchEvent(new Event('daraya-app-pause'));",null);web.onPause();} }
    @Override protected void onResume() { super.onResume(); if(web!=null){web.onResume();web.evaluateJavascript("window.dispatchEvent(new Event('daraya-app-resume'));",null);} }
    @Override public void onBackPressed() { if(web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onSaveInstanceState(Bundle state) { web.saveState(state); super.onSaveInstanceState(state); }
    @Override protected void onDestroy() { if(fileCallback!=null) fileCallback.onReceiveValue(null); if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false); web.destroy(); super.onDestroy(); }
}

