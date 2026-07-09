# ── outputs.tf ─────────────────────────────────────────────────────────────────
# Outputs are what Terraform prints after `apply` — the useful facts about
# what it just built. Also readable later with `terraform output`.

output "backend_url" {
  description = "Public URL of the deployed backend — try <url>/health"
  value       = google_cloud_run_v2_service.backend.uri
}

output "db_connection_name" {
  description = "Cloud SQL connection name (used by the Cloud SQL proxy)"
  value       = google_sql_database_instance.db.connection_name
}

output "image_repo" {
  description = "Where to push the Docker image"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}"
}
