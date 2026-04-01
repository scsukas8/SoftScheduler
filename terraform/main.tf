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
    "serviceusage.googleapis.com"
  ]
}

resource "google_project_service" "gcp_services" {
  for_each           = toset(local.services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# 4. Service Account for GitHub Actions
resource "google_service_account" "github_action_sa" {
  project      = var.project_id
  account_id   = "github-actions-deployer"
  display_name = "GitHub Actions Firebase Deploy SA"
}

# 5. Grant the SA Firebase Hosting Admin Role
resource "google_project_iam_member" "sa_firebase_admin" {
  project = var.project_id
  role    = "roles/firebase.admin"
  member  = "serviceAccount:${google_service_account.github_action_sa.email}"
}

# 6. Workload Identity Federation Setup
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
  
  attribute_condition = "assertion.repository == '${var.github_repo}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# 7. Bind the WIF Provider to the Service Account
resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.github_action_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/${var.github_repo}"
}

# Output the WIF Provider snippet so the user can easily copy it to GitHub Actions
output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github_provider.name
  description = "Plop this exactly into the GitHub Actions WIF field"
}

output "service_account_email" {
  value       = google_service_account.github_action_sa.email
  description = "Plop this into the GitHub Actions Service Account field"
}
