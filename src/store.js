import { action, makeAutoObservable } from 'mobx';

class Store {
  isBackupRunning = false;
  // outputText = 'Output goes here';
  outputLines = [];
  currentPage = 0;
  shutdownAfterBackup = false;

  constructor() {
    makeAutoObservable(this);
  }
}

export const store = new Store();
