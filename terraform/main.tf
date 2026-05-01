# terraform/main.tf

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# Variable qui sera injectée par Jenkins
variable "docker_image" {
  description = "L'image Docker à déployer"
  type        = string
  default     = "yassine251/tp4-devops-image"
}

variable "kubeconfig_path" {
  description = "Chemin vers le fichier kubeconfig"
  type        = string
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

# 1. Création du Deployment Kubernetes
resource "kubernetes_deployment" "node_app" {
  metadata {
    name = "node-app-deployment"
    labels = {
      app = "node-app"
    }
  }

  spec {
    replicas = 2 # On demande 2 instances de ton application

    selector {
      match_labels = {
        app = "node-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "node-app"
        }
      }

      spec {
        container {
          name  = "node-app-container"
          image = var.docker_image

          port {
            container_port = 3000 # Remplace par le port réel de ton app Node.js
          }
        }
      }
    }
  }
}

# 2. Création du Service (NodePort pour y accéder en local)
resource "kubernetes_service" "node_app_service" {
  metadata {
    name = "node-app-service"
  }
  spec {
    selector = {
      app = "node-app"
    }
    port {
      port        = 80
      target_port = 3000
      node_port   = 30080 # C'est sur ce port qu'on fera le Smoke Test
    }
    type = "NodePort"
  }
}
