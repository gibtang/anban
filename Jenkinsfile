pipeline {
    agent any

    environment {
        IMAGE      = 'ghcr.io/gibtang/anban'
        TAG        = "${env.BUILD_NUMBER}"
        COOLIFY_API   = 'https://coolify-api.feedcode.dev'
        APP_UUID      = 'yxvqbs5rknprqqtc5bxzeok1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Image') {
            steps {
                sh "docker build -t ${IMAGE}:${TAG} ."
                sh "docker tag ${IMAGE}:${TAG} ${IMAGE}:latest"
            }
        }

        stage('Push to GHCR') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'ghcr-token',
                    usernameVariable: 'GHCR_USER',
                    passwordVariable: 'GHCR_PASS'
                )]) {
                    sh "echo '${env.GHCR_PASS}' | docker login ghcr.io -u '${env.GHCR_USER}' --password-stdin"
                }
                sh "docker push ${IMAGE}:${TAG}"
                sh "docker push ${IMAGE}:latest"
            }
        }

        stage('Deploy via Coolify') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'coolify-api',
                    usernameVariable: 'COOLIFY_USER',
                    passwordVariable: 'COOLIFY_TOKEN'
                )]) {
                    sh """
                        curl -sf -X POST \
                            -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
                            "${COOLIFY_API}/api/v1/applications/${APP_UUID}/start"
                    """
                }
            }
        }
    }

    post {
        cleanup {
            sh "docker image rm ${IMAGE}:${TAG} ${IMAGE}:latest 2>/dev/null || true"
        }
    }
}
