module.exports = {
  apps: [
    {
      name: 'openclaw-dashboard',
      script: 'npx',
      args: 'next start -p 3003 -H 0.0.0.0',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true
    }
  ]
};
