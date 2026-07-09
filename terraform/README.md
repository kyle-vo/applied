# Deploying Applied to Google Cloud with Terraform

This directory is an **Infrastructure as Code** definition of Applied's backend:
instead of clicking around a cloud console, these files describe every piece of
infrastructure, and Terraform makes Google Cloud match them.

What gets created (see `main.tf` for the commented details):

| Resource | What it is | Rough cost |
|---|---|---|
| Cloud Run service | Runs the backend Docker image, scales to zero when idle | ~free at demo traffic |
| Cloud SQL (Postgres 16, db-f1-micro) | The database | ~$9/month while it exists |
| Artifact Registry | Stores the Docker image | pennies |
| Secret Manager (5 secrets) | Holds API keys, injected as env vars | pennies |
| Service account + IAM | Least-privilege identity for the app | free |

> **Cost control:** `terraform destroy` deletes everything (the database is the
> only meaningful cost). Rebuild later with `terraform apply` — that
> disposability is the whole point of IaC. Note that destroy deletes the
> database's data too; this is a parallel environment, Railway stays prod.

## One-time setup

1. **Install tools** (Terraform is already installed if Claude set this up):
   ```powershell
   winget install Hashicorp.Terraform
   winget install Google.CloudSDK
   ```

2. **Create a GCP project** at https://console.cloud.google.com — new accounts
   get $300 of free credit. Note the project id (e.g. `applied-467213`).

3. **Authenticate** (opens a browser):
   ```powershell
   gcloud auth login
   gcloud auth application-default login   # credentials Terraform uses
   gcloud config set project YOUR_PROJECT_ID
   ```

4. **Create your variables file:**
   ```powershell
   cd terraform
   Copy-Item terraform.tfvars.example terraform.tfvars
   # edit terraform.tfvars with your project id and the values from backend/.env
   ```

## Deploy

```powershell
cd terraform

# 1. Download the providers declared in versions.tf (one time)
terraform init

# 2. Dry run — shows what WOULD be created. Read it! This is the skill:
#    being able to review an infrastructure change before it happens.
terraform plan

# 3. Build it for real (~10 min; Cloud SQL is slow to provision).
#    The first apply will fail at the Cloud Run step because the Docker
#    image doesn't exist yet — expected. Continue to step 4.
terraform apply

# 4. Build and push the backend image using Cloud Build (runs in GCP, no
#    local Docker needed). Use the repo path from `terraform output image_repo`:
gcloud builds submit ..\backend --tag us-west2-docker.pkg.dev/YOUR_PROJECT_ID/applied/backend:latest

# 5. Point the `image` variable in terraform.tfvars at that tag, then:
terraform apply

# 6. Test it:
terraform output backend_url
curl "$(terraform output -raw backend_url)/health"   # → {"api":"ok","db":"ok"}
```

The container runs `flask db upgrade` on boot (see `backend/Dockerfile`), so
the schema is created automatically on first start.

## Day-to-day

- Change any `.tf` file → `terraform plan` shows the diff → `terraform apply` applies it.
- New backend code → rerun the `gcloud builds submit` command, then
  `terraform apply` (or `gcloud run deploy`) to roll it out.
- Done for the day → `terraform destroy` and the meter stops.

## Things worth understanding (interview material)

- **State file** (`terraform.tfstate`, gitignored): Terraform's record of what
  it created, used to compute diffs. It contains secrets — on a team it lives
  in a shared remote backend (GCS bucket, Terraform Cloud), never in git.
- **Why the database URL uses a unix socket**: Cloud Run mounts the Cloud SQL
  connection at `/cloudsql/...` via a built-in proxy — no public IP allowlists,
  no SSL certificate management.
- **Least privilege**: the app runs as a service account that can do exactly
  two things (connect to the DB, read its secrets) — not as an admin identity.
- **Scale to zero**: Cloud Run charges per request-time; an idle demo costs
  nothing. The tradeoff is cold starts (~2-5s on first request).
