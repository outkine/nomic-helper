module.exports = {
  apps: [{
    name: '{NAME}',
    script: 'index.js',
    watch: true,
    env: { 'NODE_ENV': 'production' }
  }]
}
