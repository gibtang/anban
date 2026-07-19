// anban — Jenkins→Coolify.
// No build-args (build-env file is empty). Replaces the legacy aspirational
// Jenkinsfile (which used the wrong /start endpoint + a fragile docker login).
// GHCR + Coolify auth come from Jenkins credentials (ghcr-token, coolify-api).
// GitHub Actions (.github/workflows/deploy.yml) remains the manual-only fallback.
// tg() — Telegram pipeline notifications. TG_TOKEN/TG_CHAT come from Jenkins
// secret-text credentials; tg-notify.sh is mounted into the controller. No-ops
// silently if the creds are unset, so it never breaks a build.
void tg(String msg) {
  withEnv(["TG_MSG=${msg}"]) { sh 'tg-notify.sh' }
}

pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds(); buildDiscarder(logRotator(numToKeepStr: '20')) }
  environment {
    IMAGE       = 'ghcr.io/gibtang/anban'
    TAG         = "${env.BUILD_NUMBER}"
    APP_UUID    = 'yxvqbs5rknprqqtc5bxzeok1'
    COOLIFY_API = 'https://coolify-api.feedcode.dev'
    BUILDENV    = '/run/secrets/build-env.anban'   // empty (no build-args)
    APP         = 'anban'
    TG_TOKEN    = credentials('telegram-token')   // Telegram notify (tg-notify.sh)
    TG_CHAT     = credentials('telegram-chat')
  }
  stages {
    stage('Checkout') {
      steps {
        tg("🔨 <b>${APP}</b> #${BUILD_NUMBER} — Checkout started")
        checkout scm
      }
    }

    stage('Build Image') {
      steps {
        tg("🔨 <b>${APP}</b> #${BUILD_NUMBER} — Build started")
        sh '''#!/bin/bash
          set -euo pipefail
          set -a; . "${BUILDENV}"; set +a
          args=()
          while IFS='=' read -r name _; do
            [ -z "${name:-}" ] && continue
            [[ "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
            args+=(--build-arg "${name}=${!name}")
          done < "${BUILDENV}"
          docker build "${args[@]}" -t "${IMAGE}:${TAG}" -t "${IMAGE}:latest" .
        '''
      }
    }

    stage('Push to GHCR') {
      steps {
        tg("📤 <b>${APP}</b> #${BUILD_NUMBER} — Push to GHCR started")
        withCredentials([usernamePassword(credentialsId: 'ghcr-token', usernameVariable: 'GHCR_USER', passwordVariable: 'GHCR_PASS')]) {
          sh '''#!/bin/bash
            set -euo pipefail
            echo "${GHCR_PASS}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
            docker push "${IMAGE}:${TAG}"
            docker push "${IMAGE}:latest"
          '''
        }
        tg("✅ <b>${APP}</b> #${BUILD_NUMBER} — Pushed to GHCR")
      }
    }

    stage('Deploy via Coolify') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'coolify-api', usernameVariable: 'CUSER', passwordVariable: 'CTOK')]) {
          sh """#!/bin/bash
            set -euo pipefail
            code=\$(curl -s -o /tmp/coolify.resp -w '%{http_code}' -X POST \\
              '${env.COOLIFY_API}/api/v1/deploy' \\
              -H "Authorization: Bearer \${CTOK}" \\
              -H 'Content-Type: application/json' \\
              -d '{"uuid":"${env.APP_UUID}"}')
            cat /tmp/coolify.resp; echo
            [ "\$code" = '200' ] || { echo "Coolify deploy failed (HTTP \${code})"; exit 1; }
            echo 'Coolify deploy queued.'
          """
        }
      }
    }
  }
  post {
    failure {
      tg("❌ <b>${APP}</b> #${BUILD_NUMBER} — build FAILED: ${env.BUILD_URL}")
    }
    success {
      tg("✅ <b>${APP}</b> #${BUILD_NUMBER} — build SUCCESS: ${env.BUILD_URL}")
    }
    aborted {
      tg("⏹ <b>${APP}</b> #${BUILD_NUMBER} — build ABORTED")
    }
    cleanup {
      sh "docker image rm ${IMAGE}:${TAG} ${IMAGE}:latest 2>/dev/null || true"
      cleanWs()
    }
  }
}
