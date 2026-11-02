import type { DesktopConfig } from '@stacksjs/types'
import process from 'node:process'
import pkg from '../package.json'

/**
 * The Mac app: the stx screens in resources/native drawn by Craft's AppKit
 * host (no web view), a client of the same HTTP API as the website.
 *
 * `buddy dev:desktop` builds it and opens it; `buddy build:desktop` builds
 * it; `bun run release:testflight` ships it (see package.json).
 * `url` is the server the app talks to: production for a production build
 * (`APP_ENV=production`, which every release script sets), the local API
 * otherwise, and `LIBRARY_API_URL` over both.
 *
 * `version` is the marketing version every TestFlight build carries. Until
 * package.json reaches 1.0.0 (`bun run release:major`), the app is still on its
 * way to 1.0.0, so a 0.x package ships as 1.0.0 (n), with n counted by App Store
 * Connect.
 */
const env = process.env
const production = env.APP_ENV === 'production'
const [major] = pkg.version.split('.').map(Number)

export default {
  macos: {
    appName: 'Library',
    bundleId: 'com.stacksjs.library',
    // The Apple Developer team, not a secret: it is in every signed bundle.
    teamId: env.APPLE_TEAM_ID || '3JJRNQW6B7',
    version: (major ?? 0) < 1 ? '1.0.0' : pkg.version,
    buildNumber: env.APPLE_BUILD_NUMBER || '1',
    minimumSystemVersion: '13.0',
    category: 'public.app-category.productivity',
    url: env.LIBRARY_API_URL || (production ? 'https://library.stacksjs.com' : 'http://127.0.0.1:3408'),
    nativeScreens: ['Main', 'Settings'],
    nativeScreensDir: 'resources/native',
    initialScreen: 'Main',
    // The sign-in token lives in the Keychain under `auth.token`, which is what
    // `craft.session` reads; nothing else is shared.
    shareStorage: { auth_token: 'auth.token' },
    window: { width: 1180, height: 760, minWidth: 860, minHeight: 540 },
    icon: 'resources/native/icon/AppIcon-1024.png',
    sandbox: true,
    privacy: {
      tracking: false,
      collectedDataTypes: [
        { type: 'NSPrivacyCollectedDataTypeEmailAddress', linked: true, tracking: false, purposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
        { type: 'NSPrivacyCollectedDataTypeName', linked: true, tracking: false, purposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
        { type: 'NSPrivacyCollectedDataTypeOtherUserContent', linked: true, tracking: false, purposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
      ],
      accessedApiTypes: [
        { type: 'NSPrivacyAccessedAPICategoryUserDefaults', reasons: ['CA92.1'] },
        { type: 'NSPrivacyAccessedAPICategoryFileTimestamp', reasons: ['C617.1'] },
      ],
    },
  },
} satisfies DesktopConfig
