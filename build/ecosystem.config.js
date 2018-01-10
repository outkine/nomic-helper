module.exports = {
  apps: [{
    name: 'nomic-bot',
    script: 'index.js',
    watch: true,
    env: { 'NODE_ENV': 'production' }
  }]
}
