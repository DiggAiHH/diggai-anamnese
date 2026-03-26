# DiggAI Quick Start Guide

> **Get up and running in 5 minutes**  
> **Version**: 3.0.0

---

## Prerequisites

Before you begin, ensure you have:

- [ ] Node.js 22+ installed
- [ ] Docker Desktop installed
- [ ] Git installed
- [ ] Access to the repository
- [ ] Admin credentials (provided separately)

---

## 1-Minute Setup

### Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd anamnese-app

# Install dependencies
npm install
```

### Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.local.yml up -d
```

### Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env with your values:
# DATABASE_URL="postgresql://user:pass@localhost:5432/anamnese"
# JWT_SECRET="your-32-character-secret-key-here!!"
# ENCRYPTION_KEY="exactly-32-characters-long!!"
```

### Setup Database

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed database (270+ questions + admin user)
npx prisma db seed
```

### Start Development

```bash
# Start both frontend and backend
npm run dev

# Or separately:
npm run dev:server  # Backend only (:3001)
npm run dev         # Frontend only (:5173)
```

✅ **Done!** Access at http://localhost:5173

---

## First Login

### Default Admin Account

```
Username: admin
Password: (from seed output or env ARZT_PASSWORD)
```

Login at: http://localhost:5173/admin

### First Steps

1. **Change admin password**
   - Go to Profile → Change Password
   - Use strong password (12+ characters)

2. **Create doctor accounts**
   - Admin → Users → New User
   - Role: ARZT
   - Generate secure password

3. **Create MFA accounts**
   - Admin → Users → New User
   - Role: MFA
   - For reception staff

4. **Test patient flow**
   - Open http://localhost:5173
   - Click "Jetzt starten"
   - Complete demo session

---

## Common Commands

### Development

```bash
npm run dev              # Start dev servers
npm run dev:server       # Backend only
npm run dev:all          # Everything parallel
npm run build            # Production build
npm run preview          # Preview production build
```

### Database

```bash
npx prisma migrate dev --name <name>   # Create migration
npx prisma migrate deploy              # Deploy migrations
npx prisma generate                    # Regenerate client
npx prisma db seed                     # Seed data
npx prisma studio                      # Open DB GUI
```

### Testing

```bash
npx playwright test              # Run E2E tests
npx playwright test --ui         # Interactive mode
npm run type-check               # TypeScript check
npm run lint                     # ESLint check
npm run check-all                # All checks
```

---

## Quick Tasks

### Create a New User

1. Login as admin
2. Navigate to **Admin** → **Users**
3. Click **"Neuen Benutzer anlegen"**
4. Fill form:
   - Username: `dr.schmidt`
   - Password: (generate strong)
   - Display Name: `Dr. Schmidt`
   - Role: `ARZT`
5. Save and provide credentials securely

### Test Patient Session

1. Go to http://localhost:5173
2. Select service (e.g., "Termin / Anamnese")
3. Fill patient form
4. Submit
5. Check doctor dashboard for new session

### Export Session Data

1. Open session in doctor dashboard
2. Click **"Exportieren"**
3. Choose format (PDF/CSV/JSON)
4. Download file

---

## Troubleshooting

### "Database connection failed"

```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.local.yml ps

# Restart if needed
docker-compose -f docker-compose.local.yml restart postgres

# Check logs
docker-compose -f docker-compose.local.yml logs postgres
```

### "Migration failed"

```bash
# Reset database (WARNING: loses data)
npx prisma migrate reset

# Or manually fix and retry
npx prisma migrate dev
```

### "Port already in use"

```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Or use different ports in .env
PORT=3002
VITE_PORT=5174
```

---

## Next Steps

### For Administrators

- [ ] Read [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- [ ] Configure practice settings
- [ ] Set up backup schedule
- [ ] Review security policies

### For Doctors

- [ ] Read [USER_GUIDE.md](USER_GUIDE.md)
- [ ] Complete training exercises
- [ ] Practice triage workflows

### For Developers

- [ ] Read [API_REFERENCE.md](API_REFERENCE.md)
- [ ] Review [ARCHITECTURE.md](ARCHITECTURE.md)
- [ ] Check [SECURITY.md](SECURITY.md)

---

## Video Tutorials

🎥 **Getting Started** (5 min): https://diggai.de/training/quickstart  
🎥 **Admin Setup** (10 min): https://diggai.de/training/admin  
🎥 **Doctor Workflow** (8 min): https://diggai.de/training/doctor  
🎥 **Patient Perspective** (3 min): https://diggai.de/training/patient

---

## Support

| Resource | Link |
|----------|------|
| Documentation | https://docs.diggai.de |
| Video Tutorials | https://diggai.de/training |
| Status Page | https://status.diggai.de |
| Email Support | support@diggai.de |

---

## Success Checklist

- [ ] Repository cloned and dependencies installed
- [ ] Docker infrastructure running
- [ ] Database migrated and seeded
- [ ] Environment configured
- [ ] Development server running
- [ ] Admin login successful
- [ ] Test patient session completed
- [ ] Doctor account created
- [ ] Session export tested

**You're ready to go! 🎉**

---

*For detailed information, see the full documentation in the `/docs` folder.*
