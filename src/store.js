import { makeAutoObservable, configure } from 'mobx';

configure({
  enforceActions: 'never',
});

class Store {
  isBackupRunning = false;
  isCheckingProcess = false;
  outputLines = [];
  shutdownAfterBackup = false;
  backupProcess = null;

  tasks = {}; // { taskName: [snapshotIds] }
  handledSnapshots = new Set(); // Set of "taskName|snapshotId"

  progress = {
    currentTask: '',
    currentDisk: '',
    totalDisks: 0,
    completedDisks: 0,
    percent: 0
  };

  get totalTasks() {
    let total = 0;
    for (const taskName in this.tasks) {
      total += this.tasks[taskName].length;
    }
    return total;
  }

  get completedTasks() {
    return this.handledSnapshots.size;
  }

  constructor() {
    makeAutoObservable(this);
  }
}

export const store = new Store();
