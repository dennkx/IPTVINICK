param(
  [int]$Port = 4173
)

$taskName = "iNickIPTVLocalServer"
schtasks.exe /End /TN $taskName 2>$null | Out-Null

$connections = netstat -ano | Select-String ":$Port\s+.*LISTENING"

if (-not $connections) {
  Write-Host "Nenhum servidor escutando na porta $Port."
  exit 0
}

$pids = @()
foreach ($connection in $connections) {
  $parts = ($connection.Line -split "\s+") | Where-Object { $_ }
  $pids += [int]$parts[-1]
}

$pids | Sort-Object -Unique | ForEach-Object {
  Write-Host "Parando processo $_ na porta $Port..."
  Stop-Process -Id $_ -Force
}
