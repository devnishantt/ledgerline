module.exports = {
  apps: [
    {
      name: "ledgerline",
      cwd: __dirname,
      script: "npx",
      args: "wrangler pages dev dist --ip 0.0.0.0 --port 3000",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "development" },
    },
  ],
};
