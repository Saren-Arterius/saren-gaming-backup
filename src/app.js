/* eslint-disable no-labels */
import React, { Component } from 'react'; // import from react
import { Window, App, Text, View, TextInput } from 'proton-native'; // import the proton-native components
import { observer } from 'mobx-react';
import { spawn, exec } from 'node:child_process';
import { DButton, Checkbox } from './components';
import { store } from './store';

console.log(process.version);
// eslint-disable-next-line react/prefer-stateless-function
class Example extends Component {
  pageSize = 30;

  // Using arrow functions for methods to auto-bind `this`
  handleData = (dataChunk) => {
    const d = dataChunk.toString();
    // Special filter from original code
    if (d.includes('dbus-launch')) {
      return;
    }

    const newLines = d.trim().split('\n');
    // Assuming store.outputLines is an observable array
    store.outputLines.push(...newLines);
  };
  runBackup = () => {
    store.isBackupRunning = true;
    // Assuming store will have these properties and they are observable
    store.outputLines = [];

    const backupProcess = spawn('bash', [
      '/home/saren/Dropbox/saren-gaming-baksnapper.sh'
    ]);

    backupProcess.stdout.on('data', this.handleData);
    backupProcess.stderr.on('data', this.handleData);
    backupProcess.on('close', (code) => {
      store.outputLines.push('', `Backup process exited with code ${code}`);
      store.isBackupRunning = false;

      if (store.shutdownAfterBackup) {
        store.outputLines.push('Shutting down...');
        exec('sudo shutdown now');
      }
    });
  };

  clearOutput = () => {
    store.outputLines = [];
  };

  render() {
    // Defensive coding for store properties that might not exist initially.
    const outputLines = store.outputLines || [];
    const outputString = outputLines.join('\n');

    return (
      <App>
        <Window style={{ width: 800, height: 800, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, marginTop: 16, fontWeight: 600 }}>
            Backup all computers
          </Text>
          <DButton
            style={{ fontSize: 36 }}
            onPress={this.runBackup}
            disabled={store.isBackupRunning}
            title="BACKUP"
          />
          <Checkbox
            label="Shutdown after backup"
            checked={store.shutdownAfterBackup}
            onChange={(val) => { store.shutdownAfterBackup = val; }}
          />
          <DButton
            style={{ fontSize: 24, marginTop: 5 }}
            onPress={this.clearOutput}
            title="Clear"
          />
          <TextInput
            multiline
            value={outputString}
            style={{
              marginTop: 10,
              fontSize: 12,
              fontFamily: 'monospace',
              width: '95%',
              height: 600,
              backgroundColor: 'white',
              color: 'black',
            }}
          />
        </Window>
      </App>
    );
  }
}


export default observer(Example);
