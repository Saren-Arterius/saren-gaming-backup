# Saren Gaming Backup

A desktop GUI utility for managing btrfs snapshot backups across multiple devices. It acts as a central hub to pull and push snapshots using `baksnapper`, specifically designed to consolidate backups onto a large storage drive (e.g., a 22TB HDD).

## Features

- **Proton Native GUI**: A cross-platform desktop interface built with React and Proton Native.
- **Btrfs Snapshot Management**: Leverages `baksnapper` for efficient btrfs send/receive operations.
- **Push/Pull Support**: Supports both local "push" tasks and remote "pull" tasks over SSH.
- **Real-time Progress**: Tracks overall disk progress and individual snapshot progress.
- **Automated Cleanup**: Cleans up empty snapshot directories and metadata after backup.
- **System Integration**: Option to automatically shut down the system after backup completion.
- **Web API**: Includes a built-in Bun server (port 4000) to expose backup progress via a JSON API.

## Prerequisites

- [Bun](https://bun.sh/) runtime.
- `baksnapper` and `baksnapperd` installed on the system.
- Btrfs filesystem for backup destinations.
- SSH access for remote pull tasks.

## Setup

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Apply patches**:
   This project uses patches for `proton-native` and `node-qt-napi`.
   ```bash
   bun x patch-package
   ```

3. **Rebuild native modules**:
   ```bash
   cd node_modules/node-qt-napi && bun x node-pre-gyp rebuild --fallback-to-build
   ```

4. **Configuration**:
   Edit `config.json` to define your backup tasks, hostname patterns, and mount points.

## Usage

Run the application using the provided start script:

```bash
./start.sh
```

Or via Bun:

```bash
bun index.js
```

## Architecture

- **Frontend**: React components rendered via `proton-native`.
- **State Management**: MobX for reactive UI updates.
- **Backend**: Node.js child processes (`spawn`, `exec`) to interface with system commands.
- **API**: Bun.serve provides a lightweight status API.
