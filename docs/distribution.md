# Distribution: getting a build onto a phone

You told the planning session you haven't decided yet on paying for an
Apple Developer account ($99/yr). The framework is designed so that
decision doesn't block starting, and switching later is a config flip, not
a rebuild.

## Track A — Free (available today, no Apple account)

Apple lets any Apple ID sign iOS apps for free, with limits:

- Builds run via Xcode with a **personal-team** signing certificate.
- Each build is valid for **7 days**, then the app on-device refuses to
  launch until re-installed.
- Only devices you plug into your Mac and register (via Xcode's "Devices
  and Simulators" window) can install it — realistically, just your own
  phone(s). Not workable for "friends and family."

Good for: proving the Capacitor shell works, developing/testing
native-bridge features (push, biometrics) on your own device.

Workflow: `open ios/App.xcworkspace` in Xcode → select your phone as the
target → Run. Re-run weekly (or whenever the 7-day cert expires).

## Track B — TestFlight ($99/yr Apple Developer Program)

Once you enroll:

- Builds are archived and uploaded to **App Store Connect**, then
  distributed via **TestFlight**.
- Internal + external testers: up to **10,000 people** via a public
  install link — this is the "anybody, for me and my friends and family"
  requirement. No cables, no per-device registration; they install the
  TestFlight app once, then your apps' invite links work indefinitely.
- Builds are valid **90 days** before they need a fresh upload (a CI cron
  can automate re-uploads well before expiry).
- No App Store review is required for TestFlight-only distribution (a
  light "beta app review" applies the first time, focused on
  crashes/policy basics — much lighter than full App Store review, and
  nothing here needs an actual public App Store listing).

Workflow: `xcodebuild archive` → export `.ipa` → upload via the App Store
Connect API (`altool` / `xcrun altool --upload-app`, or `fastlane pilot
upload`) → testers get a push/email from TestFlight automatically.

## How the framework abstracts the choice

`capacitor-template/scripts/` (see `roadmap.md` Phase 5 for when these are
built out) reads one setting:

```
DISTRIBUTION=sideload   # Track A — default, no account needed
DISTRIBUTION=testflight # Track B — once you've enrolled
```

`new-app.sh` and `build.sh` behave identically up through "produce a
signed build"; only the last step (install directly vs. upload to App
Store Connect) branches on this flag. Nothing about the native-bridge
plugins, the Capacitor config, or the accounts/auth integration changes
based on which track you're on — so deciding today isn't required, and
upgrading later touches only build scripts and one App Store Connect API
key, not app code.

## What's required from you when you're ready for Track B

1. Enroll at https://developer.apple.com/programs/ ($99/yr, individual or
   organization).
2. Create an App ID + App Store Connect API key (used non-interactively
   by CI).
3. Add the friends/family you want as testers by email in App Store
   Connect (external testing group) — they get a public link, no Apple
   Developer account needed on their end.

None of this blocks Track A work today.
