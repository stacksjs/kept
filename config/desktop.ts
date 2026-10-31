import type { DesktopConfig } from '@stacksjs/types'
import process from 'node:process'
import pkg from '../package.json'

/**
 * The Mac app: the stx screens in resources/native drawn by Craft's AppKit
 * host (no web view), a client of the same HTTP API as the website.
 *
 * `buddy dev:desktop` builds it and opens it; `buddy build:desktop` builds
 * it; `buddy desktop:apple:package` makes the sandboxed Mac App Store package.
 * `url` is the server the app talks to: set `LIBRARY_API_URL` at build time to
 * point a build at production, the default is the local API.
 */
const env = process.env

export default {
  macos: {
    appName: 'Library',
    bundleId: 'com.stacksjs.library',
    // The Apple Developer team, not a secret: it is in every signed bundle.
    teamId: env.APPLE_TEAM_ID || '3JJRNQW6B7',
    version: pkg.version === '0.0.0' ? '1.0.0' : pkg.version,
    buildNumber: env.APPLE_BUILD_NUMBER || '1',
    minimumSystemVersion: '13.0',
    category: 'public.app-category.productivity',
    url: env.LIBRARY_API_URL || env.KEPT_API_URL || 'http://127.0.0.1:3408',
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
