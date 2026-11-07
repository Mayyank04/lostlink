#!/usr/bin/env bash
# Deploy the Vultr K3s overlay and require a successful database migration
# before rolling out the web and worker workloads.
set -euo pipefail
umask 077

namespace=lostlink
overlay_dir="${DEPLOY_OVERLAY:-k8s/overlays/vultr}"
migration_job=lostlink-db-migrate
migration_selector='app.kubernetes.io/component=db-migration'
prerequisite_selector='app.kubernetes.io/component notin (db-migration,web,worker,ingress,autoscaler)'
release_selector='app.kubernetes.io/component in (web,worker,ingress,autoscaler)'

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

[[ -f "$overlay_dir/kustomization.yaml" ]] || fail "Kustomize overlay not found at $overlay_dir."
kubectl cluster-info >/dev/null

release_dir=$(mktemp -d "$(dirname "$overlay_dir")/.lostlink-release.XXXXXX")
trap 'rm -rf -- "$release_dir"' EXIT

render_dir=$overlay_dir
if [[ -n "${RELEASE_IMAGE_REPOSITORY:-}" || -n "${RELEASE_IMAGE_TAG:-}" ]]; then
  overlay_name=$(basename "$overlay_dir")
  [[ "$overlay_name" =~ ^[a-zA-Z0-9._-]+$ ]] || fail 'Invalid Kustomize overlay directory name.'
  [[ "${RELEASE_IMAGE_REPOSITORY:-}" =~ ^[a-z0-9._/-]+$ && "${RELEASE_IMAGE_TAG:-}" =~ ^[a-zA-Z0-9_][a-zA-Z0-9._-]*$ ]] ||
    fail "Set both RELEASE_IMAGE_REPOSITORY and RELEASE_IMAGE_TAG to valid image values."
  cat > "$release_dir/kustomization.yaml" <<YAML
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - "../$overlay_name"
images:
  - name: lostlink-web
    newName: "${RELEASE_IMAGE_REPOSITORY}/lostlink-web"
    newTag: "${RELEASE_IMAGE_TAG}"
  - name: lostlink-worker
    newName: "${RELEASE_IMAGE_REPOSITORY}/lostlink-worker"
    newTag: "${RELEASE_IMAGE_TAG}"
  - name: ghcr.io/mayyank04/lostlink-web
    newName: "${RELEASE_IMAGE_REPOSITORY}/lostlink-web"
    newTag: "${RELEASE_IMAGE_TAG}"
  - name: ghcr.io/mayyank04/lostlink-worker
    newName: "${RELEASE_IMAGE_REPOSITORY}/lostlink-worker"
    newTag: "${RELEASE_IMAGE_TAG}"
YAML
  render_dir=$release_dir
fi

manifest="$release_dir/manifest.yaml"
kubectl kustomize "$render_dir" > "$manifest"
rendered_job=$(kubectl -n "$namespace" create --dry-run=client -f "$manifest" \
  --selector "$migration_selector" -o name)
[[ "$rendered_job" == "job.batch/$migration_job" ]] ||
  fail "The selected overlay must render exactly one $migration_job Job."

job_state=$(kubectl -n "$namespace" get job "$migration_job" --ignore-not-found \
  -o 'jsonpath={.metadata.uid}{"|"}{.status.conditions[?(@.type=="Complete")].status}{"|"}{.status.conditions[?(@.type=="Failed")].status}')
IFS='|' read -r job_uid job_complete job_failed <<< "$job_state"
if [[ -n "$job_uid" && "$job_complete" != True && "$job_failed" != True ]]; then
  fail "The existing migration Job has not finished. Inspect it before starting another release."
fi

echo 'Applying migration prerequisites.'
cluster_secret=$(kubectl -n "$namespace" get secret lostlink-secrets --ignore-not-found -o name)
if [[ -z "$cluster_secret" && ! -f "$overlay_dir/secret.yaml" ]]; then
  fail "Provision lostlink-secrets in $namespace before deploying."
fi
kubectl -n "$namespace" apply -f "$manifest" --selector "$prerequisite_selector"
if [[ -z "$cluster_secret" ]]; then
  kubectl -n "$namespace" create -f "$overlay_dir/secret.yaml"
fi

if [[ -n "$job_uid" ]]; then
  # Delete only the terminal Job inspected above, even if another release races this one.
  printf '{"apiVersion":"v1","kind":"DeleteOptions","preconditions":{"uid":"%s"},"propagationPolicy":"Foreground"}\n' "$job_uid" |
    kubectl delete --raw "/apis/batch/v1/namespaces/$namespace/jobs/$migration_job" -f - >/dev/null
  kubectl -n "$namespace" wait --for=delete "job/$migration_job" --timeout=60s
fi

echo 'Running database migrations.'
kubectl -n "$namespace" create -f "$manifest" --selector "$migration_selector"
if ! kubectl -n "$namespace" wait --for=condition=complete "job/$migration_job" --timeout=300s; then
  kubectl -n "$namespace" get job "$migration_job" || true
  kubectl -n "$namespace" get pods -l "job-name=$migration_job" || true
  fail "Migration did not complete. Check the migration container logs before retrying."
fi

template_checksum() {
  kubectl -n "$namespace" get "deployment/$1" --ignore-not-found -o 'jsonpath={.spec.template}' | cksum
}

wait_for_rollout() {
  local name=$1
  local timeout=$2
  local prior_template=$3
  if [[ "$(template_checksum "$name")" == "$prior_template" ]]; then
    # A config-only release still needs new pods to pick up environment variables.
    kubectl -n "$namespace" rollout restart "deployment/$name"
  fi
  if ! kubectl -n "$namespace" rollout status "deployment/$name" --timeout="$timeout"; then
    kubectl -n "$namespace" get pods -l "app=$name" || true
    if kubectl -n "$namespace" rollout undo "deployment/$name"; then
      fail "Rollout failed for $name. Requested rollback to its previous pod template."
    fi
    fail "Rollout failed for $name. Rollback to its previous pod template also failed."
  fi
}

echo 'Rolling out web and worker.'
web_template=$(template_checksum lostlink-web)
worker_template=$(template_checksum lostlink-worker)
kubectl -n "$namespace" apply -f "$manifest" --selector "$release_selector"
wait_for_rollout lostlink-web 180s "$web_template"
wait_for_rollout lostlink-worker 120s "$worker_template"

echo 'Checking web readiness and worker database access.'
kubectl -n "$namespace" exec deployment/lostlink-web -c web -- \
  curl --fail --silent --show-error --max-time 10 --output /dev/null http://localhost:3000/api/health/ready
kubectl -n "$namespace" exec deployment/lostlink-worker -c worker -- \
  curl --fail --silent --show-error --max-time 10 --output /dev/null http://localhost:3001/healthz
kubectl -n "$namespace" exec deployment/lostlink-worker -c worker -- node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const timeout = setTimeout(() => {
  console.error("Worker outbox database query timed out.");
  process.exit(1);
}, 10000);
(async () => {
  try {
    await prisma.outboxEvent.findFirst({ select: { id: true } });
  } finally {
    await prisma.$disconnect();
  }
})()
  .catch(() => {
    console.error("Worker outbox database query failed.");
    process.exitCode = 1;
  })
  .finally(() => clearTimeout(timeout));
'

ingress_host=$(kubectl -n "$namespace" get ingress lostlink-ingress -o 'jsonpath={.spec.rules[0].host}')
if [[ -n "$ingress_host" ]] &&
  [[ "$(curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}' \
    "https://$ingress_host/api/health/ready")" == 200 ]]; then
  echo "Public HTTPS readiness passed for $ingress_host."
else
  echo 'Public HTTPS readiness could not be verified.' >&2
fi

echo 'Database migration and in-cluster web and worker checks passed.'
