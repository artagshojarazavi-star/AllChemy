package com.allchemy.app;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Hosts the existing web application (AllChemy/www, copied into assets/www at build time) in a locked-down WebView.
 *
 * - Loads file:///android_asset/www/index.html: plain script tags, no modules, no fetch/XHR, so no special asset loader is needed.
 * - No JavaScript bridge, no file access outside the assets, no network (the manifest declares no permissions).
 * - Never leaves a silent blank screen: a loading overlay is shown until the page reports its three tabs; any failure replaces it
 *   with a visible error message and a log line tagged AllChemyBoot.
 * - Debug builds only: launching with `--ez selftest true` runs assets/selftest.js inside the page and logs the result (AllChemySelfTest).
 */
public class MainActivity extends Activity {
    private static final String START_URL = "file:///android_asset/www/index.html";
    private static final String ASSET_PREFIX = "file:///android_asset/www/";
    private static final String TAG_BOOT = "AllChemyBoot";
    private static final String TAG_JS = "AllChemyJS";
    private static final String TAG_SELFTEST = "AllChemySelfTest";

    private static final int BG = Color.rgb(0x0A, 0x0F, 0x1E);
    private static final int TEXT = Color.rgb(0xE8, 0xEC, 0xFF);
    private static final int ERROR = Color.rgb(0xFB, 0x71, 0x85);
    private static final int MATCH = ViewGroup.LayoutParams.MATCH_PARENT;

    private WebView web;
    private LinearLayout overlay;
    private ProgressBar spinner;
    private TextView message;
    private boolean failed;
    private boolean debuggable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (debuggable) {
            WebView.setWebContentsDebuggingEnabled(true); // chrome://inspect on a connected computer; debug builds only
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);

        web = new WebView(this);
        web.setBackgroundColor(BG);
        configure(web.getSettings());
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        root.addView(web, new FrameLayout.LayoutParams(MATCH, MATCH));

        overlay = buildOverlay();
        root.addView(overlay, new FrameLayout.LayoutParams(MATCH, MATCH));
        setContentView(root);

        try {
            getAssets().open("www/index.html").close();
        } catch (IOException e) {
            showError("The app files are missing from this package (assets/www/index.html).");
            return;
        }
        web.loadUrl(START_URL);
    }

    private void configure(WebSettings s) {
        s.setJavaScriptEnabled(true);          // the whole app is JavaScript
        s.setDomStorageEnabled(true);          // localStorage: remembers the light/dark choice
        s.setAllowFileAccess(false);           // does not affect file:///android_asset, which stays readable
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setAllowContentAccess(false);
        s.setGeolocationEnabled(false);
        s.setBlockNetworkLoads(true);          // offline by design
    }

    private LinearLayout buildOverlay() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(BG);
        int pad = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 24, getResources().getDisplayMetrics());
        box.setPadding(pad, pad, pad, pad);

        spinner = new ProgressBar(this);
        spinner.setIndeterminate(true);
        box.addView(spinner, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        message = new TextView(this);
        message.setTextColor(TEXT);
        message.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        message.setGravity(Gravity.CENTER);
        message.setText(R.string.loading);
        message.setPadding(0, pad / 2, 0, 0);
        box.addView(message, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        return box;
    }

    private void showError(String detail) {
        failed = true;
        Log.e(TAG_BOOT, "FAILED " + detail);
        spinner.setVisibility(View.GONE);
        message.setTextColor(ERROR);
        message.setText(getString(R.string.start_failed) + "\n\n" + detail);
        overlay.setVisibility(View.VISIBLE);
    }

    private void onPageReady() {
        overlay.setVisibility(View.GONE);
        Log.i(TAG_BOOT, "READY tabs=3");
        if (debuggable && getIntent() != null && getIntent().getBooleanExtra("selftest", false)) {
            runSelfTest();
        }
    }

    private void runSelfTest() {
        try {
            String script = readAsset("selftest.js");
            web.evaluateJavascript(script, value -> Log.i(TAG_SELFTEST, String.valueOf(value)));
        } catch (IOException e) {
            Log.e(TAG_SELFTEST, "SELFTEST FAIL selftest.js asset missing: " + e.getMessage());
        }
    }

    private String readAsset(String name) throws IOException {
        InputStream in = getAssets().open(name);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
            }
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } finally {
            in.close();
        }
    }

    private class Client extends WebViewClient {
        @Override
        public void onPageFinished(WebView view, String url) {
            if (failed) {
                return;
            }
            // The page builds its three tabs in js/app/ui.js. If a script failed to load or threw, there will not be three.
            view.evaluateJavascript("document.querySelectorAll('#tabs .tab').length", value -> {
                if ("3".equals(value)) {
                    onPageReady();
                } else {
                    showError("The interface did not initialise (found " + value + " tabs instead of 3). A script probably failed to load; see logcat tag " + TAG_JS + ".");
                }
            });
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                showError("Could not load the interface: " + error.getDescription() + " (code " + error.getErrorCode() + ").");
            } else {
                Log.e(TAG_JS, "Resource failed: " + request.getUrl() + " – " + error.getDescription());
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            // Stay inside the bundled app; anything else (there are no external links) is ignored rather than opened in the WebView.
            return !request.getUrl().toString().startsWith(ASSET_PREFIX);
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            showError("The web engine stopped (crashed: " + detail.didCrash() + "). Close and reopen AllChemy.");
            return true;
        }
    }

    private static class Chrome extends WebChromeClient {
        @Override
        public boolean onConsoleMessage(ConsoleMessage m) {
            String line = m.message() + " [" + m.sourceId() + ":" + m.lineNumber() + "]";
            switch (m.messageLevel()) {
                case ERROR:
                    Log.e(TAG_JS, line);
                    break;
                case WARNING:
                    Log.w(TAG_JS, line);
                    break;
                default:
                    Log.d(TAG_JS, line);
                    break;
            }
            return true;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (web != null) {
            web.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            ViewGroup parent = (ViewGroup) web.getParent();
            if (parent != null) {
                parent.removeView(web);
            }
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
