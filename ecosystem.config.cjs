module.exports = {
  apps: [
    {
      name: 'skyjo',
      script: 'packages/server/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
