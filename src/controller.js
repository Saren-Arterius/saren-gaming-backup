import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import fs from 'node:fs';
import { runInAction } from 'mobx';
import { store } from './store';
import { sleep } from './utils';
import config from '../config.json';

const execAsync = promisify(exec);

class Controller {
    forceStopped = false;
    currentTaskSnapshots = null;

    checkProcessLoop = async () => {
        try {
            const { stdout } = await execAsync('pgrep -f baksnapper');
            store.isCheckingProcess = !!stdout;
        } catch (e) {
            store.isCheckingProcess = false;
        } finally {
            setTimeout(this.checkProcessLoop, 2000);
        }
    };

    handleData = (dataChunk) => {
        const d = dataChunk.toString();
        if (d.includes('dbus-launch')) return;

        const newLines = d.trim().split('\n');
        store.outputLines.push(...newLines);

        if (!store.progress.currentDisk) return;

        // Progress tracking
        for (const line of newLines) {
            const match = line.match(/At subvol .*\/\.?snapshots\/(\d+)\/snapshot/);
            if (!match) continue;

            const snapId = match[1].trim();
            const key = `${store.progress.currentDisk}|${snapId}`;

            if (store.handledSnapshots.has(key)) continue;

            // Check if this snapshot is in our current task list
            const taskSnaps = store.tasks[store.progress.currentDisk] || [];
            if (taskSnaps.includes(snapId)) {
                store.handledSnapshots.add(key);
            }
        }
    };

    log = (msg) => {
        store.outputLines.push(msg);
        console.log(msg);
    };

    validateConfig = () => {
        if (!config) throw new Error("Configuration is missing.");
        if (!config.hostname_pattern) throw new Error("config.hostname_pattern is required.");
        if (!config.backup_mount) throw new Error("config.backup_mount is required.");
        if (typeof config.min_storage_size_tb !== 'number') throw new Error("config.min_storage_size_tb must be a number.");
        if (!Array.isArray(config.tasks)) throw new Error("config.tasks must be an array.");

        config.tasks.forEach((task, i) => {
            if (!task.name) throw new Error(`Task at index ${i} is missing a name.`);
            if (!task.config) throw new Error(`Task '${task.name}' is missing a config.`);
            if (!task.dest && !task.dest_pattern) throw new Error(`Task '${task.name}' is missing a destination.`);
        });

        if (config.cleanup_paths && !Array.isArray(config.cleanup_paths)) {
            throw new Error("config.cleanup_paths must be an array.");
        }
    };

    runCommand = (command, args = []) => {
        if (!command || command.trim() === '') {
            return Promise.reject(new Error("Attempted to run an empty command."));
        }

        return new Promise((resolve, reject) => {
            const process = spawn(command, args);
            store.backupProcess = process;

            process.stdout.on('data', this.handleData);
            process.stderr.on('data', this.handleData);

            process.on('close', (code) => {
                store.backupProcess = null;
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Command ${command} ${args.join(' ')} exited with code ${code}`));
                }
            });
        });
    };

    listSnapshots = async (path, remote = null) => {
        const cmd = remote
            ? `sudo ssh -o ConnectTimeout=5 "${remote}" list-snapshots "${path}"`
            : `sudo baksnapperd list-snapshots "${path}"`;
        const { stdout } = await execAsync(cmd);
        return stdout.trim().split('\n').filter(Boolean);
    };

    getSnapperRoot = async (configName, remote = null) => {
        const cmd = remote
            ? `sudo ssh -o ConnectTimeout=5 "${remote}" get-snapper-root "${configName}"`
            : `sudo baksnapperd get-snapper-root "${configName}"`;
        const { stdout } = await execAsync(cmd);
        return stdout.trim();
    };

    getTaskSnapshots = async (task) => {
        let srcSnapshots = [];
        let destSnapshots = [];

        if (task.type === 'pull') {
            const parts = task.dest.split(':');
            if (parts.length < 2) throw new Error(`Invalid pull destination: ${task.dest}`);
            const remote = parts[0];
            const remotePath = parts[1];

            const remoteRoot = await this.getSnapperRoot(task.config, remote) + '/.snapshots';
            srcSnapshots = await this.listSnapshots(remoteRoot, remote);
            destSnapshots = await this.listSnapshots(`${remotePath}/${task.config}`);
        } else {
            const srcRoot = await this.getSnapperRoot(task.config) + '/.snapshots';
            srcSnapshots = await this.listSnapshots(srcRoot);
            destSnapshots = await this.listSnapshots(`${task.dest}/${task.config}`);
        }

        const onlyInSrc = srcSnapshots.filter(s => !destSnapshots.includes(s));
        return task.all ? onlyInSrc : (onlyInSrc.length > 0 ? [onlyInSrc[onlyInSrc.length - 1]] : []);
    };

    performPreBackupChecks = async () => {
        this.validateConfig();

        const hostname = os.hostname();
        if (!hostname.includes(config.hostname_pattern)) {
            throw new Error(`This script can only be run on a host with '${config.hostname_pattern}' in its name.`);
        }

        if (config.backup_mount === '/' || config.backup_mount.trim() === '') {
            throw new Error("Invalid backup_mount path.");
        }

        const { stdout: dfOutput } = await execAsync(`df -B1 "${config.backup_mount}" | awk "NR==2 {print \\$2}"`);
        const storageSize = parseInt(dfOutput.trim(), 10);
        const minSize = config.min_storage_size_tb * 1024 * 1024 * 1024 * 1024;

        if (isNaN(storageSize) || storageSize < minSize) {
            throw new Error(`${config.backup_mount} capacity is less than ${config.min_storage_size_tb}TB or not mounted.`);
        }

        this.log("All checks passed. Proceeding with backup...");
        return hostname;
    };

    prepareTasks = (hostname) => {
        const tasks = config.tasks.map(t => ({
            ...t,
            dest: t.dest || (t.dest_pattern ? t.dest_pattern.replace('{hostname}', hostname) : '')
        })).filter(t => t.dest !== '');

        if (tasks.length === 0) {
            throw new Error("No valid backup tasks found after processing configuration.");
        }
        return tasks;
    };

    calculateInitialSnapshots = async (tasks) => {
        this.log("Calculating total snapshots...");
        store.tasks = {};

        for (const task of tasks) {
            try {
                const snapshotsToBackup = await this.getTaskSnapshots(task);
                store.tasks[task.name] = snapshotsToBackup;
                this.log(`Found ${snapshotsToBackup.length} snapshots to backup for ${task.name}`);
            } catch (e) {
                this.log(`Warning: Could not count snapshots for ${task.name}: ${e.message}`);
                store.tasks[task.name] = [];
            }
        }
    };

    executeTask = async (task) => {
        const args = ['--config', task.config];
        if (task.all) args.push('--all');
        if (task.link) args.push('--link');
        if (task.prune) args.push('--prune');
        if (task.type) args.push('--type', task.type);
        args.push(task.dest);

        for (let attempt = 1; attempt <= 5; attempt++) {
            if (this.forceStopped) break;

            try {
                const currentSnaps = await this.getTaskSnapshots(task);
                const knownSnaps = store.tasks[task.name] || [];

                // Update store.tasks based on current reality
                const newSnaps = currentSnaps.filter(s => !knownSnaps.includes(s));
                const deletedSnaps = knownSnaps.filter(s => !currentSnaps.includes(s) && !store.handledSnapshots.has(`${task.name}|${s}`));

                if (newSnaps.length > 0 || deletedSnaps.length > 0) {
                    if (newSnaps.length > 0) this.log(`Found ${newSnaps.length} new snapshots for ${task.name}`);
                    if (deletedSnaps.length > 0) this.log(`Detected ${deletedSnaps.length} deleted snapshots for ${task.name}`);

                    // Update the task list in store, keeping handled ones if they are still in currentSnaps
                    store.tasks[task.name] = currentSnaps;
                }
            } catch (e) {
                this.log(`Warning: Could not update snapshots for ${task.name}: ${e.message}`);
            }

            try {
                this.log(`Attempt ${attempt} for ${task.name}...`);
                await this.runCommand('sudo', ['baksnapper', ...args]);
            } catch (err) {
                if (this.forceStopped) break;
                this.log(`Attempt ${attempt} failed: ${err.message}`);
            } finally {
                // After an attempt, we should re-check what was actually backed up
                // but handleData already does this via stdout parsing.
                // We can do a final sync here if needed.
                if (attempt < 5 && !this.forceStopped) {
                    await sleep(2000);
                }
            }
        }
    };

    runCleanup = async () => {
        this.log("\nRunning cleanup...");
        store.progress.currentTask = 'Cleaning up...';
        const paths = config.cleanup_paths || [];
        for (const cleanupPath of paths) {
            if (!cleanupPath || cleanupPath.trim() === '' || cleanupPath === '/') continue;
            try {
                await execAsync(`cd "${cleanupPath}" && sudo find . -maxdepth 4 -name "info.xml" -size 0 -delete`);
                await execAsync(`cd "${cleanupPath}" && sudo find . -maxdepth 4 -name "info.xml" -type f -exec sh -c '[ ! -d "$(dirname "{}")/snapshot" ]\' \\; -delete`);
                await execAsync(`cd "${cleanupPath}" && sudo rmdir */*/* || true`);
            } catch (e) {
                this.log(`Warning: Cleanup failed for ${cleanupPath}: ${e.message}`);
            }
        }
    };

    runBackup = async () => {
        runInAction(() => {
            store.isBackupRunning = true;
        });
        const lockFile = '/tmp/baksnapper.lock';
        let isStale = false;

        if (fs.existsSync(lockFile)) {
            const pid = parseInt(fs.readFileSync(lockFile, 'utf8'), 10);
            try {
                process.kill(pid, 0);
                this.log(`Backup is already running (PID: ${pid}).`);
                runInAction(() => {
                    store.isBackupRunning = false;
                });
                return;
            } catch (e) {
                isStale = true;
                this.log(`Stale lock file found (PID: ${pid} is not running). Overwriting...`);
            }
        }

        try {
            fs.writeFileSync(lockFile, process.pid.toString());
        } catch (e) {
            this.log(`Warning: Could not create lock file: ${e.message}`);
        }

        runInAction(() => {
            this.forceStopped = false;
            store.outputLines = [];
            store.handledSnapshots.clear();
            store.tasks = {};
            store.progress = {
                currentTask: 'Validating configuration...',
                currentDisk: '',
                totalDisks: 0,
                completedDisks: 0,
                percent: 0
            };
        });

        try {
            const hostname = await this.performPreBackupChecks();
            const tasks = this.prepareTasks(hostname);
            await this.calculateInitialSnapshots(tasks);

            store.progress.totalDisks = tasks.length;

            for (let i = 0; i < tasks.length; i++) {
                if (this.forceStopped) break;
                const task = tasks[i];
                store.progress.currentDisk = task.name;
                store.progress.completedDisks = i;
                store.progress.percent = Math.round((i / tasks.length) * 100);

                this.log(`\nStarting task: ${task.name}`);
                await this.executeTask(task);
            }

            await this.runCleanup();

            if (this.forceStopped) {
                this.log("\nBackup was stopped by user.");
            } else {
                store.progress.completedDisks = tasks.length;
                store.progress.percent = 100;
                this.log("\nBackup completed successfully.");
            }

            if (!store.shutdownAfterBackup || this.forceStopped) return;

            this.log('Shutting down...');
            await execAsync('sudo shutdown now');

        } catch (error) {
            this.log(`\nError during backup: ${error.message}`);
        } finally {
            if (fs.existsSync(lockFile)) {
                try {
                    fs.unlinkSync(lockFile);
                } catch (e) {
                    this.log(`Warning: Could not remove lock file: ${e.message}`);
                }
            }
            runInAction(() => {
                store.isBackupRunning = false;
                store.backupProcess = null;
            });
        }
    };

    stopBackup = async () => {
        try {
            const { stdout } = await execAsync('pgrep -f baksnapper');
            if (!stdout) return;

            this.forceStopped = true;
            this.log('\nForce stopping backup...');
            try {
                await execAsync('sudo pkill -f baksnapper');
            } catch (e) {
                console.log('pkill error:', e);
            }

            if (store.backupProcess) {
                store.backupProcess.kill();
            }

            await this.waitForStop();
        } catch (e) {
            // pgrep failed, assume not running
        }
    };

    waitForStop = async () => {
        try {
            const { stdout: stillRunning } = await execAsync('pgrep -f baksnapper');
            if (!stillRunning) {
                this.log('Backup process force stopped.');
                store.isBackupRunning = false;
                store.backupProcess = null;
                return;
            }
            await sleep(500);
            return this.waitForStop();
        } catch (e) {
            this.log('Backup process force stopped.');
            store.isBackupRunning = false;
            store.backupProcess = null;
        }
    };

    clearOutput = () => {
        store.outputLines = [];
    };
}

export const controller = new Controller();
