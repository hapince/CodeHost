module.exports = {
  apps: [
    {
      name: 'codehost-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/www/wwwroot/code-hosting-platform',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'codehost-ws',
      script: 'server/dist/index.js',
      cwd: '/www/wwwroot/code-hosting-platform',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 3001,
      },
      max_memory_restart: '300M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
