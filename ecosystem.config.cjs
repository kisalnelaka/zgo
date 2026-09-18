module.exports = {
  apps: [
    {
      name: 'zeego-server',
      cwd: './server',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        CLIENT_URL: 'https://zeego.loghorizon.online',
      },
    },
    {
      name: 'zeego-client',
      cwd: './client',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
