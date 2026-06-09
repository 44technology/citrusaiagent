module.exports = {
  apps: [
    {
      name: 'citrus-api',
      script: 'src/index.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/citrus/error.log',
      out_file: '/var/log/citrus/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ]
};
