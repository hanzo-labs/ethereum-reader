use('sake-bundle')
use('sake-outdated')
use('sake-version')

task('build', (opts) => {

})

task('auth', 'authenticate google sdk', (opts) => {
  exec('gcloud auth login')
})

task('deploy', 'deploy reader to appengine', ['build'], (opts) => {
  exec('gcloud app deploy --quiet --project crowdstart app.yaml --version=v1')
})

task('deploy', 'deploy project to appengine', ['deploy'])

task('browse', 'view application from web browser', (opts) => {
  exec('gcloud app browse -s ethereum-reader --project crowdstart app.yaml')
})

task('logs', 'view application logs', (opts) => {
  exec('gcloud app logs tail -s ethereum-reader --project crowdstart app.yaml')
})
