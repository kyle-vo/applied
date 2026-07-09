# ── variables.tf ───────────────────────────────────────────────────────────────
# Variables are the inputs to your blueprint — the things that differ between
# people or environments (your project id vs mine, staging vs prod) while the
# resource definitions stay identical.
#
# You supply values in a `terraform.tfvars` file (gitignored — see the example
# file) or Terraform prompts you interactively.

variable "project_id" {
  description = "Your Google Cloud project id (from the GCP console, e.g. applied-123456)"
  type        = string
}

variable "region" {
  description = "GCP region for all resources. us-west2 is Los Angeles."
  type        = string
  default     = "us-west2"
}

variable "image" {
  description = "Full path of the backend container image to deploy (set after pushing to Artifact Registry)"
  type        = string
}

# `sensitive = true` keeps the value out of terraform's console output.
# These land in Secret Manager, and Cloud Run reads them from there —
# secrets never appear in plain env config.

variable "flask_secret_key" {
  description = "Flask SECRET_KEY for session signing"
  type        = string
  sensitive   = true
}

variable "clerk_secret_key" {
  description = "Clerk secret key (sk_...)"
  type        = string
  sensitive   = true
}

variable "clerk_publishable_key" {
  description = "Clerk publishable key (pk_...)"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key (sk-ant-...)"
  type        = string
  sensitive   = true
}
