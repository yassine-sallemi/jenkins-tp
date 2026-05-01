pipeline {
    agent any

    tools {
        // Utilise l'outil NodeJS que tu as configuré dans Jenkins
        nodejs 'node-24'
        terraform 'terraform-tool'
    }

    environment {
        SCANNER_HOME = tool 'sonarqube-scanner'
        DOCKER_IMAGE = 'yassine251/tp4-devops-image'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                // Récupère automatiquement le code depuis GitHub (grâce au webhook ngrok)
                checkout scm
            }
        }

        stage('Build/Install') {
            steps {
                echo 'Installation des dépendances Node.js...'
                sh 'npm install'
            }
        }

        stage('Unit Tests') {
            steps {
                echo 'Exécution des tests unitaires...'
                sh 'npm run test'
            }
        }

        stage('Static Analysis') {
            steps {
                echo 'Analyse du code avec SonarQube...'
                // Utilise le serveur SonarQube configuré dans Jenkins
                withSonarQubeEnv('sonarqube-server') {
                    sh '''
                    $SCANNER_HOME/bin/sonar-scanner \
                      -Dsonar.projectKey=tp4-devops \
                      -Dsonar.sources=. \
                      -Dsonar.exclusions=node_modules/** \
                      -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo 'Attente du verdict SonarQube (Quality Gate)...'
                timeout(time: 10, unit: 'MINUTES') {
                    // Met le pipeline en pause et attend la réponse de SonarQube (via son propre webhook vers Jenkins)
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Construction de l\'image Docker...'
                // Construit l'image avec le tag du numéro de build
                sh "docker build -t ${DOCKER_IMAGE}:${IMAGE_TAG} ."
                // Bonne pratique : on met aussi à jour le tag 'latest'
                sh "docker build -t ${DOCKER_IMAGE}:latest ."
            }
        }

        stage('Image Scanning (Trivy)') {
            steps {
                echo 'Scan de l\'image avec Trivy...'
                // Lance Trivy via Docker en lui partageant le socket Docker local
                // On lui demande de chercher les vulnérabilités HIGH et CRITICAL
                sh """
                docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                  aquasec/trivy image --severity HIGH,CRITICAL ${DOCKER_IMAGE}:${IMAGE_TAG}
                """
            }
        }

        stage('Docker Push') {
            steps {
                echo 'Authentification et envoi de l\'image sur Docker Hub...'
                // Utilise l'ID du credential créé dans Jenkins
                withDockerRegistry(credentialsId: 'docker-hub-credentials', url: '') {
                    // Push des deux tags
                    sh "docker push ${DOCKER_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${DOCKER_IMAGE}:latest"
                }
            }
        }

        stage('Infrastructure & Deploy (Terraform)') {
            steps {
                echo 'Déploiement sur Kubernetes avec Terraform...'
                dir('terraform') {
                    // Déverrouille le kubeconfig secret et le stocke dans KUBECONFIG_FILE
                    withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                        // Initialise Terraform
                        sh 'terraform init'

                        // Exécute Terraform en lui passant la variable d'environnement KUBECONFIG
                        sh '''
                        terraform apply -auto-approve \
                          -var="docker_image=$DOCKER_IMAGE:$IMAGE_TAG" \
                          -var="kubeconfig_path=$KUBECONFIG_FILE"
                        '''
                    }
                }
            }
        }
        stage('Smoke Test') {
            steps {
                echo 'Vérification de la disponibilité de l\'application...'
                sleep 15

                // On cible le Control Plane, car il est garanti d'exister
                sh '''
                HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://devops-tp-control-plane:30080/no)

                if [ "$HTTP_STATUS" -eq 200 ]; then
                    echo "Smoke Test OK! Application accessible."
                else
                    echo "Smoke Test FAILED! Code HTTP: $HTTP_STATUS"
                    exit 1
                fi
                '''
            }
        }
    }
}
