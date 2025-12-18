import { controller } from './src/controller';
import { store } from './src/store';
import { autorun } from 'mobx';

async function run() {
    console.log("Starting CLI Backup...");

    // Monitor progress and log to console
    autorun(() => {
        const { currentTask, currentDisk, percent } = store.progress;
        const { completedTasks, totalTasks } = store;
        if (currentTask) {
            process.stdout.write(`\r[${percent}%] ${currentDisk}: ${currentTask} (${completedTasks}/${totalTasks})`);
        }
    });

    try {
        await controller.runBackup();
        console.log("\nBackup finished successfully.");
        process.exit(0);
    } catch (error) {
        console.error(`\nBackup failed: ${error.message}`);
        process.exit(1);
    }
}

run();
