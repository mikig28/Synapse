module.exports = {
  apps: [
    {
      name: 'backend-dev',
      cwd: './src/backend',
      script: './dist/server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      watch: false,
      max_memory_restart: '1G',
      log_file: '../../backend-dev.log',
      out_file: '../../backend-dev.out.log',
      error_file: '../../backend-dev.error.log'
    }
  ]
};