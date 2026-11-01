#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — KUBERNETES MANIFEST DEPLOYMENT SCRIPT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RESET="\033[0m"

NAMESPACE="lostlink"

echo -e "${BOLD}${BLUE}==> Applying Kustomize overlays to namespace '${NAMESPACE}'...${RESET}"
kubectl apply -k k8s/overlays/local

echo -e "${BOLD}${BLUE}==> Waiting for PostgreSQL StatefulSet to be ready...${RESET}"
kubectl rollout status statefulset/postgres -n "${NAMESPACE}" --timeout=90s

echo -e "${BOLD}${BLUE}==> Waiting for Database Migration Job to complete...${RESET}"
kubectl wait --for=condition=complete job/lostlink-db-migrate -n "${NAMESPACE}" --timeout=90s || true

echo -e "${BOLD}${BLUE}==> Waiting for Web Deployment rollout...${RESET}"
kubectl rollout status deployment/lostlink-web -n "${NAMESPACE}" --timeout=120s

echo -e "${BOLD}${BLUE}==> Waiting for Worker Deployment rollout...${RESET}"
kubectl rollout status deployment/lostlink-worker -n "${NAMESPACE}" --timeout=90s

echo -e "${BOLD}${GREEN}==> All LostLink 2.0 workloads are active and healthy!${RESET}"
kubectl get pods,svc,ingress,hpa -n "${NAMESPACE}"

