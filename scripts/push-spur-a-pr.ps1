# push-spur-a-pr.ps1
# ----------------------------------------------------------------------------
# Erstellt einen Branch, committed alle Spur-A-Änderungen, pushed zu origin
# und öffnet (optional) einen PR via gh CLI.
#
# Voraussetzungen:
#   - PowerShell mit Schreibrechten in D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master
#   - git installiert
#   - (optional) gh CLI installiert + eingeloggt: `gh auth login`
#
# Aufruf:
#   .\scripts\push-spur-a-pr.ps1
#   .\scripts\push-spur-a-pr.ps1 -SkipPR     # nur push, keinen PR öffnen
#   .\scripts\push-spur-a-pr.ps1 -DryRun     # zeigt nur was passieren würde
# ----------------------------------------------------------------------------

[CmdletBinding()]
param(
    [string]$BranchName = "regulatory/spur-a-no-mdsw",
    [string]$BaseBranch = "master",
    [switch]$SkipPR,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

Write-Host ""
Write-Host "==========================================================="
Write-Host " Spur A — Reklassifizierung: Branch-Push und PR-Eröffnung"
Write-Host "==========================================================="
Write-Host ""

Set-Location -Path $RepoRoot

# ─── 0. Sanity-Checks ─────────────────────────────────────────────
Write-Host "[0/6] Sanity-Checks..." -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    Write-Error "Kein .git-Ordner. Falsches Verzeichnis?"
    exit 1
}
$GitStatus = git status --porcelain
if (-not $GitStatus) {
    Write-Warning "Keine geänderten Files — nichts zu committen."
    exit 0
}
$ChangedCount = ($GitStatus -split "`n").Count
Write-Host "    -> $ChangedCount geänderte Files erkannt" -ForegroundColor Green

# ─── 1. Aktuellen Branch sichern ─────────────────────────────────
$CurrentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "[1/6] Aktueller Branch: $CurrentBranch" -ForegroundColor Cyan

# ─── 2. master holen + neuen Branch ──────────────────────────────
Write-Host "[2/6] Hole $BaseBranch und erstelle Feature-Branch..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "    [DRY-RUN] git fetch origin"
    Write-Host "    [DRY-RUN] git checkout -b $BranchName origin/$BaseBranch"
} else {
    git fetch origin
    # Prüfen ob Branch lokal schon existiert
    $LocalBranches = git branch --list $BranchName
    if ($LocalBranches) {
        Write-Warning "Branch $BranchName existiert bereits lokal. Wechsel zu existierendem Branch."
        git checkout $BranchName
        git rebase origin/$BaseBranch
    } else {
        git checkout -b $BranchName "origin/$BaseBranch"
    }
}

# ─── 3. Stagen ────────────────────────────────────────────────────
Write-Host "[3/6] Stage alle Änderungen..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "    [DRY-RUN] git add -A"
    git status --short
} else {
    git add -A
    Write-Host "    -> staged"
}

# ─── 4. Commit ───────────────────────────────────────────────────
$CommitMessage = @"
regulatory: Spur A — Reklassifizierung "Kein Medizinprodukt nach MDR Art. 2(1)"

DiggAi wird konsistent als administrative Praxis-Anmelde- und Routing-Plattform
repositioniert. Patient-Output ist strukturell frei von Diagnose-Sprache,
Marketing widerspricht der Hersteller-Position nicht mehr.

Architektur (additiv):
- RoutingEngine mit patientMessage/staffMessage-Trennung
- AnmeldeHinweisOverlay (Patient-UI, ersetzt RedFlagOverlay)
- routingHintFromTriage (Frontend-Adapter)
- toPatientSafeView() — strukturelles Leak-Schloss

Aufrufer migriert:
- server/routes/answers.ts auf RoutingEngine
- server/socket.ts mit emitRoutingHint + Backwards-Compat-Mirror
- Frontend-Listener in 3 Dashboards mit Doppel-Lauschstrategie
- usePatientApi konsumiert routingHints

Daten/i18n/Marketing:
- 12 triage.message-Diagnose-Texte aus questions.ts/new-questions.ts entfernt
- 15 anmeldeHinweis*-i18n-Keys in 10 Sprachen
- LandingPage + 4 marketing/-Markdowns sprachlich entlastet
- DE-i18n: docs.feature.triage.*, ai.suggestTherapy, arzt.aiAnalysis entlastet

Test-Coverage (3 neue Suiten als CI-Gate):
- RoutingEngine.regulatory.test.ts (Verbots-Wortliste)
- RoutingEngine.priority.test.ts (Strukturtests + toPatientSafeView-Leak-Garantie)
- e2e/regulatory/no-diagnosis-to-patient.spec.ts

Verbindliche Hersteller-Doks (6):
- docs/REGULATORY_STRATEGY.md (Strategie ~22 S.)
- docs/INTENDED_USE.md (Zweckbestimmung mit Sign-off-Block)
- docs/REGULATORY_POSITION.md (MDCG-2019-11-Subsumtion)
- docs/CHANGE_LOG_REGULATORY.md (Audit-Trail)
- docs/ROUTING_RULES.md (maßgebliche Regelreferenz)
- docs/MIGRATION_NEXT_STEPS.md (Cleanup-PR-Plan)

CI-Fixes:
- config.test.ts JWT-Erwartung auf '15m' (Drift behoben)
- config.ts requireEnv() defensiv gegen Scientific-Notation

Backwards-Compat (additiv, Cleanup nach Roll-Out):
- emitTriageAlert + triage:alert-Event-Mirror in server/socket.ts
- redFlags-Response-Alias in server/routes/answers.ts
- Doppel-Listener in 3 Dashboards

Sign-off-Pflicht: Dr. Klapproth + Dr. Al-Shdaifat + Tech-Lead.
Refs: docs/PR_SPUR_A_REGULATORY.md (drop-in PR-Body).
"@

Write-Host "[4/6] Commit..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "    [DRY-RUN] git commit mit Multiline-Message"
    Write-Host $CommitMessage.Substring(0, [Math]::Min(200, $CommitMessage.Length)) "..."
} else {
    git commit -m $CommitMessage
    $CommitSha = git rev-parse --short HEAD
    Write-Host "    -> commit $CommitSha" -ForegroundColor Green
}

# ─── 5. Push ─────────────────────────────────────────────────────
Write-Host "[5/6] Push zu origin..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "    [DRY-RUN] git push -u origin $BranchName"
} else {
    git push -u origin $BranchName
    Write-Host "    -> gepusht" -ForegroundColor Green
}

# ─── 6. PR öffnen (optional via gh) ──────────────────────────────
if ($SkipPR) {
    Write-Host "[6/6] PR-Eröffnung übersprungen (-SkipPR gesetzt)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "PR-Body-Vorlage liegt in: docs/PR_SPUR_A_REGULATORY.md"
    Write-Host "Manueller PR-Open: https://github.com/DiggAiHH/diggai-anamnese/compare/$BaseBranch...$BranchName"
    exit 0
}

Write-Host "[6/6] Öffne PR via gh CLI..." -ForegroundColor Cyan
$GhExists = Get-Command gh -ErrorAction SilentlyContinue
if (-not $GhExists) {
    Write-Warning "gh CLI nicht installiert. PR muss manuell auf GitHub eröffnet werden."
    Write-Host "    https://github.com/DiggAiHH/diggai-anamnese/compare/$BaseBranch...$BranchName"
    exit 0
}

$PrBodyPath = "docs\PR_SPUR_A_REGULATORY.md"
if (-not (Test-Path $PrBodyPath)) {
    Write-Warning "$PrBodyPath fehlt — PR wird mit Standard-Body eröffnet."
    if ($DryRun) {
        Write-Host "    [DRY-RUN] gh pr create --base $BaseBranch --head $BranchName --title 'regulatory: Spur A ...' "
    } else {
        gh pr create --base $BaseBranch --head $BranchName --title "regulatory: Spur A — Kein Medizinprodukt nach MDR Art. 2(1)"
    }
} else {
    if ($DryRun) {
        Write-Host "    [DRY-RUN] gh pr create --base $BaseBranch --head $BranchName --body-file $PrBodyPath"
    } else {
        gh pr create `
            --base $BaseBranch `
            --head $BranchName `
            --title "regulatory: Spur A — Kein Medizinprodukt nach MDR Art. 2(1)" `
            --body-file $PrBodyPath
        Write-Host "    -> PR eröffnet" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "==========================================================="
Write-Host " FERTIG. Nächste Schritte:"
Write-Host "==========================================================="
Write-Host ""
Write-Host "  1. CI-Lauf abwarten (GitHub Actions oder lokal: npm run check-all)"
Write-Host "  2. Sign-off durch Dr. Klapproth + Dr. Al-Shdaifat einholen"
Write-Host "  3. PR mergen"
Write-Host "  4. Backend deployen — siehe docs/DEPLOY_RENDER_FREE.md"
Write-Host "  5. Nach 14 Tagen Cache-Drain: Cleanup-PR per docs/MIGRATION_NEXT_STEPS.md"
Write-Host ""
