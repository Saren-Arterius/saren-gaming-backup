/* eslint-disable no-labels */
import React, { Component } from 'react'; // import from react
import { Window, App, View, Text, TouchableOpacity, TextInput } from 'proton-native'; // import the proton-native components
import { observer } from 'mobx-react';
import { Checkbox, DButton, ProgressBar } from './components';
import { store } from './store';
import { controller } from './controller';

console.log(process.version);

const Header = () => (
  <Text style={{ fontSize: 28, color: '#ffffff', fontWeight: 'bold', marginBottom: 24 }}>
    System Backup
  </Text>
);

const ProgressSection = observer(() => (
  <View style={{ width: '100%', marginTop: 16 }}>
    <ProgressBar
      label={`Overall Progress: ${store.progress.currentDisk}`}
      current={store.progress.completedDisks}
      total={store.progress.totalDisks}
      percent={store.progress.percent}
    />
    <ProgressBar
      label="Snapshots Progress"
      current={store.completedTasks}
      total={store.totalTasks}
      color="#2ecc71"
    />
  </View>
));

const ControlPanel = observer(() => {
  const isRunning = store.isBackupRunning || store.isCheckingProcess;

  return (
    <View style={{
      backgroundColor: '#2d2d2d',
      padding: 20,
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#3d3d3d'
    }}>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <DButton
          style={{ width: 180, height: 50, marginRight: 12, borderRadius: 8 }}
          onPress={controller.runBackup}
          disabled={isRunning}
          backgroundColor={isRunning ? '#444' : '#00bcd4'}
          textColor={isRunning ? '#888888' : '#ffffff'}
        >
          {store.isCheckingProcess ? "RUNNING..." : "START BACKUP"}
        </DButton>
        <DButton
          style={{ width: 180, height: 50, borderRadius: 8 }}
          onPress={controller.stopBackup}
          disabled={!isRunning}
          backgroundColor={!isRunning ? '#444' : '#d0021b'}
          textColor={!isRunning ? '#888888' : '#ffffff'}
        >
          FORCE STOP
        </DButton>
      </View>

      <Checkbox
        label="Shutdown system after completion"
        checked={store.shutdownAfterBackup}
        onChange={(val) => { store.shutdownAfterBackup = val; }}
      />

      {store.isBackupRunning && <ProgressSection />}
    </View>
  )
});

const LogSection = observer(() => {
  const outputLines = store.outputLines || [];
  const outputString = outputLines.join('\n');

  return (
    <View style={{ width: '100%', flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: '#888', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>LOGS</Text>
        <TouchableOpacity onPress={controller.clearOutput}>
          <Text style={{ color: '#4a90e2', fontSize: 13 }}>Clear Output</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        multiline
        readOnly
        value={outputString}
        style={{
          fontSize: 13,
          fontFamily: 'monospace',
          width: '100%',
          flex: 1,
          backgroundColor: '#121212',
          color: '#d4d4d4',
          padding: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#333'
        }}
      />
    </View>
  );
});

// eslint-disable-next-line react/prefer-stateless-function
class Example extends Component {

  componentDidMount() {
    controller.checkProcessLoop();
  }

  render() {
    return (
      <App>
        <Window style={{
          width: 800,
          height: 800,
          backgroundColor: '#1e1e1e',
          minWidth: 800,
          maxWidth: 800,
          minHeight: 800,
          maxHeight: 800
        }}>
          <View style={{ flex: 1, padding: 24, alignItems: 'center' }}>
            <Header />
            <ControlPanel />
            <LogSection />
          </View>
        </Window>
      </App>
    );
  }
}

export default Example;
