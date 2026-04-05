variable "project_id" {
  description = "The GCP Project ID"
  type        = string
}

variable "github_repo" {
  description = "The GitHub repository in the format OWNER/REPO"
  type        = string
  default     = "scsukas8/SoftScheduler"
}

# The Google provider
provider "google-beta" {
  project               = var.project_id
  region                = "us-central1"
  user_project_override = true
  billing_project       = var.project_id
}

# 1. Enable Required APIs
locals {
  services = [
    "iamcredentials.googleapis.com", 
    "iam.googleapis.com",
    "firebase.googleapis.com", 
    "cloudresourcemanager.googleapis.com", 
    "serviceusage.googleapis.com",
    "firestore.googleapis.com",
    "firebasestorage.googleapis.com"
  ]
}

resource "google_project_service" "gcp_services" {
  for_each           = toset(local.services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# 2. Firebase Project Setup
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id
  depends_on = [google_project_service.gcp_services]
}

# 3. Firestore Database
resource "google_firestore_database" "database" {
  provider                    = google-beta
  project                     = var.project_id
  name                        = "(default)"
  location_id                 = "us-central1"
  # Note: us-central1 is often used for Firestore
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  
  depends_on = [google_firebase_project.default]
}

# 4. Firebase Web App
resource "google_firebase_web_app" "pwa" {
  provider     = google-beta
  project      = var.project_id
  display_name = "ScheduleIt PWA"

  depends_on = [google_firebase_project.default]
}

# 5. Firestore Security Rules
resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  project  = var.project_id
  source {
    files {
      name    = "firestore.rules"
      content = <<EOT
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/tasks/{taskId} {
      allow read, delete: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId &&
        request.resource.data.name is string &&
        request.resource.data.name.size() >= 1 &&
        request.resource.data.name.size() <= 100 &&
        request.resource.data.wiggle_room is number &&
        request.resource.data.wiggle_room >= 0 &&
        request.resource.data.wiggle_room <= 7 &&
        request.resource.data.interval_days is number &&
        request.resource.data.interval_days >= 1 &&
        request.resource.data.interval_days <= 1825; // 5 years
      
      allow update: if request.auth != null && request.auth.uid == userId &&
        request.resource.data.name is string &&
        request.resource.data.wiggle_room is number &&
        request.resource.data.interval_days is number &&
        request.resource.data.created_at == resource.data.created_at; 
    }
  }
}
EOT
    }
  }
  depends_on = [google_firestore_database.database]
}

resource "google_firebaserules_release" "firestore" {
  provider     = google-beta
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name
  project      = var.project_id
  
  depends_on = [google_firebaserules_ruleset.firestore]
}

# 6. Service Account for GitHub Actions
resource "google_service_account" "github_action_sa" {
  project      = var.project_id
  account_id   = "github-actions-deployer"
  display_name = "GitHub Actions Firebase Deploy SA"
}

# 7. Grant the SA necessary roles
resource "google_project_iam_member" "sa_firebase_admin" {
  project = var.project_id
  role    = "roles/firebase.admin"
  member  = "serviceAccount:${google_service_account.github_action_sa.email}"
}

resource "google_project_iam_member" "sa_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.github_action_sa.email}"
}

resource "google_project_iam_member" "sa_service_usage" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = "serviceAccount:${google_service_account.github_action_sa.email}"
}

resource "google_project_iam_member" "sa_firebase_rules" {
  project = var.project_id
  role    = "roles/firebaserules.admin"
  member  = "serviceAccount:${google_service_account.github_action_sa.email}"
}

# 8. Workload Identity Federation Setup
# Create the Pool
resource "google_iam_workload_identity_pool" "github_pool" {
  provider                  = google-beta
  project                   = var.project_id
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Identity pool for GitHub deployments"
}

# Create the Provider in the Pool
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  provider                           = google-beta
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"
  
  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }
  
  attribute_condition = "assertion.repository == '${var.github_repo}' && assertion.ref == 'refs/heads/main'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# 9. Bind the WIF Provider to the Service Account
resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.github_action_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/${var.github_repo}"
}

# 10. Output the Firebase Config for .env
data "google_firebase_web_app_config" "pwa_config" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.pwa.app_id
}

output "firebase_config_env" {
  value = <<EOT
VITE_FIREBASE_API_KEY=${data.google_firebase_web_app_config.pwa_config.api_key}
VITE_FIREBASE_AUTH_DOMAIN=${var.project_id}.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=${var.project_id}
VITE_FIREBASE_STORAGE_BUCKET=${var.project_id}.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=${data.google_firebase_web_app_config.pwa_config.messaging_sender_id}
VITE_FIREBASE_APP_ID=${google_firebase_web_app.pwa.app_id}
EOT
  description = "Copy this directly into your .env.local file"
}

output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github_provider.name
  description = "Plop this exactly into the GitHub Actions WIF field"
}

output "service_account_email" {
  value       = google_service_account.github_action_sa.email
  description = "Plop this into the GitHub Actions Service Account field"
}
