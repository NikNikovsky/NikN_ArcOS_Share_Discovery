# Offline check for the helper's mDNS (_smb._tcp.local) parser.
#
# No socket, no browser, no multicast: it lifts the DNS/mDNS block out of
# src/agent/agent.ps1 and feeds ConvertFrom-MdnsMessage packets built byte by
# byte, the way a NAS or an avahi box would answer. The wire format is the most
# bug-prone code in the project, so it is tested against fixtures instead of
# against whatever happens to be on the network.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tests\mdns-harness.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$agentPath = Join-Path $root "src\agent\agent.ps1"
$text = [System.IO.File]::ReadAllText($agentPath)

$startMarker = "# --------------------------------------------------------------- discovery"
$endMarker = "# ------------------------------------------------------------------ shares"
$start = $text.IndexOf($startMarker)
if ($start -lt 0) { $start = $text.IndexOf("function Merge-DiscoveredHost") }
$end = $text.IndexOf($endMarker)
if ($start -lt 0 -or $end -lt 0 -or $end -le $start) {
	Write-Host "FAIL could not locate the discovery block in agent.ps1"
	exit 2
}

$block = $text.Substring($start, $end - $start)
Invoke-Expression $block

$failures = 0

function Assert {
	param([string]$Label, [bool]$Condition, [string]$Detail = "")

	if ($Condition) {
		Write-Host ("ok   " + $Label)
	} else {
		$extra = ""
		if ($Detail) { $extra = " :: " + $Detail }
		Write-Host ("FAIL " + $Label + $extra)
		$script:failures++
	}
}

# --------------------------------------------------------------- packet builders

function Merge-Bytes {
	param([object[]]$Parts)

	$list = New-Object System.Collections.ArrayList
	foreach ($part in $Parts) {
		if ($null -eq $part) { continue }
		foreach ($b in $part) { $null = $list.Add([byte]$b) }
	}
	return , $list.ToArray()
}

function New-DnsHeader {
	param(
		[int]$Questions = 0,
		[int]$Answers = 0,
		[int]$Authorities = 0,
		[int]$Additionals = 0,
		[int]$Flags = 0x8400
	)

	return [byte[]]@(
		0, 0,
		($Flags -shr 8), ($Flags -band 0xFF),
		($Questions -shr 8), ($Questions -band 0xFF),
		($Answers -shr 8), ($Answers -band 0xFF),
		($Authorities -shr 8), ($Authorities -band 0xFF),
		($Additionals -shr 8), ($Additionals -band 0xFF)
	)
}

function New-DnsNameBytes {
	param([string]$Name)

	$list = New-Object System.Collections.ArrayList
	foreach ($label in $Name.Split(".")) {
		if (-not $label) { continue }
		$raw = [Text.Encoding]::ASCII.GetBytes($label)
		$null = $list.Add([byte]$raw.Length)
		foreach ($b in $raw) { $null = $list.Add($b) }
	}
	$null = $list.Add([byte]0)
	return , $list.ToArray()
}

function New-DnsPointer {
	param([int]$Offset)
	return [byte[]]@((0xC0 -bor (($Offset -shr 8) -band 0x3F)), ($Offset -band 0xFF))
}

function New-DnsRecord {
	param(
		[byte[]]$Name,
		[int]$Type,
		[byte[]]$RData,
		[int]$Ttl = 120,
		[int]$Class = 1
	)

	$length = $RData.Length
	return Merge-Bytes @(
		$Name,
		[byte[]]@(($Type -shr 8), ($Type -band 0xFF), ($Class -shr 8), ($Class -band 0xFF)),
		[byte[]]@(
			(($Ttl -shr 24) -band 0xFF), (($Ttl -shr 16) -band 0xFF),
			(($Ttl -shr 8) -band 0xFF), ($Ttl -band 0xFF)
		),
		[byte[]]@(($length -shr 8), ($length -band 0xFF)),
		$RData
	)
}

function New-PtrRecord {
	param([string]$Owner, [string]$Target, [int]$Ttl = 120, [byte[]]$OwnerBytes = $null)

	if ($null -eq $OwnerBytes) { $OwnerBytes = New-DnsNameBytes $Owner }
	return New-DnsRecord -Name $OwnerBytes -Type 12 -Ttl $Ttl -RData (New-DnsNameBytes $Target)
}

function New-SrvRecord {
	param([string]$Owner, [string]$Target, [int]$Port = 445, [byte[]]$OwnerBytes = $null)

	if ($null -eq $OwnerBytes) { $OwnerBytes = New-DnsNameBytes $Owner }
	$rdata = Merge-Bytes @(
		[byte[]]@(0, 0, 0, 0),
		[byte[]]@((($Port -shr 8) -band 0xFF), ($Port -band 0xFF)),
		(New-DnsNameBytes $Target)
	)
	return New-DnsRecord -Name $OwnerBytes -Type 33 -RData $rdata
}

function New-ARecord {
	param([string]$Owner, [string]$Address, [int]$Ttl = 120, [byte[]]$OwnerBytes = $null)

	if ($null -eq $OwnerBytes) { $OwnerBytes = New-DnsNameBytes $Owner }
	$parts = $Address.Split(".")
	$rdata = [byte[]]@([byte]$parts[0], [byte]$parts[1], [byte]$parts[2], [byte]$parts[3])
	return New-DnsRecord -Name $OwnerBytes -Type 1 -Ttl $Ttl -RData $rdata
}

# ------------------------------------------------------------------- fixtures

# A NAS answer the way Synology/avahi send it after a unicast PTR query:
# PTR in the answer section, SRV and A in the additional section, no questions
# echoed back (QDCOUNT = 0).
$ptr = New-PtrRecord -Owner "_smb._tcp.local" -Target "NAS01._smb._tcp.local"
$srv = New-SrvRecord -Owner "NAS01._smb._tcp.local" -Target "nas01.local"
$a = New-ARecord -Owner "nas01.local" -Address "192.168.1.20"
$packet = Merge-Bytes @(
	(New-DnsHeader -Answers 1 -Additionals 2),
	$ptr, $srv, $a
)

$mdnsHost = ConvertFrom-MdnsMessage -Data $packet -SenderIp "192.168.1.20"
Assert "an SMB PTR answer is recognised" ($null -ne $mdnsHost)
Assert "the SRV target supplies the hostname" ($mdnsHost.hostname -eq "nas01") ("got '" + $mdnsHost.hostname + "'")
Assert "the sender address is the host IP" ($mdnsHost.ip -eq "192.168.1.20")
Assert "the A record is parsed too" ($mdnsHost.addresses -contains "192.168.1.20") ($mdnsHost.addresses -join ",")

# Some builds omit SRV/A and only name the service instance. The instance name
# is then the best available hostname, and it must have the service suffix cut.
$bare = Merge-Bytes @((New-DnsHeader -Answers 1), (New-PtrRecord -Owner "_smb._tcp.local" -Target "DISKSTATION._smb._tcp.local"))
$bareHost = ConvertFrom-MdnsMessage -Data $bare -SenderIp "192.168.1.30"
Assert "a bare PTR answer still names the host" ($bareHost -and $bareHost.hostname -eq "DISKSTATION") ("got '" + $bareHost.hostname + "'")

# Windows and some Samba builds echo the question; the parser must walk it
# instead of reading the question as an answer.
$question = Merge-Bytes @((New-DnsNameBytes "_smb._tcp.local"), [byte[]]@(0, 12, 0, 1))
$withQuestion = Merge-Bytes @(
	(New-DnsHeader -Questions 1 -Answers 1),
	$question,
	(New-PtrRecord -Owner "" -Target "WINBOX._smb._tcp.local" -OwnerBytes (New-DnsPointer 12))
)
$withQuestionHost = ConvertFrom-MdnsMessage -Data $withQuestion -SenderIp "192.168.1.40"
Assert "an echoed question is skipped" ($withQuestionHost -and $withQuestionHost.hostname -eq "WINBOX") ("got '" + $withQuestionHost.hostname + "'")
Assert "a compressed owner name is followed" ($withQuestionHost -and $withQuestionHost.ip -eq "192.168.1.40")

# Compression inside the rdata: the SRV target points back at the instance name.
$instanceBytes = New-DnsNameBytes "NAS01._smb._tcp.local"
$offsetOfInstance = 12 + (New-DnsHeader -Answers 1 -Additionals 1).Length + (New-PtrRecord -Owner "_smb._tcp.local" -Target "NAS01._smb._tcp.local").Length
$compressedSrv = New-DnsRecord -Name (New-DnsPointer $offsetOfInstance) -Type 33 -RData (Merge-Bytes @(
	[byte[]]@(0, 0, 0, 0, 1, 0xBD),
	(New-DnsPointer $offsetOfInstance)
))
$compressed = Merge-Bytes @(
	(New-DnsHeader -Answers 1 -Additionals 1),
	(New-PtrRecord -Owner "_smb._tcp.local" -Target "NAS01._smb._tcp.local"),
	$compressedSrv
)
$compressedHost = ConvertFrom-MdnsMessage -Data $compressed -SenderIp "192.168.1.50"
Assert "a compressed SRV target is followed" ($compressedHost -and $compressedHost.hostname -eq "NAS01") ("got '" + $(if ($compressedHost) { $compressedHost.hostname } else { "null" }) + "'")

# Another service (printers advertise _ipp._tcp) must not be reported as SMB.
$other = Merge-Bytes @((New-DnsHeader -Answers 1), (New-PtrRecord -Owner "_ipp._tcp.local" -Target "Printer._ipp._tcp.local"))
Assert "a non-SMB service is ignored" ($null -eq (ConvertFrom-MdnsMessage -Data $other -SenderIp "192.168.1.60"))

# TTL 0 is a goodbye packet, not an announcement.
$goodbye = Merge-Bytes @((New-DnsHeader -Answers 1), (New-PtrRecord -Owner "_smb._tcp.local" -Target "NAS01._smb._tcp.local" -Ttl 0))
Assert "a goodbye (TTL 0) is ignored" ($null -eq (ConvertFrom-MdnsMessage -Data $goodbye -SenderIp "192.168.1.70"))

# Truncated and malformed packets must return null rather than throw: they come
# off the network, so their shape is not guaranteed. Cut the PTR rdata in half.
$truncated = Merge-Bytes @((New-DnsHeader -Answers 1), $ptr[0..28])
$threw = $false
$truncatedResult = $null
try { $truncatedResult = ConvertFrom-MdnsMessage -Data $truncated -SenderIp "192.168.1.80" } catch { $threw = $true }
Assert "a truncated packet does not throw" (-not $threw)
Assert "a truncated packet yields nothing" ($null -eq $truncatedResult)

$tiny = [byte[]]@(0, 1, 2)
Assert "a packet shorter than a header yields nothing" ($null -eq (ConvertFrom-MdnsMessage -Data $tiny -SenderIp "192.168.1.90"))
Assert "an empty packet yields nothing" ($null -eq (ConvertFrom-MdnsMessage -Data ([byte[]]@()) -SenderIp ""))
Assert "a null packet yields nothing" ($null -eq (ConvertFrom-MdnsMessage -Data $null -SenderIp "192.168.1.91"))

# A pointer that points at itself must not spin forever.
$loop = [byte[]]@(0xC0, 0x00, 0x00, 0x00)
$loopName = Read-DnsName -Data $loop -Offset 0
Assert "a self-referential pointer is bounded" ($loopName.next -eq 2) ("next " + $loopName.next)

# ------------------------------------------------ names, escaping, query bytes

Assert "a plain instance name is unchanged" ((ConvertFrom-MdnsLabel -Label "NAS01") -eq "NAS01")
Assert "an escaped space is decoded" ((ConvertFrom-MdnsLabel -Label "DiskStation\0321") -eq "DiskStation 1") ("got '" + (ConvertFrom-MdnsLabel -Label "DiskStation\0321") + "'")
Assert "an escaped backslash is decoded" ((ConvertFrom-MdnsLabel -Label "a\\b") -eq "a\b")
Assert "an incomplete escape is left alone" ((ConvertFrom-MdnsLabel -Label "\03") -eq "\03")
Assert "an out-of-range escape is left alone" ((ConvertFrom-MdnsLabel -Label "\999") -eq "\999")
Assert "an empty label stays empty" ((ConvertFrom-MdnsLabel -Label "") -eq "")

$query = New-MdnsQuery
Assert "the query is a single PTR question" ($query.Length -eq 33) ("length " + $query.Length)
Assert "the query asks for one question" (($query[4] -eq 0) -and ($query[5] -eq 1))
Assert "the query carries no answers" (($query[6] -eq 0) -and ($query[7] -eq 0))
Assert "the query name is _smb._tcp.local" ($query[12] -eq 4 -and $query[13] -eq 0x5F -and $query[17] -eq 4)
Assert "the query type is PTR" (($query[29] -eq 0) -and ($query[30] -eq 12))
Assert "the query asks for a unicast reply" (($query[31] -eq 0x80) -and ($query[32] -eq 1)) ("class " + $query[31] + "," + $query[32])

# ------------------------------------------------------------- host merging

$hosts = @{}
Merge-DiscoveredHost -Hosts $hosts -IP "192.168.1.20" -Source "mdns" -Hostname "nas01"
Merge-DiscoveredHost -Hosts $hosts -IP "192.168.1.20" -Source "wsd"
Merge-DiscoveredHost -Hosts $hosts -IP "192.168.1.20" -Source "netbios" -Hostname "NAS01-OLD" -Workgroup "WORKGROUP"
Merge-DiscoveredHost -Hosts $hosts -IP "192.168.1.20" -Source "mdns"
Assert "a host is stored once" ($hosts.Count -eq 1)
Assert "sources are merged as a set" ((@($hosts["192.168.1.20"].sources) -join ",") -eq "mdns,wsd,netbios") (@($hosts["192.168.1.20"].sources) -join ",")
Assert "a known hostname is not overwritten" ($hosts["192.168.1.20"].hostname -eq "nas01") ("got '" + $hosts["192.168.1.20"].hostname + "'")
Assert "a workgroup is still learned" ($hosts["192.168.1.20"].workgroup -eq "WORKGROUP")

Merge-DiscoveredHost -Hosts $hosts -IP "192.168.1.21" -Source "netbios" -Hostname "OLDNAME" -Workgroup "HOME"
$hosts["192.168.1.21"].port445 = $true
$hosts["192.168.1.21"].rttMs = 3
Merge-DiscoveredHost -Hosts $hosts -IP "192.168.1.21" -Source "sweep" -Port445 $true -RttMs 12
Assert "a newly measured RTT replaces the old one" ($hosts["192.168.1.21"].rttMs -eq 12)
Assert "an answer with no name keeps the one already known" ($hosts["192.168.1.21"].hostname -eq "OLDNAME")
Merge-DiscoveredHost -Hosts $hosts -IP "192.168.1.21" -Source "sweep" -Port445 $false -RttMs 400
Assert "a closed 445 is recorded, not ignored" ($hosts["192.168.1.21"].port445 -eq $false)

# --------------------------------------------------- wiring inside agent.ps1

Assert "the passive scan runs mDNS" ($text -match 'Invoke-MdnsScan -TimeoutMs')
Assert "mDNS results are tagged as a source" ($text -match '-Source "mdns"')
Assert "the sweep still does not depend on mDNS" ($text -match 'Invoke-Sweep -ConnectTimeoutMs')

$agentVersion = ([regex]::Match($text, '\$script:AgentVersion\s*=\s*"([^"]+)"')).Groups[1].Value
$processJs = [System.IO.File]::ReadAllText((Join-Path $root "src\process.js"))
$appVersion = ([regex]::Match($processJs, 'AGENT_VERSION = "([^"]+)"')).Groups[1].Value
Assert "the app and helper agree on the helper version" ($agentVersion -and $agentVersion -eq $appVersion) ("helper '" + $agentVersion + "' vs app '" + $appVersion + "'")

Write-Host ""
if ($failures -gt 0) {
	Write-Host ("FAILED: " + $failures + " check(s)")
	exit 1
}
Write-Host "All mDNS checks passed."
exit 0
