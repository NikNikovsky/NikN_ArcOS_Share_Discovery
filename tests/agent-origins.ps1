# Offline check for the helper's Origin allowlist.
#
# It does not start the helper (that would bind port 8790); it lifts the
# allowlist block out of src/agent/agent.ps1 and exercises Test-OriginAllowed
# directly, so the rules that decide "may this page talk to the helper" are
# testable without a browser.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tests\agent-origins.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$agentPath = Join-Path $root "src\agent\agent.ps1"
$text = [System.IO.File]::ReadAllText($agentPath)

$startMarker = '$script:AgentVersion'
$endMarker = '# ------------------------------------------------------------------- output'
$start = $text.IndexOf($startMarker)
$end = $text.IndexOf($endMarker)
if ($start -lt 0 -or $end -lt 0 -or $end -le $start) {
	Write-Host "FAIL could not locate the allowlist block in agent.ps1"
	exit 2
}
$block = $text.Substring($start, $end - $start)

$failures = 0

function Assert-Origin {
	param([string]$Origin, [bool]$Expected, [string]$Label)

	$actual = [bool](Test-OriginAllowed $Origin)
	if ($actual -eq $Expected) {
		Write-Host ("ok   " + $Label)
	} else {
		Write-Host ("FAIL " + $Label + " :: got " + $actual + " want " + $Expected)
		$script:failures++
	}
}

# --- without an injected origin ------------------------------------------------
$env:ARCSD_ORIGIN = $null
Invoke-Expression $block

Assert-Origin "https://beta.arcweb.nl" $true "beta.arcweb.nl allowed"
Assert-Origin "https://os.arcweb.nl" $true "os.arcweb.nl allowed"
Assert-Origin "https://arcweb.nl" $true "apex arcweb.nl allowed"
Assert-Origin "https://os.arcweb.nl/" $true "trailing slash tolerated"
Assert-Origin "http://localhost:3128" $true "v7cli dev origin allowed"
Assert-Origin "http://127.0.0.1:5173" $true "loopback with port allowed"
Assert-Origin "http://localhost" $true "loopback without port allowed"
Assert-Origin "" $false "missing Origin header rejected (curl, health probes)"
Assert-Origin "https://arcos.example.com" $false "unknown https origin rejected"
Assert-Origin "https://evil-arcweb.nl" $false "lookalike suffix rejected"
Assert-Origin "https://arcweb.nl.evil.com" $false "arcweb as prefix rejected"
Assert-Origin "https://beta.arcweb.nl.evil.com" $false "nested lookalike rejected"
Assert-Origin "http://beta.arcweb.nl" $false "plain http arcweb rejected"
Assert-Origin "file://" $false "file origin rejected"
Assert-Origin "not a url" $false "garbage rejected"

# --- but a spawned cmd injects the real origin --------------------------------
$env:ARCSD_ORIGIN = "https://arcos.example.com"
Invoke-Expression $block

Assert-Origin "https://arcos.example.com" $true "injected origin accepted"
Assert-Origin "https://os.arcweb.nl" $true "static allowlist still applies"
Assert-Origin "https://evil.example.com" $false "other origins still rejected"

# --- the cmd builder must actually carry it -----------------------------------
$processJs = [System.IO.File]::ReadAllText((Join-Path $root "src\process.js"))
if ($processJs -match 'set "ARCSD_ORIGIN=') {
	Write-Host "ok   generated .cmd carries ARCSD_ORIGIN"
} else {
	Write-Host "FAIL generated .cmd does not carry ARCSD_ORIGIN"
	$failures++
}
if ($processJs -match 'buildAgentCmd\(this\._agentSource, currentOrigin\(\)\)') {
	Write-Host "ok   _generateHelper passes the live origin"
} else {
	Write-Host "FAIL _generateHelper does not pass the live origin"
	$failures++
}

$env:ARCSD_ORIGIN = $null

if ($failures -gt 0) {
	Write-Host ""
	Write-Host ("{0} FAILURE(S)" -f $failures)
	exit 1
}
Write-Host ""
Write-Host "all origin checks passed"
exit 0
