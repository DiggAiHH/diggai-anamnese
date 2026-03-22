# DiggAI One-Click Deployment Script for Windows
# Run as Administrator: powershell -ExecutionPolicy Bypass -File deploy-one-click.ps1

#Requires -RunAsAdministrator

param(
    [string]$InstallDir = "C:\ProgramData\DiggAI",
    [string]$Version = "latest",
    [string]$Domain = "",
    [switch]$SkipSSL = $false
)

# Error handling
$ErrorActionPreference = "Stop"

# Colors
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warn { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Check requirements
function Test-Requirements {
    Write-Info "Checking system requirements..."
    
    # Check Windows version
    $os = Get-CimInstance Win32_OperatingSystem
    if ([version]$os.Version -lt [version]"10.0.17763") {
        Write-Error "Windows Server 2019 or Windows 10 version 1809+ required"
        exit 1
    }
    
    # Check Docker
    try {
        $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
        Write-Info "Docker version: $dockerVersion"
    } catch {
        Write-Error "Docker not found. Please install Docker Desktop or Docker Engine."
        exit 1
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker-compose version --short 2>$null
        Write-Info "Docker Compose version: $composeVersion"
    } catch {
        Write-Error "Docker Compose not found"
        exit 1
    }
    
    # Check ports
    $ports = @(80, 443, 3001, 5432)
    foreach ($port in $ports) {
        $listener = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($listener) {
            Write-Warn "Port $port is already in use"
        }
    }
    
    Write-Success "System requirements met"
}

# Setup directory
function Initialize-Directory {
    Write-Info "Setting up installation directory: $InstallDir"
    
    if (Test-Path $InstallDir) {
        Write-Warn "Directory $InstallDir already exists"
        $confirm = Read-Host "Overwrite? (y/N)"
        if ($confirm -ne 'y') {
            Write-Error "Installation cancelled"
            exit 1
        }
        Remove-Item -Recurse -Force $InstallDir
    }
    
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Set-Location $InstallDir
    Write-Success "Directory created"
}

# Clone repository
function Clone-Repository {
    Write-Info "Cloning DiggAI repository..."
    
    $repoUrl = "https://github.com/diggai/anamnese-platform"
    
    if ($Version -eq "latest") {
        git clone --depth 1 $repoUrl .
    } else {
        git clone --branch $Version --depth 1 $repoUrl .
    }
    
    Write-Success "Repository cloned"
}

# Generate secrets
function New-Secrets {
    Write-Info "Generating secure secrets..."
    
    $script:JwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    $script:EncryptionKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    $script:DbPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
    $script:AdminPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 12 | ForEach-Object { [char]$_ })
    
    Write-Success "Secrets generated"
}

# Create environment file
function New-EnvironmentFile {
    Write-Info "Creating environment configuration..."
    
    $frontendUrl = if ($Domain) { "https://$Domain" } else { "http://localhost" }
    
    @"
# DiggAI Anamnese Platform - Production Environment
# Generated: $(Get-Date)

# Database
DATABASE_URL="postgresql://diggai:${script:DbPassword}@postgres:5432/anamnese?schema=public"

# Security
JWT_SECRET="${script:JwtSecret}"
ENCRYPTION_KEY="${script:EncryptionKey}"
ARZT_PASSWORD="${script:AdminPassword}"

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL="$frontendUrl"

# Feature Flags
NFC_ENABLED=true
TELEMED_ENABLED=true
PAYMENT_ENABLED=false
TI_ENABLED=false
"@ | Out-File -FilePath ".env.production" -Encoding UTF8
    
    Write-Success "Environment file created"
    Write-Warn "IMPORTANT: Save these credentials securely!"
    Write-Info "Admin Password: $script:AdminPassword"
}

# Start services
function Start-Services {
    Write-Info "Starting DiggAI services..."
    
    docker-compose -f docker-compose.prod.yml pull
    docker-compose -f docker-compose.prod.yml up -d
    
    Write-Info "Waiting for database..."
    Start-Sleep -Seconds 15
    
    Write-Info "Running migrations..."
    docker-compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy
    
    Write-Info "Seeding database..."
    docker-compose -f docker-compose.prod.yml exec -T app npx prisma db seed
    
    Write-Success "Services started"
}

# Setup SSL
function Install-SSLCertificate {
    if ($SkipSSL -or -not $Domain) {
        Write-Warn "Skipping SSL setup"
        return
    }
    
    Write-Info "Setting up SSL for $Domain..."
    
    # Use Win-ACME or similar for Windows
    # This is a simplified example
    Write-Warn "SSL setup requires manual certificate installation on Windows Server"
    Write-Info "Consider using:"
    Write-Info "  1. Win-ACME (https://www.win-acme.com/)"
    Write-Info "  2. Certify The Web (https://certifytheweb.com/)"
    Write-Info "  3. Manual certificate import into IIS/certlm.msc"
}

# Health check
function Test-Health {
    Write-Info "Running health checks..."
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 5
            Write-Success "Application is healthy"
            return
        } catch {
            Write-Info "Waiting for application... (attempt $attempt/$maxAttempts)"
            Start-Sleep -Seconds 5
            $attempt++
        }
    }
    
    Write-Error "Application failed to start"
    docker-compose logs app | Select-Object -Last 50
    exit 1
}

# Setup backup task
function Register-BackupTask {
    Write-Info "Setting up automated backups..."
    
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-Command cd '$InstallDir'; docker-compose exec -T postgres pg_dump -U diggai anamnese > backups\backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
    $trigger = New-ScheduledTaskTrigger -Daily -At "2:00 AM"
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    Register-ScheduledTask -TaskName "DiggAI-Backup" -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
    
    Write-Success "Backup task registered"
}

# Print completion
function Show-CompletionMessage {
    $url = if ($Domain) { "https://$Domain" } else { "http://localhost:3001" }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  DiggAI Installation Complete!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application URL: $url"
    Write-Host "Admin Password:  $script:AdminPassword"
    Write-Host ""
    Write-Host "Installation Directory: $InstallDir"
    Write-Host ""
    Write-Host "Useful commands:"
    Write-Host "  cd '$InstallDir'"
    Write-Host "  docker-compose logs -f app    # View logs"
    Write-Host "  docker-compose ps             # Check status"
    Write-Host "  docker-compose restart        # Restart services"
    Write-Host ""
    Write-Host "Backup location: $InstallDir\backups\"
    Write-Host ""
    Write-Warn "IMPORTANT:"
    Write-Host "  1. Save your admin password securely!"
    Write-Host "  2. Configure Windows Firewall to allow ports 80/443"
    Write-Host "  3. Set up monitoring and alerting"
    Write-Host ""
    Write-Host "Documentation: https://docs.diggai.de"
    Write-Host "Support: support@diggai.de"
    Write-Host "==========================================" -ForegroundColor Green
}

# Main
function Main {
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "  DiggAI Anamnese Platform Installer"
    Write-Host "  Windows Edition"
    Write-Host "=========================================="
    Write-Host ""
    
    Test-Requirements
    Initialize-Directory
    Clone-Repository
    New-Secrets
    New-EnvironmentFile
    Start-Services
    Install-SSLCertificate
    Register-BackupTask
    Test-Health
    Show-CompletionMessage
}

# Run
Main
