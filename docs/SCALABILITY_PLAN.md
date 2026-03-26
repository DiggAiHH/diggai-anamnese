# DiggAI Anamnese - Scalability Plan

## Executive Summary

This document outlines the scalability strategy for the DiggAI Anamnese platform to support 1000+ concurrent users with p95 response times under 200ms.

**Current Architecture**: Single VPS deployment (Node.js + PostgreSQL)
**Target Capacity**: 1000+ concurrent users
**Target Performance**: p95 < 200ms, Error rate < 0.1%

---

## Current Architecture Analysis

### Stack Overview

| Layer | Technology | Scaling Limitation |
|-------|------------|-------------------|
| Frontend | React 19 + Vite + Netlify CDN | Auto-scales (CDN) |
| Backend | Express 5 + Node.js | Single process, CPU bound |
| Database | PostgreSQL 16 | Connection limit, I/O bound |
| Cache | Redis 7 (optional) | Memory bound |
| Realtime | Socket.IO 4 | Connection limit per node |

### Identified Bottlenecks

1. **Single Node.js Process**
   - No clustering enabled
   - CPU-intensive operations block event loop
   - Memory leaks accumulate over time

2. **Database Connection Pool**
   - Default Prisma configuration
   - No connection pooling optimization
   - Query performance degrades under load

3. **No Horizontal Scaling**
   - Single point of failure
   - Cannot distribute load across instances
   - Maintenance requires downtime

4. **Missing Monitoring**
   - No real-time performance metrics
   - No automatic alerting
   - Reactive rather than proactive scaling

---

## Scaling Phases

### Phase 0: Immediate Optimizations (Week 1-2)

**Goal**: Maximize current single-server capacity

#### Actions

1. **Enable Node.js Clustering**
   ```javascript
   // server/cluster.ts
   import cluster from 'cluster';
   import os from 'os';
   
   const numCPUs = os.cpus().length;
   
   if (cluster.isPrimary) {
     for (let i = 0; i < numCPUs; i++) {
       cluster.fork();
     }
   } else {
     import('./index.js');
   }
   ```

2. **Database Connection Pooling**
   ```typescript
   // server/db.ts
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
   });
   ```
   Add to `.env`:
   ```
   DB_POOL_SIZE=20
   DB_MAX_CONNECTIONS=100
   DB_TIMEOUT=30000
   ```

3. **Implement Request Caching**
   - Redis for session data
   - In-memory cache for static data
   - CDN caching for assets

4. **Optimize Database Queries**
   - Add indexes on frequently queried columns
   - Use select statements to limit data retrieval
   - Implement query result caching

**Expected Capacity**: 300-500 concurrent users

---

### Phase 1: Vertical Scaling (Week 3-4)

**Goal**: Increase single-server resources

#### Actions

1. **Upgrade VPS Specifications**
   | Resource | Current | Target |
   |----------|---------|--------|
   | CPU | 2 cores | 4-8 cores |
   | RAM | 4 GB | 16-32 GB |
   | SSD | 50 GB | 200 GB NVMe |
   | Network | 1 Gbps | 10 Gbps |

2. **Database Optimization**
   - Enable PostgreSQL connection pooling (PgBouncer)
   - Configure shared_buffers (25% of RAM)
   - Enable query parallelization

3. **Application Tuning**
   - Increase Node.js memory limit: `--max-old-space-size=8192`
   - Enable gzip compression
   - Optimize static asset delivery

**Expected Capacity**: 500-800 concurrent users
**Cost**: ~€100-200/month

---

### Phase 2: Horizontal Scaling (Month 2-3)

**Goal**: Distribute load across multiple instances

#### Architecture Changes

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
│                     (Nginx/Cloudflare)                       │
└──────────────────┬──────────────────┬───────────────────────┘
                   │                  │
        ┌──────────▼──────────┐      ┌▼──────────┐
        │   App Instance 1    │      │  App      │
        │   (Node.js + PM2)   │      │ Instance 2│
        └──────────┬──────────┘      └─────┬─────┘
                   │                       │
                   └───────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Database Primary   │
                    │   (PostgreSQL)      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Database Replica   │
                    │   (Read-only)       │
                    └─────────────────────┘
```

#### Actions

1. **Load Balancer Setup**
   - Nginx reverse proxy with upstream configuration
   - Health checks and automatic failover
   - Sticky sessions for WebSocket support

2. **Application Layer**
   - Stateless application design
   - Session storage in Redis
   - File uploads to object storage (S3)

3. **Database Scaling**
   - Primary-replica configuration
   - Read queries to replicas
   - Write queries to primary

4. **Redis Cluster**
   - Redis Sentinel for high availability
   - Session distribution across nodes

**Expected Capacity**: 1000-2000 concurrent users
**Cost**: ~€300-500/month

---

### Phase 3: Kubernetes & Microservices (Month 6-12)

**Goal**: Cloud-native auto-scaling architecture

#### Target Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Ingress Controller                     │
│                      (NGINX/Traefik)                          │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│  API Gateway   │   │  WebSocket      │   │  Admin Service  │
│  (Kong/AWS)    │   │  Service        │   │                 │
└───────┬────────┘   └────────┬────────┘   └─────────────────┘
        │                     │
        └─────────────────────┘
                   │
    ┌──────────────┼──────────────┬──────────────┐
    │              │              │              │
┌───▼────┐   ┌────▼─────┐   ┌────▼─────┐  ┌────▼─────┐
│  Auth  │   │ Session  │   │  Answer  │  │ Analytics│
│Service │   │ Service  │   │ Service  │  │ Service  │
└───┬────┘   └────┬─────┘   └────┬─────┘  └────┬─────┘
    │             │              │             │
    └─────────────┴──────────────┴─────────────┘
                   │
        ┌──────────▼──────────┐
        │   PostgreSQL Cluster │
        │  (Patroni/Cloud SQL) │
        └─────────────────────┘
```

#### Actions

1. **Container Orchestration**
   - Kubernetes cluster (GKE/EKS/AKS)
   - Helm charts for deployment
   - Horizontal Pod Autoscaling (HPA)

2. **Service Mesh**
   - Istio or Linkerd for traffic management
   - mTLS between services
   - Circuit breakers and retries

3. **Database**
   - Managed PostgreSQL (Cloud SQL/RDS)
   - Automatic backups and failover
   - Read replicas in multiple regions

4. **Monitoring & Observability**
   - Prometheus + Grafana
   - Distributed tracing (Jaeger)
   - Centralized logging (ELK/Loki)

**Expected Capacity**: 5000+ concurrent users
**Cost**: ~€800-1500/month

---

## Scaling Triggers

### Automatic Scaling Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Usage | > 60% | > 80% | Scale up |
| Memory Usage | > 70% | > 85% | Scale up |
| Response Time p95 | > 150ms | > 300ms | Scale up |
| Error Rate | > 0.05% | > 0.5% | Alert + Scale |
| Disk Usage | > 75% | > 90% | Cleanup/Scale |
| DB Connections | > 70% | > 90% | Pool tuning |

### Manual Review Triggers

- Sustained load > 80% capacity for 1 hour
- Error rate trending upward over 24 hours
- User growth > 20% month-over-month
- New feature launch anticipated

---

## Capacity Planning

### User Growth Projections

| Timeline | Concurrent Users | Architecture Phase |
|----------|------------------|-------------------|
| Month 1 | 100-300 | Phase 0 |
| Month 3 | 300-800 | Phase 1 |
| Month 6 | 800-1500 | Phase 2 |
| Month 12 | 1500-5000 | Phase 3 |
| Year 2 | 5000+ | Phase 3 optimized |

### Cost Projections

| Phase | Monthly Cost | Per User/Month |
|-------|--------------|----------------|
| Phase 0 | €50-100 | €0.50-1.00 |
| Phase 1 | €100-200 | €0.20-0.40 |
| Phase 2 | €300-500 | €0.15-0.30 |
| Phase 3 | €800-1500 | €0.10-0.20 |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database bottleneck | High | Critical | Implement read replicas, query optimization |
| Memory leaks | Medium | High | Regular restarts, monitoring, profiling |
| DDoS attack | Low | Critical | Rate limiting, Cloudflare, WAF |
| Data loss | Low | Critical | Automated backups, point-in-time recovery |
| Vendor lock-in | Medium | Medium | Multi-cloud strategy, containerization |

---

## Monitoring & Alerting

### Key Metrics to Track

1. **Application Metrics**
   - Request rate, latency, error rate
   - Active connections, queue depth
   - Memory and CPU usage

2. **Database Metrics**
   - Query performance, slow queries
   - Connection pool utilization
   - Replication lag

3. **Business Metrics**
   - Active sessions, completed anamneses
   - User registration rate
   - Revenue per user

### Alerting Channels

- PagerDuty for critical alerts
- Slack for warnings
- Email for daily summaries
- Dashboard for real-time monitoring

---

## Implementation Timeline

```
Week 1-2:   Phase 0 - Immediate optimizations
Week 3-4:   Phase 1 - Vertical scaling
Month 2:    Phase 2 - Horizontal scaling preparation
Month 3:    Phase 2 - Multi-instance deployment
Month 6:    Phase 3 - Kubernetes migration start
Month 9:    Phase 3 - Full Kubernetes deployment
Month 12:   Phase 3 - Optimization and cost tuning
```

---

## Success Criteria

- [ ] 1000+ concurrent users supported
- [ ] p95 response time < 200ms
- [ ] Error rate < 0.1%
- [ ] 99.9% uptime
- [ ] Zero-downtime deployments
- [ ] Automatic scaling capabilities
- [ ] Comprehensive monitoring coverage

---

## Appendix

### A. Load Testing Results
[Link to load test reports]

### B. Performance Benchmarks
[Link to benchmarks.yml]

### C. Architecture Diagrams
[Link to detailed diagrams]

### D. Runbooks
- [Scaling procedures](./runbooks/scaling.md)
- [Incident response](./runbooks/incidents.md)
- [Deployment procedures](./runbooks/deployment.md)
