# Load Test Report Template

## Test Information

| Field | Value |
|-------|-------|
| Test Date | [YYYY-MM-DD] |
| Test Environment | [staging/production/local] |
| Test Duration | [Duration] |
| Scenario | [normal/peak/stress/spike/endurance] |
| Max VUs | [Number] |
| Test Executor | [Name] |

## System Under Test

| Component | Version | Configuration |
|-----------|---------|---------------|
| Frontend | [Version] | [Config] |
| Backend | [Version] | [Config] |
| Database | [Version] | [Config] |
| Cache | [Version] | [Config] |

## Test Results Summary

### Response Times

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| p50 Response Time | < 100ms | [X] ms | [✅/❌] |
| p95 Response Time | < 200ms | [X] ms | [✅/❌] |
| p99 Response Time | < 500ms | [X] ms | [✅/❌] |
| Mean Response Time | - | [X] ms | - |
| Min Response Time | - | [X] ms | - |
| Max Response Time | - | [X] ms | - |

### Throughput

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| Requests/sec | > 500 | [X] | [✅/❌] |
| Total Requests | - | [X] | - |

### Error Rates

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| Error Rate | < 0.1% | [X]% | [✅/❌] |
| Failed Requests | 0 | [X] | [✅/❌] |

### Concurrent Users

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| Max Concurrent Users | 1000 | [X] | [✅/❌] |
| Sustained Users | [X] | [X] | [✅/❌] |

## Detailed Metrics

### API Endpoints

| Endpoint | p50 | p95 | p99 | Requests | Errors |
|----------|-----|-----|-----|----------|--------|
| POST /api/sessions | [X]ms | [X]ms | [X]ms | [X] | [X] |
| POST /api/answers/:id | [X]ms | [X]ms | [X]ms | [X] | [X] |
| GET /api/sessions | [X]ms | [X]ms | [X]ms | [X] | [X] |
| GET /api/dashboard/overview | [X]ms | [X]ms | [X]ms | [X] | [X] |
| GET /api/health | [X]ms | [X]ms | [X]ms | [X] | [X] |

### Database Performance

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| Query p95 | < 50ms | [X] ms | [✅/❌] |
| Connection Pool Usage | < 80% | [X]% | [✅/❌] |
| Active Connections | < 20 | [X] | [✅/❌] |

### Resource Utilization

| Resource | Baseline | Peak | Threshold | Status |
|----------|----------|------|-----------|--------|
| CPU Usage | [X]% | [X]% | 70% | [✅/❌] |
| Memory Usage | [X]% | [X]% | 80% | [✅/❌] |
| Disk I/O | [X] | [X] | - | [✅/❌] |
| Network I/O | [X] | [X] | - | [✅/❌] |

## Bottlenecks Identified

### Critical (Immediate Action Required)

1. **[Issue Name]**
   - **Description**: [Description]
   - **Impact**: [Impact]
   - **Evidence**: [Data/evidence]
   - **Recommendation**: [Action]

### High (Address Before Go-Live)

1. **[Issue Name]**
   - **Description**: [Description]
   - **Impact**: [Impact]
   - **Evidence**: [Data/evidence]
   - **Recommendation**: [Action]

### Medium (Address in Next Sprint)

1. **[Issue Name]**
   - **Description**: [Description]
   - **Impact**: [Impact]
   - **Recommendation**: [Action]

## Recommendations

### Immediate Actions

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

### Short-term (1-4 weeks)

1. [Recommendation 1]
2. [Recommendation 2]

### Long-term (1-3 months)

1. [Recommendation 1]
2. [Recommendation 2]

## Comparison with Previous Tests

| Metric | Previous | Current | Change |
|--------|----------|---------|--------|
| p95 Response | [X]ms | [X]ms | [+/-X%] |
| Error Rate | [X]% | [X]% | [+/-X%] |
| Max Users | [X] | [X] | [+/-X%] |

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Test Engineer | | | |
| DevOps Engineer | | | |
| Product Owner | | | |
| Security Lead | | | |

## Appendices

### A. Test Configuration
```javascript
// K6 options used
```

### B. Raw Results
[Link to raw K6 results file]

### C. Screenshots
[Grafana dashboards, monitoring graphs]

### D. Logs
[Relevant application logs during test]
