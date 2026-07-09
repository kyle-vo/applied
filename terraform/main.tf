# ── main.tf ────────────────────────────────────────────────────────────────────
# The actual blueprint. Each `resource` block describes one thing that should
# exist in Google Cloud. Terraform reads all of them, figures out the
# dependency order (database before the app that connects to it, etc.), and
# creates/updates/deletes whatever is needed to make reality match the files.
#
# The naming pattern is: resource "<type>" "<your_local_name>" { ... }
# The local name is how OTHER blocks in these files refer to it — e.g.
# google_sql_database_instance.db.connection_name reads an attribute off the
# database after it's created.

# ── 1. Enable the APIs ─────────────────────────────────────────────────────────
# GCP services are off by default in a new project; using one requires
# enabling its API first (in the console this is the "Enable API" button —
# this is the same thing as code).
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",              # Cloud Run — serverless containers
    "sqladmin.googleapis.com",         # Cloud SQL — managed Postgres
    "artifactregistry.googleapis.com", # stores our Docker image
    "secretmanager.googleapis.com",    # holds API keys / secrets
    "cloudbuild.googleapis.com",       # builds the Docker image in the cloud
  ])
  service            = each.value
  disable_on_destroy = false # leave APIs enabled if we tear the stack down
}

# ── 2. Somewhere to put the Docker image ───────────────────────────────────────
# Cloud Run deploys container images. This creates the registry the image is
# pushed to (the gcloud build/push command is in the README).
resource "google_artifact_registry_repository" "repo" {
  repository_id = "applied"
  format        = "DOCKER"
  location      = var.region
  depends_on    = [google_project_service.apis]
}

# ── 3. The database ────────────────────────────────────────────────────────────
# A random password, generated once and stored in Terraform's state file.
# special=false avoids characters that would need URL-encoding in DATABASE_URL.
resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_sql_database_instance" "db" {
  name             = "applied-db"
  database_version = "POSTGRES_16"

  settings {
    tier = "db-f1-micro" # smallest machine — ~$9/month. Destroy when not demoing.
    ip_configuration {
      ipv4_enabled = true # Cloud Run connects via the Cloud SQL proxy socket, not this IP
    }
  }

  # Terraform refuses to destroy protected instances; disabled here so
  # `terraform destroy` works while you're learning. Enable for real prod.
  deletion_protection = false
  depends_on          = [google_project_service.apis]
}

resource "google_sql_database" "applied" {
  name     = "applied"
  instance = google_sql_database_instance.db.name
}

resource "google_sql_user" "app_user" {
  name     = "applied_user"
  instance = google_sql_database_instance.db.name
  password = random_password.db_password.result
}

# ── 4. Secrets ─────────────────────────────────────────────────────────────────
# One Secret Manager entry per sensitive value. Cloud Run is granted read
# access below and injects them as environment variables at runtime — the
# values never sit in the Cloud Run config itself.
locals {
  secrets = {
    "flask-secret-key"      = var.flask_secret_key
    "clerk-secret-key"      = var.clerk_secret_key
    "clerk-publishable-key" = var.clerk_publishable_key
    "anthropic-api-key"     = var.anthropic_api_key
    # DATABASE_URL uses the Cloud SQL unix socket that Cloud Run mounts at
    # /cloudsql/<connection_name> — no IP allowlists or SSL certs needed.
    "database-url" = "postgresql://${google_sql_user.app_user.name}:${random_password.db_password.result}@/${google_sql_database.applied.name}?host=/cloudsql/${google_sql_database_instance.db.connection_name}"
  }
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = local.secrets
  secret_id = each.key
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "secret_values" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value
}

# ── 5. An identity for the app ─────────────────────────────────────────────────
# Instead of running as the project's all-powerful default account, the
# service gets its own identity with exactly two permissions: connect to
# Cloud SQL and read secrets. This is "least privilege" — a term worth
# knowing for interviews.
resource "google_service_account" "backend" {
  account_id   = "applied-backend"
  display_name = "Applied backend (Cloud Run)"
}

resource "google_project_iam_member" "sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_secret_manager_secret_iam_member" "secret_access" {
  for_each  = google_secret_manager_secret.secrets
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

# ── 6. The app itself ──────────────────────────────────────────────────────────
# Cloud Run runs the same Docker image you use locally and on Railway.
# It scales to zero when idle (you pay ~nothing) and spins up on request.
resource "google_cloud_run_v2_service" "backend" {
  name     = "applied-backend"
  location = var.region

  template {
    service_account = google_service_account.backend.email

    scaling {
      min_instance_count = 0 # scale to zero when idle — this is the free part
      max_instance_count = 2
    }

    # Mounts the Cloud SQL connection as a unix socket under /cloudsql/
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.db.connection_name]
      }
    }

    containers {
      image = var.image

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      # Non-secret config as plain env vars…
      env {
        name  = "FLASK_ENV"
        value = "production"
      }

      # …and secrets referenced from Secret Manager, keyed by env var name.
      dynamic "env" {
        for_each = {
          SECRET_KEY            = "flask-secret-key"
          CLERK_SECRET_KEY      = "clerk-secret-key"
          CLERK_PUBLISHABLE_KEY = "clerk-publishable-key"
          ANTHROPIC_API_KEY     = "anthropic-api-key"
          DATABASE_URL          = "database-url"
        }
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets[env.value].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_version.secret_values,
    google_secret_manager_secret_iam_member.secret_access,
    google_project_iam_member.sql_client,
  ]
}

# Make the service publicly reachable (it's an API with its own auth layer —
# Clerk JWTs and API keys — so unauthenticated *invocation* is intended).
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
