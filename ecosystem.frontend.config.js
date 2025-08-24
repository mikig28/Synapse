module.exports = {
  apps: [{
    name: 'frontend-dev',
    cwd: './src/frontend',
    script: 'npm',
    args: 'run dev',
    env: {
      NODE_ENV: 'development'
    },
    interpreter: 'none'
  }]
};