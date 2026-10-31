# Library for the Mac App Store

The Mac app is a native AppKit app (Craft's host drawing the stx screens in
`resources/native`, no web view) and a client of the same HTTP API as the
website. It is declared in `config/desktop.ts`; the framework builds,
sandboxes, signs and packages it.

| | |
|---|---|
| Name | Library |
| Bundle id | `com.stacksjs.library` |
| Team | `3JJRNQW6B7` (not a secret) |
| Category | `public.app-category.productivity` |
| Minimum macOS | 13.0 |
| Icon | `resources/native/icon/AppIcon-1024.png`, made by `swift scripts/make-app-icon.swift` |
| Server | `LIBRARY_API_URL` at build time (default `http://127.0.0.1:3408`) |

## Commands

```bash
./buddy dev:desktop                  # build the development app and open it
./buddy build:desktop                # storage/framework/desktop/macos/Library.app (ad hoc signed)
./buddy desktop:apple:doctor         # what is missing for the Store, by name
./buddy desktop:apple:package        # sandboxed, Store-signed .pkg (needs the credentials below)
./buddy desktop:apple:publish --validate-only   # the same, validated by App Store Connect
```

Point a Store build at production with `LIBRARY_API_URL=https://... ./buddy desktop:apple:package`.
The first build installs the pinned Zig through Pantry and builds the zig-js
engine into `~/.cache/craft/toolchain`; later builds reuse them.

## What the Store bundle contains

- `Contents/MacOS/Library`: Craft's AppKit host, hardened runtime, no private
  APIs, no WebKit or JavaScriptCore linked.
- Entitlements: `com.apple.security.app-sandbox`, `com.apple.security.network.client`,
  `com.apple.application-identifier` (`3JJRNQW6B7.com.stacksjs.library`),
  `com.apple.developer.team-identifier`, `keychain-access-groups`
  (`3JJRNQW6B7.com.stacksjs.library`). The sign-in token is a Keychain item in that group.
- `Info.plist`: `LSApplicationCategoryType`, `LSMinimumSystemVersion`,
  `ITSAppUsesNonExemptEncryption = false`, `CFBundleIconFile`, versions.
- `Resources/PrivacyInfo.xcprivacy`: no tracking; email address, name and user
  content collected for app functionality (linked to the account); UserDefaults
  (CA92.1) and file timestamp (C617.1) required-reason APIs.
- `Resources/AppIcon.icns`, from the 1024 pixel master.
- `Contents/embedded.provisionprofile`.

Verified locally: the same bundle signed ad hoc **with the sandbox on** launches,
draws the sign-in screen, reaches the network client and keeps a Keychain item
across relaunches. What cannot be verified without the credentials is Apple's
own validation and the data-protection Keychain with the real access group.

## Credentials: what is required, what is present

Nothing below is committed. Variables are read by `desktop:apple:*`
(`buddy desktop:apple:doctor` lists whatever is missing).

| Needed | Variable | Status on this Mac |
|---|---|---|
| Bundle id registered with the Mac platform, Keychain Sharing off (the group is the app id) | n/a | being registered by the owner |
| Mac App Store provisioning profile for `com.stacksjs.library` | `APPLE_PROVISIONING_PROFILE` (path to the `.provisionprofile`) | **missing** |
| App signing identity (`Apple Distribution` or `3rd Party Mac Developer Application`) | `APPLE_APP_SIGNING_IDENTITY` | `Apple Distribution: Chris Breuer (3JJRNQW6B7)` is in the login keychain |
| Installer signing identity (`3rd Party Mac Developer Installer` / `Mac Installer Distribution`) | `APPLE_INSTALLER_SIGNING_IDENTITY` | **missing**: not in the keychain (only the Apple Development, two Developer ID Application and the Apple Distribution identities) |
| App Store Connect API key id, issuer id and `.p8` | `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_PATH` | **missing** (none set); only for `desktop:apple:publish`/validation and `desktop:apple:provision` |
| Build number that grows with each upload | `APPLE_BUILD_NUMBER` (default 1 in `config/desktop.ts`) | per upload |

`buddy desktop:apple:provision --plan` (with the API key) reports the Bundle ID,
capability, certificate and profile diff without changing anything, and `--apply`
creates what is missing. The Mac Installer Distribution certificate needs a CSR:
`buddy desktop:apple:csr` makes the key and request locally; the private key
never leaves the machine.

App Store Connect records (app listing, screenshots, privacy answers, review
notes, a demo account for review because the app needs an account) are made in
App Store Connect and are outside this repository.

## Known limits

- Single architecture: the host is built for the machine running the build
  (`--universal` is not supported for native apps yet).
- The development app (`build:desktop`) is signed ad hoc and not sandboxed, so it
  can use the login Keychain without a profile; only `desktop:apple:package`
  builds the sandboxed one.
