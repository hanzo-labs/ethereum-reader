use('sake-bundle')
use('sake-outdated')
use('sake-version')

task('build', (opts) => {
  exec.sync('tsc')
})

task('start', ['build'], function* (opts) {
  require('./index.js')
})

task('auth', 'authenticate google sdk', (opts) => {
  exec('gcloud auth login')
})

task('deploy', 'deploy reader to appengine', ['build'], (opts) => {
  exec('gcloud app deploy --quiet --project crowdstart-us app.yaml --version=v1')
})

task('browse', 'view application from web browser', (opts) => {
  exec('gcloud app browse -s ethereum-reader --project crowdstart-us app.yaml')
})

task('logs', 'view application logs', (opts) => {
  exec('gcloud app logs tail -s ethereum-reader --project crowdstart-us app.yaml')
})
