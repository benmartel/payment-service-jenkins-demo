pipeline {
    agent none

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        booleanParam(name: 'SKIP_APPROVAL', defaultValue: false,
            description: 'Skip the manual production approval (rehearsal runs only)')
    }

    stages {
        stage('Checks') {
            parallel {
                stage('Lint & unit tests') {
                    agent { label 'nodejs' }
                    steps {
                        sh 'npm ci --no-fund --no-audit'
                        sh 'npm run lint'
                        sh 'npm run test:unit'
                    }
                    post { always { junit allowEmptyResults: true, testResults: 'reports/*.xml' } }
                }
                stage('Integration tests') {
                    agent { label 'nodejs' }
                    steps {
                        sh 'npm ci --no-fund --no-audit'
                        sh 'npm run test:integration'
                    }
                    post { always { junit allowEmptyResults: true, testResults: 'reports/*.xml' } }
                }
                stage('Fraud rule regression') {
                    agent { label 'nodejs' }
                    steps {
                        sh 'npm ci --no-fund --no-audit'
                        sh 'npm run test:fraud'
                    }
                    post { always { junit allowEmptyResults: true, testResults: 'reports/*.xml' } }
                }
                stage('Dependency audit') {
                    agent { label 'nodejs' }
                    steps {
                        sh 'npm ci --no-fund --no-audit'
                        sh 'npm run audit'
                    }
                }
            }
        }

        stage('Package') {
            agent { label 'nodejs' }
            steps {
                sh 'npm run package'
                archiveArtifacts artifacts: 'dist/*.tgz', fingerprint: true
            }
        }

        stage('Staging smoke test') {
            when {
                beforeAgent true
                branch 'main'
            }
            agent { label 'nodejs' }
            steps {
                sh 'npm ci --omit=dev --no-fund --no-audit'
                sh 'npm run smoke'
            }
        }

        stage('Approve production') {
            when {
                branch 'main'
                expression { return !params.SKIP_APPROVAL }
            }
            steps {
                input message: 'All checks passed. Deploy payment-service to production?', ok: 'Deploy'
            }
        }

        stage('Deploy to production') {
            when { branch 'main' }
            steps {
                echo 'SIMULATED: canary deploy to 5% of traffic, watching error rate and latency'
                echo 'SIMULATED: canary healthy, promoting to 100%'
                echo 'SIMULATED: release notes posted to #releases, ops and compliance notified'
            }
        }
    }

    post {
        success { echo "payment-service ${env.BRANCH_NAME} build #${env.BUILD_NUMBER} passed every gate" }
        failure { echo "Build failed at the first broken gate. Nothing after it ran, nothing was deployed." }
    }
}
