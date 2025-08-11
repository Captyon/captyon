<#
windows.ps1 - Setup and run helper for Windows
Usage:
  .\windows.ps1 -Action setup    # install deps and create .env files
  .\windows.ps1 -Action run      # run the dev server (npm run dev)
  .\windows.ps1 -Action both     # do setup then run

Drop this file in the project as scripts/windows.ps1 and run from PowerShell:
  cd <project-root>\scripts
  .\windows.ps1 -Action setup

This script:
 - Verifies Node and npm are available
 - Runs `npm install` in the project root
 - Runs `npm install` in the server/ folder
 - Copies .env.example -> .env (if .env doesn't exist) for project root and server
 - Optionally runs `npm run dev`
#>

param(
  [Parameter(Mandatory = $false)]
  [ValidateSet("setup","run","both")]
  [string]$Action = "setup"
)

function Write-Info {
  param([string]$Message)
  Write-Host "[INFO]  $Message" -ForegroundColor Cyan
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[WARN]  $Message" -ForegroundColor Yellow
}

function Write-Err {
  param([string]$Message)
  Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Command {
  param([string]$cmd)
  return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

# Determine project root (one level up from this script)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..") | Select-Object -ExpandProperty Path

Write-Info "Project root detected: $ProjectRoot"
Push-Location $ProjectRoot

try {
  if ($Action -eq "setup" -or $Action -eq "both") {
    Write-Info "Starting setup..."

    if (-not (Test-Command "node")) {
      Write-Err "Node.js not found in PATH. Please install Node.js (>=18 recommended) and re-run this script."
      exit 1
    } else {
      $nodeVersion = & node --version
      Write-Info "Node found: $nodeVersion"
    }

    if (-not (Test-Command "npm")) {
      Write-Err "npm not found in PATH. Please install npm (comes with Node.js) and re-run this script."
      exit 1
    } else {
      $npmVersion = & npm --version
      Write-Info "npm found: $npmVersion"
    }

    # Install root dependencies
    Write-Info "Installing root dependencies (this may take a few minutes)..."
    & npm install
    if ($LASTEXITCODE -ne 0) {
      Write-Err "npm install in project root failed (exit code $LASTEXITCODE). Inspect output above."
      exit $LASTEXITCODE
    }
    Write-Info "Root dependencies installed."

    # Install server dependencies if server folder exists
    if (Test-Path ".\server") {
      Push-Location ".\server"
      Write-Info "Installing server dependencies..."
      & npm install
      if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install in server/ failed (exit code $LASTEXITCODE). Inspect output above."
        Pop-Location
        exit $LASTEXITCODE
      }
      Write-Info "Server dependencies installed."
      Pop-Location
    } else {
      Write-Warn "No server/ directory found; skipping server dependency install."
    }

    # Copy .env examples if .env not present
    if ((Test-Path ".\server\.env.example") -and -not (Test-Path ".\server\.env")) {
      Copy-Item -Path ".\server\.env.example" -Destination ".\server\.env"
      Write-Info "Created server/.env from server/.env.example"
    } elseif (Test-Path ".\server\.env") {
      Write-Info "server/.env already exists; not overwriting."
    }

    if ((Test-Path ".\.env.example") -and -not (Test-Path ".\.env")) {
      Copy-Item -Path ".\.env.example" -Destination ".\.env"
      Write-Info "Created .env from .env.example"
    } elseif (Test-Path ".\.env") {
      Write-Info ".env already exists in project root; not overwriting."
    }

    Write-Info "Setup finished successfully."
  }

  if ($Action -eq "run" -or $Action -eq "both") {
    Write-Info "Starting development server(s)..."
    Write-Info "Running: npm run dev (this will stream logs here)."

    # Run npm run dev in the project root. This will run concurrently script (server + client).
    & npm run dev
    $runExit = $LASTEXITCODE
    if ($runExit -ne 0) {
      Write-Err "Development server exited with code $runExit."
      exit $runExit
    }
  }

} catch {
  Write-Err "An unexpected error occurred: $_"
  exit 1
} finally {
  Pop-Location
}
