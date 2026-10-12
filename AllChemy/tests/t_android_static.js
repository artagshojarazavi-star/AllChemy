/* Static checks of the Android wrapper and its CI workflow. Node only, no Android SDK needed.
   These catch typos, missing files, wrong references and weakened security settings. They do NOT prove the APK builds or runs:
   only a green GitHub Actions run (and an install on a device) does that. */
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');           // AllChemy/
const repo = path.resolve(root, '..');                // repository root (holds .github/)
const A = path.join(root, 'android'), APP = path.join(A, 'app'), MAIN = path.join(APP, 'src', 'main');
let bad = 0, n = 0;
function ok(cond, msg, detail) { n++; if (!cond) { bad++; console.log('FAIL', msg, detail === undefined ? '' : '\n   got: ' + JSON.stringify(detail)); } }
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

/* ---- required files ---- */
const files = [
  'settings.gradle', 'build.gradle', 'gradle.properties', '.gitignore', 'app/build.gradle',
  'app/src/main/AndroidManifest.xml', 'app/src/main/java/com/allchemy/app/MainActivity.java',
  'app/src/main/res/values/strings.xml', 'app/src/main/res/values/colors.xml', 'app/src/main/res/values/themes.xml',
  'app/src/main/res/drawable/splash_background.xml', 'app/src/main/res/drawable/ic_launcher_foreground.xml',
  'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', 'app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
  'app/src/debug/assets/selftest.js', 'ci/verify-apk.sh', 'ci/smoke.sh',
];
files.forEach((f) => ok(exists(path.join(A, f)), 'android/' + f + ' exists'));
const wfPath = path.join(repo, '.github', 'workflows', 'android-debug.yml');
ok(exists(wfPath), 'workflow .github/workflows/android-debug.yml exists at the repository root (GitHub only runs workflows from there)');
if (bad) { console.log(bad + ' of ' + n + ' checks FAILED (files missing, stopping)'); process.exit(1); }

const manifest = read(path.join(MAIN, 'AndroidManifest.xml')).replace(/<!--[\s\S]*?-->/g, ''); // comments removed: only real elements count
const java = read(path.join(MAIN, 'java/com/allchemy/app/MainActivity.java'));
const appGradle = read(path.join(APP, 'build.gradle'));
const rootGradle = read(path.join(A, 'build.gradle'));
const settings = read(path.join(A, 'settings.gradle'));
const wf = read(wfPath);

/* ---- manifest ---- */
ok(!/<uses-permission/.test(manifest), 'manifest declares no permissions (offline-only app)');
ok(/android:name="\.MainActivity"/.test(manifest) && /android:exported="true"/.test(manifest), 'launcher activity is .MainActivity and exported (required on Android 12+)');
ok(/android\.intent\.action\.MAIN/.test(manifest) && /android\.intent\.category\.LAUNCHER/.test(manifest), 'MAIN/LAUNCHER intent filter present');
ok(/android:label="@string\/app_name"/.test(manifest), 'app label comes from @string/app_name');
ok(/android:usesCleartextTraffic="false"/.test(manifest) && /android:allowBackup="false"/.test(manifest), 'cleartext traffic and backup are off');
ok(/windowSoftInputMode="adjustResize"/.test(manifest), 'keyboard resizes the window so inputs stay visible');
ok(/configChanges="[^"]*orientation[^"]*screenSize/.test(manifest), 'rotation does not recreate the activity (would reload the WebView)');
ok(/<string name="app_name">AllChemy<\/string>/.test(read(path.join(MAIN, 'res/values/strings.xml'))), 'app name is AllChemy');

/* ---- gradle ---- */
const ns = /namespace\s+'([^']+)'/.exec(appGradle), appId = /applicationId\s+'([^']+)'/.exec(appGradle), pkg = /^package\s+([\w.]+);/m.exec(java);
ok(ns && appId && pkg && ns[1] === appId[1] && ns[1] === pkg[1], 'namespace, applicationId and the Java package agree', [ns && ns[1], appId && appId[1], pkg && pkg[1]]);
ok(exists(path.join(MAIN, 'java', ...ns[1].split('.'), 'MainActivity.java')), 'MainActivity.java sits in the folder matching its package');
const sdk = (k) => { const m = new RegExp(k + '\\s+(\\d+)').exec(appGradle); return m ? +m[1] : null; };
ok(sdk('compileSdk') === 34 && sdk('targetSdk') === 34 && sdk('minSdk') === 26, 'compileSdk/targetSdk 34, minSdk 26', [sdk('compileSdk'), sdk('targetSdk'), sdk('minSdk')]);
ok(/sourceCompatibility JavaVersion\.VERSION_17/.test(appGradle) && /java-version: '17'/.test(wf), 'Java 17 in Gradle config and in the workflow');
const agp = /id 'com\.android\.application' version '(\d+)\.(\d+)\.(\d+)'/.exec(rootGradle);
const gv = /gradle-version: '(\d+)\.(\d+)(?:\.(\d+))?'/.exec(wf);
ok(agp && gv, 'AGP version and workflow Gradle version are both pinned', [agp && agp[0], gv && gv[0]]);
if (agp && gv) {
  const need = { '8.7': [8, 9], '8.8': [8, 10], '8.9': [8, 11], '8.10': [8, 11], '8.11': [8, 13] }[agp[1] + '.' + agp[2]];
  ok(need && (+gv[1] > need[0] || (+gv[1] === need[0] && +gv[2] >= need[1])), 'pinned Gradle ' + gv[1] + '.' + gv[2] + ' satisfies the minimum for AGP ' + agp[1] + '.' + agp[2], need);
}
ok(/include ':app'/.test(settings) && /google\(\)/.test(settings), 'settings.gradle includes :app and the Google Maven repository');
ok(!/dependencies\s*\{/.test(appGradle), 'no library dependencies (only the Android framework)');
const wwwSrc = /from\(file\('([^']+)'\)\)/.exec(appGradle);
ok(wwwSrc && exists(path.join(APP, wwwSrc[1], 'index.html')), 'syncWww source path resolves to the real www/ folder', wwwSrc && wwwSrc[1]);
ok(/into 'www'/.test(appGradle) && /startsWith\('merge'\)/.test(appGradle) && /dependsOn\('syncWww'\)/.test(appGradle), 'copy lands in assets/www and runs before every asset merge');
ok(!exists(path.join(MAIN, 'assets', 'www')), 'www/ is not duplicated inside the Android project (single source of truth)');

/* ---- MainActivity behaviour and hardening ---- */
ok(java.includes('file:///android_asset/www/index.html'), 'loads the bundled index.html from assets');
ok(/setJavaScriptEnabled\(true\)/.test(java) && /setDomStorageEnabled\(true\)/.test(java), 'JavaScript and DOM storage enabled (the app and its theme memory need them)');
ok(/setAllowFileAccess\(false\)/.test(java) && /setAllowUniversalAccessFromFileURLs\(false\)/.test(java) && /setBlockNetworkLoads\(true\)/.test(java), 'WebView file access and network loads are locked down');
ok(!/addJavascriptInterface/.test(java), 'no JavaScript bridge to native code');
ok(!/setWebContentsDebuggingEnabled\(true\)/.test(java.replace(/if \(debuggable\) \{\s*WebView\.setWebContentsDebuggingEnabled\(true\);/, '')), 'remote debugging only inside the debuggable-build branch');
ok(/#tabs \.tab/.test(java) && /READY tabs=3/.test(java) && /showError\(/.test(java), 'blank-screen guard: waits for three tabs, shows an error otherwise');
ok(/onReceivedError/.test(java) && /isForMainFrame/.test(java) && /onRenderProcessGone/.test(java), 'load errors and renderer crashes are reported on screen');
ok(/getAssets\(\)\.open\("www\/index\.html"\)/.test(java), 'checks that assets/www/index.html is really in the package');
ok(/debuggable && getIntent\(\)/.test(java) && /selftest/.test(java), 'self test is limited to debuggable builds');

/* ---- resources: well-formed XML and every @reference resolves ---- */
function wellFormed(xml) {
  const s = xml.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const stack = []; const re = /<(\/?)([A-Za-z][\w.:-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g; let m, last = 0;
  while ((m = re.exec(s))) {
    if (/[^\s]/.test(s.slice(last, m.index).replace(/[^<>]/g, ''))) return false; // stray < or >
    last = re.lastIndex;
    if (m[4]) continue;
    if (m[1]) { if (stack.pop() !== m[2]) return false; } else stack.push(m[2]);
  }
  return stack.length === 0 && !/<[^>]*$/.test(s.slice(last));
}
const xmlFiles = [];
(function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.xml')) xmlFiles.push(p); }); })(MAIN);
xmlFiles.forEach((f) => ok(wellFormed(read(f)), 'well-formed XML: ' + path.relative(A, f)));
const defined = new Set();
xmlFiles.forEach((f) => {
  const rel = path.relative(path.join(MAIN, 'res'), f).split(path.sep);
  if (rel[0].startsWith('values')) { for (const m of read(f).matchAll(/<(string|color|style|dimen|bool|integer)\s+name="([^"]+)"/g)) defined.add(m[1] + '/' + m[2].replace(/\./g, '_')); }
  else defined.add(rel[0].replace(/-.*$/, '') + '/' + path.basename(f, '.xml'));
});
const missing = [];
xmlFiles.forEach((f) => { for (const m of read(f).matchAll(/"@(?!android:)(\w+)\/([\w.]+)"|>@(?!android:)(\w+)\/([\w.]+)</g)) { const t = m[1] || m[3], nme = (m[2] || m[4]).replace(/\./g, '_'); if (!defined.has(t + '/' + nme)) missing.push(f.split('/').pop() + ': @' + t + '/' + nme); } });
for (const m of java.matchAll(/R\.(string|color|drawable|mipmap)\.(\w+)/g)) if (!defined.has(m[1] + '/' + m[2])) missing.push('MainActivity.java: R.' + m[1] + '.' + m[2]);
for (const m of manifest.matchAll(/"@(?!android:)(\w+)\/([\w.]+)"/g)) { if (!defined.has(m[1] + '/' + m[2].replace(/\./g, '_'))) missing.push('AndroidManifest.xml: @' + m[1] + '/' + m[2]); }
ok(missing.length === 0, 'every @resource and R.* reference resolves to a defined resource', missing);

/* ---- the web app that gets packaged ---- */
const html = read(path.join(root, 'www', 'index.html'));
const refs = [...html.matchAll(/(?:src|href)="([^":#]+)"/g)].map((m) => m[1]);
ok(refs.length >= 10, 'index.html references its scripts and styles', refs.length);
const gone = refs.filter((r) => !exists(path.join(root, 'www', r)));
ok(gone.length === 0, 'every script/stylesheet referenced by index.html exists (they all go into assets/www)', gone);
ok(!/type="module"/.test(html) && !/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, '')), 'index.html uses plain scripts only and no external URLs');

/* ---- scripts ---- */
for (const s of ['ci/verify-apk.sh', 'ci/smoke.sh']) { const r = spawnSync('bash', ['-n', path.join(A, s)]); ok(r.status === 0, 'bash syntax: ' + s, String(r.stderr)); }
{ const r = spawnSync(process.execPath, ['--check', path.join(APP, 'src/debug/assets/selftest.js')]); ok(r.status === 0, 'node --check selftest.js', String(r.stderr)); }

/* ---- workflow (text checks; full YAML parse when python3 + PyYAML exist) ---- */
ok(/workflow_dispatch:/.test(wf) && /assembleDebug/.test(wf) && /upload-artifact@v4/.test(wf) && /AllChemy-debug-apk/.test(wf), 'workflow can be started by hand, builds assembleDebug and uploads AllChemy-debug-apk');
ok(/permissions:\s*\n\s+contents: read/.test(wf), 'workflow token is read-only');
ok(/SKIP_BROWSER_TESTS: '1'/.test(wf) && /web-ui-tests:/.test(wf) && /npm run test:setup|playwright install/.test(wf), 'browser tests run in their own job, not hidden');
ok(/verify-apk\.sh/.test(wf) && !/secrets\./.test(wf), 'APK is verified after the build; no secrets are used');
{
  const py = "import sys,yaml; d=yaml.safe_load(open(sys.argv[1])); assert set(d['jobs'])>={'build-debug-apk','web-ui-tests','android-emulator-smoke'}; print('ok')";
  const r = spawnSync('python3', ['-c', py, wfPath], { encoding: 'utf8' });
  if (r.status === 0) ok(true, 'workflow parses as YAML');
  else if (/No module named|not found|ENOENT/.test(String(r.stderr) + String(r.error))) console.log('note: python3/PyYAML unavailable, YAML parse check skipped (text checks above still ran)');
  else ok(false, 'workflow parses as YAML and has the expected jobs', String(r.stderr).split('\n').slice(-3).join(' '));
}

console.log(bad ? bad + ' of ' + n + ' checks FAILED' : 'android static OK (' + n + ' checks)');
process.exit(bad ? 1 : 0);
