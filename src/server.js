import { store } from './store';
import { join } from 'path';

export function startServer() {
  const publicDir = join(process.cwd(), 'public');

  Bun.serve({
    port: 4000,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/api/progress") {
        return Response.json({
          isBackupRunning: store.isBackupRunning,
          shutdownAfterBackup: store.shutdownAfterBackup,
          currentDisk: store.progress.currentDisk,
          completedDisks: store.progress.completedDisks,
          totalDisks: store.progress.totalDisks,
          percent: store.progress.percent,
          completedTasks: store.completedTasks,
          totalTasks: store.totalTasks,
          lastLogs: store.outputLines.slice(-20)
        });
      }

      if (url.pathname === "/") {
        const file = Bun.file(join(publicDir, 'index.html'));
        return new Response(file);
      }

      return new Response("Not Found", { status: 404 });
    },
  });
  console.log("Server started on http://localhost:4000");
}
