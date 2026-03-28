# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@iobroker/dm-utils` is a TypeScript utility library for building device management backends in ioBroker adapters. It provides an abstract `DeviceManagement` class that adapter authors extend to expose devices, actions, and controls to the ioBroker device-manager UI tab. Communication between the UI and adapter happens via ioBroker's `sendTo` message system using the `dm:` prefix.

## Build & Development Commands

- **Build:** `npm run build` (TypeScript compilation, output in `build/`)
- **Lint:** `npm run lint` (ESLint with flat config)
- **Format:** `npm run prettier`
- **Update JSON config types:** `npm run updateCommonTs` (downloads latest types from ioBroker json-config repo into `src/types/common.ts` between markers)
- **Release:** `npm run release-patch`, `release-minor`, or `release-major` (uses @alcalzone/release-script; runs build before commit)
- **No meaningful test suite** — `test:package` is a no-op (`exit 0`)

## Architecture

### Core module: `src/DeviceManagement.ts`

Abstract generic class `DeviceManagement<TAdapter, TId>` that:
- Registers an `onMessage` handler on the ioBroker adapter to route all `dm:*` commands
- Provides `DeviceLoadContext<TId>` for incremental device loading with batching (min 8 devices per flush)
- Provides `MessageContext<TId>` implementing `ActionContext` for user interaction (dialogs, progress bars, forms)
- Subclasses must override `loadDevices(context)` and optionally `getInstanceInfo()`, `getDeviceDetails(id)`, `getDeviceStatus(id)`, `getDeviceInfo(id)`

### Type system: `src/types/`

- **`base.ts`** — Discriminated union pattern: `ActionBase<'api' | 'adapter'>` separates handler-bearing adapter types from serializable API types. Handler properties only exist in `'adapter'` variant; `disabled` flag only in `'api'` variant.
- **`common.ts`** — Contains auto-generated sections (between `// --- GENERATED` markers) synced from ioBroker json-config repo via `tasks.ts`. Don't edit generated sections manually.
- **`adapter.ts`** — Adapter-side type aliases (with handlers)
- **`api.ts`** — API/wire format types (without handlers)
- **`errorCodes.ts`** — Structured error codes: 1xx = instance actions, 2xx = device actions, 3xx = device controls, 4xx = device state

### Exports

`src/index.ts` re-exports: `DeviceManagement` class, `ActionContext` type, and all types from `./types`. Types use `export type *` to ensure they're erased at runtime.

### Key patterns

- **`RetVal<T>` = `T | Promise<T>`** — All handler return types support sync or async
- **`ValueOrState<T>` / `ValueOrObject<T>`** — Device properties can be literal values OR references to ioBroker states/objects for live updates
- **`sendCommandToGui()`** — Backend-initiated push to GUI (add/update/delete devices, update status)
- **Reserved action IDs:** `'status'` (click on status icon), `'enable'`/`'disable'` (toggle enabled state)

## Important Conventions

- The `dm:` message prefix is reserved — adapters must not handle `dm:*` messages themselves
- `io-package.json` must declare `common.supportedMessages.deviceManager: true`
- The library validates for duplicate action/control IDs at runtime
- API version must be `"v3"` (returned from `getInstanceInfo()`)
- Device refresh responses use string literals: `'all'`, `'devices'`, `'instance'`, `'none'` (not booleans — changed in v3)
