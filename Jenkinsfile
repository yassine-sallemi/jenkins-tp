pipeline {
    agent any 
    
    tools {
        // Utilise l'outil NodeJS que tu as configuré dans Jenkins
        nodejs 'node-24' 
    }
    
    environment {
        // Utilise l'outil SonarQube Scanner que tu as configuré dans Jenkins
        SCANNER_HOME = tool 'sonarqube-scanner' 
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
                // N'oublie pas de t'assurer que cette commande génère bien ton rapport de couverture
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
    }
}
