# EAS Development Build Instructions (Phase 1, v1.3)

> **Audience:** the developer running v1.3 Phase 1.
> **Scope:** produce installable iOS and Android development builds so the rest of Phase 1 (notification action buttons, differentiated channels, deep links from pushes) can be smoke-tested on real devices.
> **Per D-09:** Claude does **not** run `eas` commands and does **not** modify `eas.json`. This file is the runbook; you run the commands.
> **Per D-10:** This file lives inside the phase folder on purpose. Promote it to top-level `docs/` only after v1.3 ships.

---

## Why an EAS dev build is required (v1.3)

Expo Go is no longer sufficient for v1.3 push work. Specifically:

- **iOS notification action buttons** (Free / Busy / Maybe morning prompt) **do not render in Expo Go** — they require a custom dev client where iOS notification categories can be registered at module scope.
- **Differentiated Android channels** (`plan_invites` MAX, `friend_free` HIGH, `morning_prompt` DEFAULT, `system` LOW) are not introspectable from Expo Go — you cannot verify importance/sound configuration.
- **`Notifications.setNotificationCategoryAsync` for remote push** is unreliable in Expo Go on iOS even when it appears to register.
- Per **D-11**, this build is the **FIRST deliverable of Phase 1**, not the last — every subsequent client-side smoke test in this phase depends on it existing.

If you skip this step, you will reach Plan 04 / Plan 05 and discover that nothing testable works on Expo Go and you have to come back here anyway.

---

## Prerequisites

Before running any `eas` command:

1. **`eas-cli` installed** (one of):
   ```bash
   npm install -g eas-cli
   # or, ad-hoc:
   npx eas-cli@latest --version
   ```
2. **Logged in to your Expo account:**
   ```bash
   eas login
   ```
   Use the Expo account that owns (or has access to) the campfire project.
3. **`EAS_PROJECT_ID` configured.** `app.config.ts` already reads `process.env.EAS_PROJECT_ID` and falls back to the literal `'YOUR_EAS_PROJECT_UUID'`. Either:
   - export `EAS_PROJECT_ID=<uuid>` in your shell before running `eas build`, OR
   - run `eas init` once (writes `extra.eas.projectId` into config — see Troubleshooting if you don't want to commit that).
4. **Apple Developer account** for iOS — EAS handles provisioning automatically; you do not need to create profiles by hand.
5. **Android keystore** — EAS will generate one on the first Android build and store it in your Expo account; nothing for you to do up front.
6. **Working tree is clean enough to build** — `npm install` has been run from repo root and there are no broken type errors that would crash the dev client at startup.

---

## Commands

Run from the repo root.

```bash
# 1. Ensure dependencies are clean
npm install

# 2. Initialize EAS if you have never done so on this machine.
#    SKIP this if eas.json already exists in the repo root.
eas init

# 3. iOS development build (5–15 minutes on EAS infra)
eas build --profile development --platform ios

# 4. Android development build (5–15 minutes on EAS infra)
eas build --profile development --platform android

# 5. EAS prints a downloadable .ipa / .apk URL when each build finishes.
#    Keep both URLs handy for the sign-off below.
```

You can run the iOS and Android builds back-to-back; EAS queues them independently.

---

## Installing on test devices

### iOS

- **Real iPhone:** open the build URL in Safari on the device, tap install. The development provisioning profile EAS generated lets you side-load directly — no TestFlight required.
- **iOS simulator:** use `eas build:run -p ios --latest` after the build finishes to download and launch the build into your local simulator.

### Android

- **Real Android device:** download the `.apk` from the build URL, enable "Install from unknown sources" for your browser, tap the file to install.
- **Android emulator:** any emulator image with Google Play Services will work; drag the `.apk` onto the emulator window or `adb install <path>.apk`.

---

## Smoke check (after install)

Once both builds are installed, confirm the dev client is healthy *before* moving on to Plan 02:

- [ ] App launches past the splash screen on iOS
- [ ] App launches past the splash screen on Android
- [ ] Login (email/password or Google/Apple) succeeds on both
- [ ] You can navigate to the Home tab and see at least one friend card
- [ ] (Optional, only after Plan 04 ships) Push token registers — verify in Supabase:
  ```sql
  select * from push_tokens where user_id = '<your-id>';
  ```
  Should return at least one row per device once Plan 04 wires the session-ready registration. Until then, just confirm the app launches.

If any of the above fails, **do not start Plan 02** — fix the dev client first or update this runbook with the failure mode so the next attempt is unblocked.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Project ID not found` / `Invalid UUID 'YOUR_EAS_PROJECT_UUID'` | `EAS_PROJECT_ID` env var not set and `eas init` never run | Run `eas init` to write `extra.eas.projectId` into `app.config.ts`, **or** export `EAS_PROJECT_ID=<uuid>` in your shell and re-run the build |
| `expo-notifications plugin missing icon/color` warning | Plugin is registered as a bare string in `app.config.ts` | Expected for now; **Plan 03 of this phase** converts the plugin entry to tuple form with icon + color options. Safe to ignore for the dev build. |
| iOS provisioning errors mid-build | Stale credentials in your Expo account | Run `eas credentials` and let EAS regenerate the development provisioning profile |
| Android keystore errors mid-build | First build on a new Expo account | Run `eas credentials --platform android`, accept the offer to generate a new keystore |
| Build queue takes >30 minutes | EAS free-tier queue depth | Acceptable; v1.3 dev builds are not time-critical. Avoid retrying — duplicate jobs make it worse. |
| iOS install fails with "Unable to download app" | Device does not trust the development cert | Settings → General → VPN & Device Management → trust the developer profile |

---

## v1.3 constraint reminder

- **Claude does NOT run `eas` commands** per **D-09**. The user (you) runs them after reading this file.
- **This file lives in `.planning/phases/01-push-infrastructure-dm-entry-point/`** per **D-10**, *not* in `docs/` or `README.md`. Promote later only if v1.3 dogfooding shows it is broadly useful.
- **EAS dev build is the FIRST deliverable of Phase 1** per **D-11**. Every subsequent client-side smoke test depends on it.

---

## Sign-off checklist

Tick all boxes before starting **Plan 02 (push_tokens schema migration)**.

- [ ] iOS dev build installed on a real iPhone (or running in a local simulator via `eas build:run`)
- [ ] Android dev build installed on a real Android device (or an emulator with Google Play Services)
- [ ] App launches and login works on **both** platforms
- [ ] Build URLs are recorded somewhere you can find them again (paste them into the Phase 1 plan thread or your notes)

When all four are ticked, reply to the Phase 1 thread with `build done` and the two build URLs (or describe the failure so this runbook can be updated).
