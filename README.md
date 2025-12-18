# Saren Gaming Backup

A backup utility for pulling btrfs snapshots from all devices I own into my 22TB HDD connected to my gaming PC.

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Apply patches:
   ```bash
   bun x patch-package
   ```

3. Rebuild native modules:
   ```bash
   cd node_modules/node-qt-napi && bun x node-pre-gyp rebuild --fallback-to-build
   ```

## Usage

```bash
./start.sh
```
