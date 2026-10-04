param(
  [string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin',
  [ValidateRange(1024,65535)][int]$TestPort = 55433
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$pgData = Join-Path $repoRoot ('tmp\community-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss-ffff'))
$pgLog = Join-Path $pgData 'server.log'
$clusterStarted = $false

function Invoke-TestCommand {
  param([string[]]$Arguments)
  & rtk proxy @Arguments
  if ($LASTEXITCODE -ne 0) { throw ('Test command failed: ' + $Arguments[0]) }
}
function Invoke-TestSql {
  param([string]$File,[string]$Database = 'gema_test_db')
  Invoke-TestCommand -Arguments @((Join-Path $PostgresBin 'psql.exe'),'-h','127.0.0.1','-p',"$TestPort",'-U','gema_test','-d',$Database,'-v','ON_ERROR_STOP=1','-q','-f',(Join-Path $repoRoot $File))
}

Push-Location $repoRoot
try {
  New-Item -ItemType Directory -Path $pgData | Out-Null
  Invoke-TestCommand -Arguments @((Join-Path $PostgresBin 'initdb.exe'),'-D',$pgData,'--username=gema_test','--auth=trust','--encoding=UTF8')
  # Detached hidden console prevents the daemon from keeping RTK's captured stdout open on Windows.
  $startArgs = @('-D',('"'+$pgData+'"'),'-l',('"'+$pgLog+'"'),'-o',('"-h 127.0.0.1 -p '+$TestPort+'"'),'-w','start')
  $starter = Start-Process -FilePath (Join-Path $PostgresBin 'pg_ctl.exe') -ArgumentList $startArgs -WindowStyle Hidden -PassThru
  # Start-Process -Wait waits for the daemon's entire process tree; wait only for pg_ctl itself.
  if (-not $starter.WaitForExit(30000)) { throw 'Local pg_ctl startup timed out' }
  $starter.Refresh()
  if ($starter.ExitCode -ne 0) { throw 'Local test cluster could not start' }
  $clusterStarted = $true
  Invoke-TestCommand -Arguments @((Join-Path $PostgresBin 'createdb.exe'),'-h','127.0.0.1','-p',"$TestPort",'-U','gema_test','gema_test_db')
  Invoke-TestSql 'backend/tests/sql/local_roles.sql' 'postgres'
  foreach ($migration in Get-ChildItem -LiteralPath (Join-Path $repoRoot 'backend/migrations') -Filter '*.sql' | Sort-Object Name) {
    if ($migration.Name.StartsWith('009_')) { Invoke-TestSql 'backend/tests/sql/storage_before_009.sql' }
    if ($migration.Name.StartsWith('010_')) { Invoke-TestSql 'backend/tests/sql/retention_before_010.sql' }
    Invoke-TestSql ('backend/migrations/' + $migration.Name)
    if ($migration.Name.StartsWith('004_')) { Invoke-TestSql 'backend/tests/sql/legacy_before_005.sql' }
    if ($migration.Name.StartsWith('005_')) { Invoke-TestSql 'backend/tests/sql/legacy_after_005.sql' }
    if ($migration.Name.StartsWith('009_')) { Invoke-TestSql 'backend/tests/sql/storage_after_009.sql' }
  }
  Invoke-TestSql 'backend/tests/sql/community_transactions.sql'
  Invoke-TestSql 'backend/tests/sql/closure_retention.sql'
  Invoke-TestCommand -Arguments @((Join-Path $repoRoot 'backend/.venv/Scripts/python.exe'),'backend/tests/sql/postgres_concurrency.py','--psql',(Join-Path $PostgresBin 'psql.exe'),'--database','gema_test_db','--port',"$TestPort")
  Write-Output 'PASS: fresh migrations, legacy, private bucket contract, transactions, and concurrency'
}
finally {
  if ($clusterStarted -or (Test-Path -LiteralPath (Join-Path $pgData 'postmaster.pid'))) { & rtk proxy (Join-Path $PostgresBin 'pg_ctl.exe') -D $pgData -m fast -w stop }
  Pop-Location
  # Leave ignored logs/data for diagnosis. No existing database is deleted or reused.
}
