$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$launcher = Get-Command py -ErrorAction SilentlyContinue
if (-not $launcher) { $launcher = Get-Command python -ErrorAction SilentlyContinue }
if (-not $launcher) {
  Write-Host 'Python was not found. Install Python and retry.' -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}

# Always select a currently-free port. A fixed port could silently reopen an older
# test-kit server that was left running from a previous build.
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

$exe = $launcher.Source
$args = @('-m', 'http.server', "$port", '--bind', '0.0.0.0')
$server = Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $root -PassThru -WindowStyle Hidden

try {
  Start-Sleep -Milliseconds 700
  if ($server.HasExited) {
    throw "Local test server failed to start on port $port."
  }

  $cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $desktopUrl = "http://127.0.0.1:$port/?mockAds=1&build=$cacheBust"
  Start-Process $desktopUrl

  Write-Host ''
  Write-Host 'MUTANTS TEST SERVER IS RUNNING' -ForegroundColor Green
  Write-Host "Fresh build port: $port"
  Write-Host "Desktop: $desktopUrl"

  try {
    $localIp = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.PrefixOrigin -ne 'WellKnown'
      } |
      Sort-Object -Property InterfaceMetric |
      Select-Object -First 1 -ExpandProperty IPAddress
    if ($localIp) {
      $phoneUrl = "http://${localIp}:$port/?mockAds=1&build=$cacheBust"
      Write-Host "Phone on the same Wi-Fi: $phoneUrl"
      Write-Host 'Windows Firewall may ask once for permission to allow Python on private networks.'
    }
  } catch {
    # Desktop testing still works if local IP discovery is unavailable.
  }

  Write-Host ''
  Write-Host 'This launcher uses a new free port every run, so an older test server cannot be opened accidentally.'
  Write-Host 'mockAds=1 simulates successful rewarded ads locally. Production does not grant fake rewards.'
  Read-Host 'Press Enter when you are done testing'
}
finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
}
