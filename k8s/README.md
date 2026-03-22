# DiggAI TakiOS - Kubernetes Deployment

> **Meta-Synthese Fix:** Ersetzt Docker Compose (Single Point of Failure)
> **Ziel:** 99.9% SLA, Auto-Scaling, HA

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare (CDN + DDoS)                   │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                GKE/EKS/AKS Kubernetes Cluster                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Ingress    │  │   Core API   │  │   Postgres   │       │
│  │   (Nginx)    │  │   (3 pods)   │  │   (HA)       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │    Redis     │  │Telephony Svc │                         │
│  │   (Cache)    │  │  (optional)  │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Voraussetzungen

- Kubernetes Cluster (GKE, EKS, oder AKS)
- kubectl konfiguriert
- cert-manager installiert (für Let's Encrypt)
- nginx-ingress-controller installiert

## Deployment

### 1. Namespace erstellen
```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Secrets erstellen
```bash
# Postgres
kubectl create secret generic postgres-secret \
  --from-literal=username=diggai \
  --from-literal=password=$(openssl rand -base64 32) \
  -n diggai-takios

# API Secrets
kubectl create secret generic api-secrets \
  --from-literal=database-url="postgresql://diggai:PASSWORD@postgres:5432/anamnese_takios" \
  --from-literal=jwt-secret=$(openssl rand -base64 64) \
  --from-literal=encryption-key=$(openssl rand -base64 32) \
  --from-literal=stripe-secret=sk_live_... \
  --from-literal=stripe-webhook-secret=whsec_... \
  -n diggai-takios
```

### 3. Datenbank deployen
```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
```

### 4. API deployen
```bash
kubectl apply -f k8s/core-api.yaml
```

### 5. Ingress konfigurieren
```bash
kubectl apply -f k8s/ingress.yaml
```

### 6. Prisma Migrations ausführen
```bash
# Port-Forward zu Postgres
kubectl port-forward svc/postgres 5432:5432 -n diggai-takios

# Migration ausführen
export DATABASE_URL="postgresql://diggai:PASSWORD@localhost:5432/anamnese_takios"
npx prisma migrate deploy
```

## Monitoring

```bash
# Pods anzeigen
kubectl get pods -n diggai-takios

# Logs anzeigen
kubectl logs -f deployment/core-api -n diggai-takios

# Metrics anzeigen
kubectl top pods -n diggai-takios

# HPA Status
kubectl get hpa -n diggai-takios
```

## Updates

```bash
# Neue Version deployen (Rolling Update)
kubectl set image deployment/core-api api=gcr.io/diggai/takios-core-api:v1.1.0 -n diggai-takios

# Rollback bei Problemen
kubectl rollout undo deployment/core-api -n diggai-takios
```

## Kosten-Schätzung (GKE)

| Komponente | Specs | Kosten/Monat |
|------------|-------|--------------|
| GKE Cluster | 3x e2-medium | ~150€ |
| Postgres | 50GB SSD | ~50€ |
| Load Balancer | Ingress | ~20€ |
| **Gesamt** | | **~220€/Monat** |

(Vergleich: Single VPS ~40€/Monat, aber ohne HA)

## Troubleshooting

### Pod startet nicht
```bash
kubectl describe pod <pod-name> -n diggai-takios
kubectl logs <pod-name> -n diggai-takios
```

### Ingress funktioniert nicht
```bash
kubectl get ingress -n diggai-takios
kubectl describe ingress takios-ingress -n diggai-takios
```

### SSL-Zertifikat
```bash
kubectl get certificates -n diggai-takios
kubectl describe certificate takios-cert -n diggai-takios
```
