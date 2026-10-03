package com.shahin.daraya;

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
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString()+" ShahinAndroid/1.1");
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
        String destination = destination(getIntent());
        if(destination != null) web.loadUrl(destination);
        else if(state == null || web.restoreState(state) == null) web.loadUrl(SITE+"#home");
    }
    private static boolean isSiteUrl(Uri uri) {
        return "https".equals(uri.getScheme()) && ("damascus-shop.com".equals(uri.getHost()) || "www.damascus-shop.com".equals(uri.getHost()));
    }
    private static String destination(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        if(uri == null) return null;
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
        if(target != null) { error.setVisibility(View.GONE); web.loadUrl(target); }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(result==RESULT_OK && data!=null && data.getData()!=null ? new Uri[]{data.getData()} : null);
            fileCallback=null;
        }
    }
    @Override public void onBackPressed() { if(web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onSaveInstanceState(Bundle state) { web.saveState(state); super.onSaveInstanceState(state); }
    @Override protected void onDestroy() { if(fileCallback!=null) fileCallback.onReceiveValue(null); web.destroy(); super.onDestroy(); }
}
