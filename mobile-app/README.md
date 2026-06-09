# School Camera — Parent Mobile App

Flutter parent app for the School Camera platform. Phase 1 provides the app foundation only (no real auth or video playback yet).

## Requirements

- Flutter stable (3.35+)
- Android SDK for Android builds

## Setup

```bash
cd mobile-app
flutter pub get
```

## Run

Default (production API):

```bash
flutter run
```

Custom API base URL:

```bash
flutter run --dart-define=API_BASE_URL=https://camera.iglooks.com/api
```

Environment override:

```bash
flutter run --dart-define=APP_ENV=development --dart-define=API_BASE_URL=https://camera.iglooks.com/api
```

## Quality checks

```bash
flutter analyze
flutter test
flutter build apk --debug
```

## Project structure

```
lib/
  app/           # App shell, theme, router
  core/          # Config, network, storage, widgets, utils
  features/      # Feature modules (splash, auth, home)
```

## Phase 1 scope

- Riverpod, GoRouter, Dio, secure storage scaffolding
- Parent-friendly theme and reusable UI components
- Global `AppError` + `mapDioError` for backend codes

## Phase 2 scope (auth)

- Real parent login (`POST /auth/login`)
- Secure token storage (access + refresh + user JSON)
- Session restore on launch (`POST /auth/refresh` + `GET /auth/me`)
- Dio bearer interceptor with single 401 refresh retry
- Logout (`POST /auth/logout` + clear storage)
- **PARENT role only** — admin/technician accounts are rejected
- Blocked/disabled accounts rejected with friendly messages
- Device name + stable fingerprint on login

## Not yet implemented

- Children, cameras, live HLS, timeline playback
- Subscriptions, push notifications, biometrics

## API

Production base URL: `https://camera.iglooks.com/api`

Bundle ID placeholder: `com.iglooks.schoolcamera`
