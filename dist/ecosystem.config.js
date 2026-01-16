module.exports = {
  apps: [{
    name: 'handwood-app',
    script: './src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3000 },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    max_memory_restart: '1G'
  }]
};
