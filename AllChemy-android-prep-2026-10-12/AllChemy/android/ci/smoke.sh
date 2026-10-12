#!/usr/bin/env bash
# Emulator smoke test, run by .github/workflows/android-debug.yml inside reactivecircus/android-emulator-runner.
# Installs the DEBUG apk, launches it with the debug-only self-test flag and waits for the log lines written by MainActivity:
#   AllChemyBoot     READY tabs=3          -> the page loaded and built its three tabs (no blank screen / script error)
#   AllChemySelfTest SELFTEST PASS n/n      -> assets/selftest.js drove Formula, Equation and Structure inside the real WebView
# Output (logs + screenshot) goes to smoke-out/ so the workflow can upload it.
# Usage: smoke.sh path/to/AllChemy-debug.apk
set -uo pipefail

APK="${1:?usage: smoke.sh path/to/apk}"
PKG="com.allchemy.app"
OUT="${GITHUB_WORKSPACE:-.}/smoke-out"
mkdir -p "$OUT"

adb wait-for-device
adb shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done'
adb install -r "$APK" || { echo "install failed"; exit 1; }
adb logcat -c
adb shell am start -n "$PKG/.MainActivity" --ez selftest true

deadline=$((SECONDS + 150))
while [ "$SECONDS" -lt "$deadline" ]; do
  adb logcat -d > "$OUT/logcat-full.txt"
  if grep -q "AllChemySelfTest" "$OUT/logcat-full.txt" || grep -q "AllChemyBoot.*FAILED" "$OUT/logcat-full.txt"; then break; fi
  sleep 3
done

adb exec-out screencap -p > "$OUT/screenshot.png" || true
grep -E "AllChemyBoot|AllChemySelfTest|AllChemyJS|AndroidRuntime|FATAL" "$OUT/logcat-full.txt" > "$OUT/logcat-allchemy.txt" || true
echo "---- AllChemy log lines ----"; cat "$OUT/logcat-allchemy.txt"; echo "----------------------------"

ok=0
grep -q "AllChemyBoot.*READY tabs=3" "$OUT/logcat-full.txt" || { echo "FAIL: no READY line (blank screen or script error)"; ok=1; }
grep -q "AllChemySelfTest.*SELFTEST PASS" "$OUT/logcat-full.txt" || { echo "FAIL: self test did not pass"; ok=1; }
grep -q "FATAL EXCEPTION" "$OUT/logcat-full.txt" && { echo "FAIL: app crashed"; ok=1; }
[ "$ok" -eq 0 ] && echo "SMOKE TEST PASSED"
exit "$ok"
