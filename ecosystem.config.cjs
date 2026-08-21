module.exports = {
  apps: [
    {
      name: 'salonmaster',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
    },
    {
      name: 'salonmaster-worker',
      script: 'src/workers/runNotificationWorker.js',
      instances: `${process.env.NOTIFICATION_WORKER_COUNT || 1}`,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '300M',
      kill_timeout: 30000,
    },
  ],
};