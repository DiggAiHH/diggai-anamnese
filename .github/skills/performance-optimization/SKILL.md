---
name: performance-optimization
description: "Frontend and backend performance optimization for DiggAI. Use when analyzing bundle size, implementing lazy loading, optimizing React renders, improving database queries, configuring caching (Redis), reducing load times, or running bundle analysis."
metadata:
  author: diggai
  version: "1.0"
  domain: performance
---

# Performance Optimization Skill

## Frontend-Performance

### Bundle-Analyse
```bash
npm run build:analyze    # Vite Bundle-Analyzer
```

### Lazy Loading (React Router v7)
```tsx
// src/App.tsx — Alle Pages lazy-loaded
const ArztDashboard = lazy(() => import('./pages/ArztDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
```

### React-Optimierungen
- `React.memo()` für reine Darstellungskomponenten
- `useMemo()` / `useCallback()` nur bei messbarem Perf-Problem
- Zustand-Selektoren für granulare Re-Renders
- TanStack Query für Server-State Caching + Deduplication

### Tailwind CSS 4 (Vite-Plugin)
- Kein PurgeCSS nötig — automatisch tree-shaken
- Utility-Klassen bevorzugen statt Custom CSS

## Backend-Performance

### Prisma Query-Optimierung
```typescript
// ✅ Select nur benötigte Felder
const patients = await prisma.patient.findMany({
  select: { id: true, encFirstName: true, createdAt: true },
  where: { deletedAt: null },
  orderBy: { createdAt: 'desc' },
  take: 50,
});

// ❌ Alle Felder laden
// const patients = await prisma.patient.findMany();
```

### Redis Caching (optional)
```typescript
// Cache häufig abgerufene, nicht-personenbezogene Daten
const cached = await redis.get('system:settings');
if (cached) return JSON.parse(cached);
const settings = await prisma.systemSetting.findMany();
await redis.set('system:settings', JSON.stringify(settings), 'EX', 300);
```

### Database-Indizes
```prisma
// Häufig gefilterte/sortierte Felder indizieren
@@index([patientId, createdAt])
@@index([status, priority])
```

## Performance-Budgets

Referenz: `.github/performance-budget.json`

### Zielwerte
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.0s
- **Bundle Size (JS)**: < 500 KB gzipped
- **API Response**: < 200ms (95th percentile)
- **Triage-Berechnung**: < 2s

## Checkliste

- [ ] Bundle-Größe nach Änderung geprüft?
- [ ] Lazy Loading für neue Pages?
- [ ] Prisma-Queries mit `select` beschränkt?
- [ ] Unnötige Re-Renders vermieden?
- [ ] Redis-Cache für nicht-sensible Daten?
- [ ] DB-Indizes für neue Filter/Sortierung?
