# DiggAI API Changelog

> **Versioning**: Semantic Versioning (MAJOR.MINOR.PATCH)  
> **Last Updated**: 2026-03-23

---

## Version 3.0.0 (2026-03-23)

### Overview
Initial production release of DiggAI Anamnese Platform API v3.0.0.

### Added

#### Sessions
- `POST /api/sessions` - Create new patient session
- `POST /api/sessions/qr-token` - Generate QR code token
- `GET /api/sessions/:id/state` - Get session state with answers
- `POST /api/sessions/:id/submit` - Submit completed session
- `POST /api/sessions/refresh-token` - Refresh JWT token

#### Answers
- `POST /api/sessions/:id/answers` - Submit answer with triage evaluation
- Rate limiting: 30 submissions per minute per session
- Automatic triage trigger on each submission
- Real-time progress tracking

#### Authentication
- `POST /api/arzt/login` - Medical staff authentication
- `POST /api/arzt/logout` - Token invalidation
- JWT with HttpOnly cookies
- Rate limiting: 5 attempts per 15 minutes
- Role-based access control (RBAC)

#### Arzt (Doctor) Endpoints
- `GET /api/arzt/sessions` - List all patient sessions
- `GET /api/arzt/sessions/:id` - Get detailed session view
- `PUT /api/arzt/triage/:id/ack` - Acknowledge triage alerts
- `PUT /api/arzt/sessions/:id/status` - Update session status
- `GET /api/arzt/sessions/:id/summary` - AI-generated summary

#### MFA (Medical Assistant) Endpoints
- `GET /api/mfa/sessions` - MFA session overview
- `GET /api/mfa/doctors` - List available doctors
- `POST /api/mfa/sessions/:id/assign` - Assign doctor to session

#### Admin Endpoints
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/sessions/timeline` - Session timeline data
- `GET /api/admin/analytics/services` - Service distribution
- `GET /api/admin/analytics/triage` - Triage analytics
- `GET /api/admin/audit-log` - Paginated audit log
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Deactivate user
- Permission management endpoints

#### System Endpoints
- `GET /api/system/health` - Health check (no auth)
- `GET /api/system/info` - System information
- `GET /api/system/features` - Feature flags
- `GET /api/system/config` - System configuration
- `PUT /api/system/config` - Update configuration
- `GET /api/system/backups` - List backups
- `POST /api/system/backups` - Create backup
- `POST /api/system/backups/:id/restore` - Restore backup
- `DELETE /api/system/backups/:id` - Delete backup

#### Export Endpoints
- `GET /api/export/sessions/:id/export/csv` - CSV export
- `GET /api/export/sessions/:id/export/pdf` - HTML/PDF export
- `GET /api/export/sessions/:id/export/json` - JSON export
- Rate limiting: 10 exports per 5 minutes

#### Chat Endpoints
- `GET /api/chats/:sessionId` - Get chat history

#### Atoms (Questions) Endpoints
- `GET /api/atoms` - List question atoms
- `GET /api/atoms/:id` - Get single atom
- `PUT /api/atoms/reorder` - Reorder atoms
- `PUT /api/atoms/:id/toggle` - Activate/deactivate
- `POST /api/atoms/draft` - Save draft
- `GET /api/atoms/drafts` - List drafts
- `PUT /api/atoms/draft/:id/publish` - Publish draft
- `DELETE /api/atoms/draft/:id` - Delete draft

### Security Features
- AES-256-GCM encryption for all PII
- JWT authentication with HttpOnly cookies
- Rate limiting per endpoint category
- Comprehensive audit logging
- Role-based access control with granular permissions
- Tenant isolation for multi-tenancy

### Real-time Features
- Socket.IO for live updates
- Triage alert push notifications
- Session progress tracking
- Chat messaging
- Queue management

---

## Migration Guides

### Upgrading from v2.x

v3.0.0 is a complete rewrite with breaking changes:

1. **Authentication Changes**:
   - v2: Session-based auth
   - v3: JWT with HttpOnly cookies
   - Migration: Update auth logic to handle cookies

2. **Endpoint Changes**:
   - Base path changed from `/api/v2/` to `/api/`
   - Many endpoints restructured for REST consistency
   - See API_REFERENCE.md for new endpoint map

3. **Data Format Changes**:
   - Answer values now JSON-encoded
   - PII fields encrypted separately
   - Session status enum values changed

4. **Required Updates**:
   ```bash
   # Update client code
   npm install diggai-client@3.0.0
   
   # Run database migration
   npx prisma migrate deploy
   
   # Update environment variables
   # ENCRYPTION_KEY must be exactly 32 characters
   ```

---

## Deprecated Features

### v3.0.0 (Current)
No deprecated features in initial release.

### Planned Deprecations

| Feature | Deprecated | Removal | Replacement |
|---------|------------|---------|-------------|
| Bearer-only auth | - | v3.2.0 | HttpOnly cookies |
| XML export | - | v3.1.0 | JSON/CSV only |
| Legacy webhook format | - | v3.1.0 | New webhook schema |

---

## Breaking Changes

### v3.0.0
- Complete API redesign from v2.x
- New authentication mechanism
- Changed response formats
- Different error codes
- New rate limiting structure

---

## Version Support

| Version | Status | Support Until |
|---------|--------|---------------|
| 3.0.x | Active | 2027-03-23 |
| 2.x | EOL | 2026-06-23 |
| 1.x | EOL | 2025-12-31 |

---

## Changelog Format

Each version includes:
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

## Reporting Issues

Found an issue with the API?

1. Check this changelog for known changes
2. Review API_REFERENCE.md for correct usage
3. Check status page: https://status.diggai.de
4. Report to: support@diggai.de

Include:
- API version
- Endpoint
- Request/response details
- Timestamp
- Error message

---

*This changelog follows [Keep a Changelog](https://keepachangelog.com/) format.*
