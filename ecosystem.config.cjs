module.exports = {
  apps: [
    {
      name: 'zeego-server',
      cwd: '/var/www/zeego/server',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        CLIENT_URL: 'https://zeego.loghorizon.online',
      },
    },
    {
      name: 'zeego-client',
      cwd: '/var/www/zeego',
      script: 'node_modules/next/dist/bin/next',
      args: 'start client -p 3000 -H 127.0.0.1',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
