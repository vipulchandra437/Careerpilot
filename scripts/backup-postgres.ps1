# PostgreSQL backup script for CareerPilot (PowerShell).
# Usage:
#   $env:DATABASE_URL = "postgresql://user:pass@localhost:5432/careerpilot?schema=public"
#   $env:BACKUP_DIR = ".\backups"
#   .\scripts\backup-postgres.ps1
$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required (postgres://...)" }
$BackupDir = $env:BACKUP_DIR
if (-not $BackupDir) { $BackupDir = ".\backups" }
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$Uri = [uri]$env:DATABASE_URL
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$File = Join-Path $BackupDir "careerpilot-$Stamp.sql.gz"

# pg_dump needs individual args; parse them from the URL.
$Scheme = $Uri.Scheme.ToLower()
if ($Scheme -ne "postgres" -and $Scheme -ne "postgresql") { throw "DATABASE_URL must use postgres://" }

$Db = $Uri.AbsolutePath.TrimStart("/").Split("?")[0]
$HostName = $Uri.Host
$Port = if ($Uri.IsDefaultPort) { 5432 } else { $Uri.Port }
$UserInfo = if ($Uri.UserInfo) { $Uri.UserInfo.Split(":")[0] } else { "" }

Write-Host "Backing up database '$Db' on $HostName`:$Port to $File"
pg_dump -h $HostName -p $Port -U $UserInfo -d $Db --no-owner --no-privileges | & gzip > $File

Write-Host "Done. Clean up old backups with:"
Write-Host "  Get-ChildItem $BackupDir -Filter 'careerpilot-*.sql.gz' | Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item"
