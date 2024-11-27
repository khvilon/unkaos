# Kubernetes Configuration for Unkaos

This directory contains Kubernetes manifests for deploying Unkaos.

## Directory Structure

- `base/` - Base configurations
  - `deployments/` - All deployment configurations
  - `services/` - All service configurations
  - `configmaps/` - ConfigMaps and environment variables
  - `secrets/` - Secret configurations
  - `storage/` - Persistent volume configurations
- `overlays/` - Environment-specific configurations
  - `development/`
  - `staging/`
  - `production/`

## Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured to communicate with your cluster
- helm (v3.0.0+)

## Quick Start

1. Create namespace:
   ```bash
   kubectl create namespace unkaos
   ```

2. Apply configurations:
   ```bash
   # For development
   kubectl apply -k overlays/development

   # For production
   kubectl apply -k overlays/production
   ```

3. Verify deployment:
   ```bash
   kubectl get pods -n unkaos
   ```
