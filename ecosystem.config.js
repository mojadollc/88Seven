module.exports = {
  apps: [{
    name: "88-seven",
    script: "node_modules/.bin/next",
    args: "start",
    cwd: "/var/www/88-seven",
    instances: 2,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3051,
    },
    max_memory_restart: "512M",
    error_file: "/var/log/pm2/88-seven-error.log",
    out_file: "/var/log/pm2/88-seven-out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
  }]
}
