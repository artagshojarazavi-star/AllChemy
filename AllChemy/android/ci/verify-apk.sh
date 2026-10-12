#!/usr/bin/env bash
# Checks a built APK before it is published as an artifact. Fails (exit 1) when:
#   - any file under AllChemy/www is missing from assets/www/ inside the APK (would give a blank/half-working app)
#   - the package name or label is not what the project promises
#   - the APK requests the INTERNET permission (the app is offline-only by design)
# Usage: verify-apk.sh path/to/app-debug.apk     (run from the repository root)
set -euo pipefail

APK="${1:?usage: verify-apk.sh path/to/app.apk}"
WWW="AllChemy/www"
[ -f "$APK" ] || { echo "APK not found: $APK"; exit 1; }
[ -d "$WWW" ] || { echo "run this from the repository root (cannot find $WWW)"; exit 1; }

fail=0
listing="$(unzip -Z1 "$APK")"

echo "== assets: every file of $WWW must be inside the APK as assets/www/... =="
checked=0
while IFS= read -r f; do
  rel="${f#"$WWW"/}"
  if ! grep -Fxq "assets/www/$rel" <<<"$listing"; then
    echo "MISSING in APK: assets/www/$rel"
    fail=1
  fi
  checked=$((checked + 1))
done < <(find "$WWW" -type f | sort)
echo "checked $checked files"
grep -Fxq "assets/www/index.html" <<<"$listing" || { echo "MISSING: assets/www/index.html"; fail=1; }
if grep -Fxq "assets/selftest.js" <<<"$listing"; then echo "debug self-test script present (expected in a debug APK)"; fi

echo "== manifest (aapt2) =="
AAPT2="$(ls "${ANDROID_HOME:-/usr/local/lib/android/sdk}"/build-tools/*/aapt2 2>/dev/null | sort -V | tail -1 || true)"
if [ -z "$AAPT2" ]; then
  echo "aapt2 not found under ANDROID_HOME/build-tools – cannot inspect the manifest"
  fail=1
else
  badging="$("$AAPT2" dump badging "$APK")"
  echo "$badging" | grep -E "^package:|^application-label:|^sdkVersion|^targetSdkVersion|^launchable-activity" || true
  grep -q "package: name='com.allchemy.app'" <<<"$badging" || { echo "unexpected package name"; fail=1; }
  grep -q "application-label:'AllChemy'" <<<"$badging" || { echo "unexpected app label"; fail=1; }
  perms="$("$AAPT2" dump permissions "$APK" || true)"
  echo "permissions reported:"; echo "$perms"
  if grep -q "android.permission.INTERNET" <<<"$perms"; then echo "FORBIDDEN: INTERNET permission present"; fail=1; fi
fi

echo "== signature / size =="
ls -l "$APK"
sha256sum "$APK"

if [ "$fail" -ne 0 ]; then echo "APK VERIFICATION FAILED"; exit 1; fi
echo "APK VERIFICATION PASSED"
