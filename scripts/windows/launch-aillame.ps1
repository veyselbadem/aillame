$ErrorActionPreference = "Stop"

# Get project root
$scriptPath = $MyInvocation.MyCommand.Path
$scriptsDir = Split-Path -Parent $scriptPath
$projectDir = (Resolve-Path "$scriptsDir\..\..").Path
Set-Location $projectDir

$port = 3000
$url = "http://localhost:$port"

# Check if something is listening on port 3000
$connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($connection) {
    # It's already running, just open the browser
    Start-Process $url
    exit
}

# Not running, start it
# We'll use start for production if .next exists, else dev
$hasBuild = Test-Path "$projectDir\.next\BUILD_ID"

if ($hasBuild) {
    $args = "/c npm.cmd start"
} else {
    $args = "/c npm.cmd run dev"
}

# Start the server as a hidden background process
Start-Process "cmd.exe" -ArgumentList $args -WindowStyle Hidden -WorkingDirectory $projectDir

# Wait for the server to be ready
$maxRetries = 30
$ready = $false

while ($maxRetries -gt 0) {
    Start-Sleep -Seconds 1
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        $ready = $true
        break
    }
    $maxRetries--
}

if ($ready) {
    Start-Process $url
}
