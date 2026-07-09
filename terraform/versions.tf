# ── versions.tf ────────────────────────────────────────────────────────────────
# Every Terraform project declares two things up front:
#   1. which version of Terraform itself it expects
#   2. which "providers" it needs — a provider is a plugin that knows how to
#      talk to one cloud's API. The google provider translates our resource
#      blocks into Google Cloud API calls. (There are providers for AWS,
#      Azure, GitHub, Cloudflare, even Docker.)
#
# `terraform init` reads this file and downloads the providers.

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0" # ~> means "any 6.x, but not 7.0" — same idea as npm's ^
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6" # used to generate the database password
    }
  }
}

# The provider block configures the plugin. Setting project/region here means
# every resource below inherits them instead of repeating them 10 times.
provider "google" {
  project = var.project_id
  region  = var.region
}
