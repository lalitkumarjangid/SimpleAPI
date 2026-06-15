module.exports = {
  apps: [
    {
      name: "my-app",
      script: "./index.js",
      instances: 1,
      exec_mode: "cluster"
    }
  ]
};