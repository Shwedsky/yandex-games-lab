$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765

$launcher = Get-Command py -ErrorAction SilentlyContinue
if (-not $launcher) { $launcher = Get-Command python -ErrorAction SilentlyContinue }
if (-not $launcher) {
  Write-Host 'Python was not found. Install Python or run: python -m http.server 8765' -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}

$exe = $launcher.Source
$args = @('-m', 'http.server', "$port", '--bind', '0.0.0.0')
$server = Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $root -PassThru -WindowStyle Hidden

try {
  Start-Sleep -Milliseconds 900
  $desktopUrl = "http://127.0.0.1:$port/?mockAds=1"
  Start-Process $desktopUrl

  Write-Host ''
  Write-Host 'MUTANTS TEST SERVER IS RUNNING' -ForegroundColor Green
  Write-Host "Desktop: $desktopUrl"

  try {
    $localIp = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
      Select-Object -First 1 -ExpandProperty IPAddress
    if ($localIp) {
      Write-Host "Phone on the same Wi-Fi: http://${localIp}:$port/?mockAds=1"
      Write-Host 'Windows Firewall may ask once for permission to allow Python on private networks.'
    }
  } catch {
    # Desktop testing still works if local IP discovery is unavailable.
  }

  Write-Host ''
  Write-Host 'mockAds=1 simulates successful rewarded ads locally. Production does not grant fake rewards.'
  Read-Host 'Press Enter when you are done testing'
}
finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
}
