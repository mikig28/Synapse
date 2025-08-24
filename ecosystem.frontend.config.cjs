module.exports = {
  apps: [
    {
      name: 'frontend-dev',
      cwd: './src/frontend',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      interpreter: 'none',
      watch: false,
      max_memory_restart: '1G',
      log_file: '../../frontend-dev.log',
      out_file: '../../frontend-dev.out.log',
      error_file: '../../frontend-dev.error.log'
    }
  ]
};