# ArcOS Share Discovery helper
# Windows PowerShell 5.1 compatible. Do not use pwsh-only syntax.
#
# Listens on 127.0.0.1:8790 only and answers the small JSON API that the
# ArcOS app talks to. Nothing here is elevated, installed, or persistent.

$ErrorActionPreference = "Stop"

$script:AgentVersion = "1.2.0"
$script:ListenPort = 8790

# Origins that are always trusted. The list is deliberately small; everything
# else goes through Test-OriginAllowed, which covers any *.arcweb.nl host and
# any loopback dev server.
$script:AllowedOrigins = @(
	"https://os.arcweb.nl",
	"https://beta.arcweb.nl",
	"https://arcweb.nl"
)

# The generated .cmd carries the origin the app was actually served from, so a
# self-hosted or renamed ArcOS deployment works without editing this file. It
# is still one explicit origin, never a wildcard.
if ($env:ARCSD_ORIGIN) {
	$script:AllowedOrigins += $env:ARCSD_ORIGIN.Trim().TrimEnd("/")
}

# Returns $true when the Origin header may talk to this helper. Called for every
# request, so it must be cheap and must never throw.
function Test-OriginAllowed {
	param([string]$Origin)

	if (-not $Origin) { return $true }

	$value = $Origin.Trim().TrimEnd("/")
	if ($script:AllowedOrigins -contains $value) { return $true }

	$uri = $null
	if (-not [System.Uri]::TryCreate($value, [System.UriKind]::Absolute, [ref]$uri)) { return $false }

	$hostName = $uri.Host.ToLowerInvariant()

	# Any official ArcOS deployment: os.arcweb.nl, beta.arcweb.nl, ...
	if ($uri.Scheme -eq "https") {
		if ($hostName -eq "arcweb.nl" -or $hostName.EndsWith(".arcweb.nl")) { return $true }
	}

	# Local development, any port (v7cli dev, a local static server, ...).
	if ($hostName -eq "localhost" -or $hostName -eq "127.0.0.1" -or $hostName -eq "::1") { return $true }

	return $false
}

# ------------------------------------------------------------------- output

function Write-AgentLog {
	param([string]$Message)
	$stamp = (Get-Date).ToString("HH:mm:ss")
	Write-Host ("[{0}] {1}" -f $stamp, $Message) -ForegroundColor DarkGray
}

function Get-ReasonPhrase {
	param([int]$Status)
	switch ($Status) {
		200 { return "OK" }
		204 { return "No Content" }
		400 { return "Bad Request" }
		403 { return "Forbidden" }
		404 { return "Not Found" }
		405 { return "Method Not Allowed" }
		500 { return "Internal Server Error" }
		501 { return "Not Implemented" }
	}
	return "OK"
}

# -------------------------------------------------------------------- HTTP

function Write-HttpResponse {
	param(
		$Stream,
		[int]$Status,
		[string]$Origin,
		[bool]$PrivateNetwork,
		[bool]$Preflight,
		$Payload
	)

	$body = $null
	if ($null -ne $Payload) {
		$json = $Payload | ConvertTo-Json -Depth 8 -Compress
		$body = [Text.Encoding]::UTF8.GetBytes($json)
	}

	$lines = New-Object System.Collections.Generic.List[string]
	$lines.Add(("HTTP/1.1 {0} {1}" -f $Status, (Get-ReasonPhrase -Status $Status)))
	$lines.Add("Connection: close")
	$lines.Add("Cache-Control: no-store")
	$lines.Add("X-Content-Type-Options: nosniff")

	if ($Origin) {
		$lines.Add("Access-Control-Allow-Origin: $Origin")
		$lines.Add("Vary: Origin")
	}
	if ($PrivateNetwork) {
		$lines.Add("Access-Control-Allow-Private-Network: true")
	}
	if ($Preflight) {
		$lines.Add("Access-Control-Allow-Methods: GET, POST, OPTIONS")
		$lines.Add("Access-Control-Allow-Headers: Content-Type")
		$lines.Add("Access-Control-Max-Age: 600")
	}
	if ($null -ne $body) {
		$lines.Add("Content-Type: application/json; charset=utf-8")
		$lines.Add(("Content-Length: {0}" -f $body.Length))
	}

	$head = [Text.Encoding]::ASCII.GetBytes((($lines -join "`r`n") + "`r`n`r`n"))
	$Stream.Write($head, 0, $head.Length)
	if ($null -ne $body -and $body.Length -gt 0) {
		$Stream.Write($body, 0, $body.Length)
	}
	$Stream.Flush()
}

function Read-HttpRequest {
	param($Stream)

	$buffer = New-Object byte[] 8192
	$memory = New-Object System.IO.MemoryStream
	$headerEnd = -1

	while ($true) {
		$read = $Stream.Read($buffer, 0, $buffer.Length)
		if ($read -le 0) { break }
		$memory.Write($buffer, 0, $read)

		$data = $memory.ToArray()
		for ($i = 3; $i -lt $data.Length; $i++) {
			if ($data[$i - 3] -eq 13 -and $data[$i - 2] -eq 10 -and $data[$i - 1] -eq 13 -and $data[$i] -eq 10) {
				$headerEnd = $i - 3
				break
			}
		}
		if ($headerEnd -ge 0) { break }
		if ($data.Length -gt 131072) { break }
	}

	if ($headerEnd -lt 0) { return $null }

	$data = $memory.ToArray()
	$headerText = [Text.Encoding]::ASCII.GetString($data, 0, $headerEnd)
	$lines = $headerText -split "`r`n"
	if ($lines.Length -lt 1) { return $null }

	$requestLine = $lines[0] -split " "
	if ($requestLine.Length -lt 2) { return $null }

	$headers = @{}
	for ($i = 1; $i -lt $lines.Length; $i++) {
		$index = $lines[$i].IndexOf(":")
		if ($index -gt 0) {
			$name = $lines[$i].Substring(0, $index).Trim().ToLowerInvariant()
			$value = $lines[$i].Substring($index + 1).Trim()
			$headers[$name] = $value
		}
	}

	$bodyLength = 0
	if ($headers.ContainsKey("content-length")) {
		$null = [int]::TryParse($headers["content-length"], [ref]$bodyLength)
	}
	if ($bodyLength -lt 0 -or $bodyLength -gt 1048576) { $bodyLength = 0 }

	$bodyBytes = New-Object byte[] $bodyLength
	$already = $data.Length - ($headerEnd + 4)
	$offset = 0
	if ($already -gt 0) {
		$copy = [Math]::Min($already, $bodyLength)
		[Array]::Copy($data, $headerEnd + 4, $bodyBytes, 0, $copy)
		$offset = $copy
	}
	while ($offset -lt $bodyLength) {
		$read = $Stream.Read($bodyBytes, $offset, $bodyLength - $offset)
		if ($read -le 0) { break }
		$offset += $read
	}

	$bodyText = ""
	if ($bodyLength -gt 0 -and $offset -gt 0) {
		$bodyText = [Text.Encoding]::UTF8.GetString($bodyBytes, 0, $offset)
	}

	$path = $requestLine[1]
	$queryIndex = $path.IndexOf("?")
	if ($queryIndex -ge 0) { $path = $path.Substring(0, $queryIndex) }

	return @{
		Method  = $requestLine[0].ToUpperInvariant()
		Path    = $path
		Headers = $headers
		Body    = $bodyText
	}
}

function Get-JsonValue {
	param($Object, [string]$Name, $Default)
	if ($null -eq $Object) { return $Default }
	$property = $Object.PSObject.Properties[$Name]
	if ($null -eq $property) { return $Default }
	if ($null -eq $property.Value) { return $Default }
	return $property.Value
}

# ----------------------------------------------------------------- network

function Get-NetworkInfo {
	$info = @{
		ip           = $null
		cidr         = $null
		gateway      = $null
		prefix       = $null
		prefixLength = 24
	}

	try {
		$route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
			Sort-Object -Property RouteMetric |
			Select-Object -First 1
		if ($null -ne $route) {
			$address = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue |
				Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -notlike "127.*" } |
				Select-Object -First 1
			if ($null -ne $address) {
				$info.ip = $address.IPAddress
				$info.prefixLength = [int]$address.PrefixLength
				if ($route.NextHop -and $route.NextHop -ne "0.0.0.0") { $info.gateway = $route.NextHop }
			}
		}
	} catch {
		# fall through to the DNS-based probe
	}

	if (-not $info.ip) {
		try {
			$addresses = [System.Net.Dns]::GetHostAddresses($env:COMPUTERNAME)
			foreach ($address in $addresses) {
				$text = $address.ToString()
				if ($address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and $text -notlike "127.*" -and $text -notlike "169.254.*") {
					$info.ip = $text
					break
				}
			}
		} catch {
			# leave ip unset
		}
	}

	if ($info.ip) {
		$parts = $info.ip.Split(".")
		if ($parts.Length -eq 4) {
			$info.prefix = $parts[0] + "." + $parts[1] + "." + $parts[2]
			$info.cidr = $info.ip + "/" + $info.prefixLength
		}
	}

	return $info
}

function Test-TcpPort {
	param([string]$IP, [int]$Port, [int]$TimeoutMs)
	$client = New-Object System.Net.Sockets.TcpClient
	try {
		$async = $client.BeginConnect($IP, $Port, $null, $null)
		if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs)) { return $false }
		$client.EndConnect($async)
		return $true
	} catch {
		return $false
	} finally {
		try { $client.Close() } catch { }
	}
}

function Resolve-HostName {
	param([string]$IP)
	try {
		$entry = [System.Net.Dns]::GetHostEntry($IP)
		if ($entry -and $entry.HostName) {
			$name = $entry.HostName
			$dot = $name.IndexOf(".")
			if ($dot -gt 0) { return $name.Substring(0, $dot) }
			return $name
		}
	} catch {
		# no reverse record
	}
	return $null
}

function Resolve-IPv4 {
	param([string]$HostName)

	# Manual entries are allowed to be hostnames ("nas01", "nas01.local"), and
	# Browse sends whatever the user typed. Everything after this point works on
	# a literal IPv4: the port probe, DCOM and `net use` all need one, and a
	# half-resolved name fails deep inside a 6-second timeout instead of here.
	if (-not $HostName) { return $null }

	$name = $HostName.Trim()
	$name = $name -replace "^\\\\", ""
	$name = ($name -split "[\\/]")[0]
	if (-not $name) { return $null }

	$parsed = $null
	if ([System.Net.IPAddress]::TryParse($name, [ref]$parsed)) {
		if ($parsed.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork) { return $parsed.ToString() }
		return $null
	}

	try {
		$addresses = [System.Net.Dns]::GetHostAddresses($name)
		foreach ($address in $addresses) {
			if ($address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork) {
				return $address.ToString()
			}
		}
	} catch {
		# DNS refused; a flat LAN name may still be in the NetBIOS cache, which
		# GetHostAddresses does not consult. Ping asks the machine directly.
	}

	try {
		$ping = New-Object System.Net.NetworkInformation.Ping
		$reply = $ping.Send($name, 1200)
		if ($reply -and $reply.Status -eq [System.Net.NetworkInformation.IPStatus]::Success -and $reply.Address) {
			return $reply.Address.ToString()
		}
	} catch {
		# unreachable or ping blocked
	}

	return $null
}

# --------------------------------------------------------------- discovery

function Merge-DiscoveredHost {
	param($Hosts, [string]$IP, [string]$Source, $Hostname, $Workgroup, $Port445, $RttMs)

	# Every technique reports the same IP from a different angle. Merge instead
	# of overwriting: a name learned by NetBIOS must not be wiped by WS-Discovery
	# answering without one, and the source badges are a set, not a list.
	if (-not $IP) { return }

	if (-not $Hosts.ContainsKey($IP)) {
		$Hosts[$IP] = @{
			ip        = $IP
			hostname  = $Hostname
			workgroup = $Workgroup
			sources   = @($Source)
			port445   = $Port445
			rttMs     = $RttMs
		}
		return
	}

	$entry = $Hosts[$IP]
	if ($Source -and ($entry.sources -notcontains $Source)) {
		$entry.sources = @($entry.sources) + $Source
	}
	if ($Hostname -and -not $entry.hostname) { $entry.hostname = $Hostname }
	if ($Workgroup -and -not $entry.workgroup) { $entry.workgroup = $Workgroup }
	if ($null -ne $Port445) {
		$entry.port445 = $Port445
		if ($null -ne $RttMs) { $entry.rttMs = $RttMs }
	}
	$Hosts[$IP] = $entry
}

function Invoke-WsDiscovery {
	param([int]$TimeoutMs)

	$found = @{}
	$template = @'
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery">
  <soap:Header>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
    <wsa:MessageID>urn:uuid:__ID__</wsa:MessageID>
  </soap:Header>
  <soap:Body>
    <wsd:Probe/>
  </soap:Body>
</soap:Envelope>
'@

	$udp = $null
	try {
		$udp = New-Object System.Net.Sockets.UdpClient
		$udp.Client.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::Socket, [System.Net.Sockets.SocketOptionName]::ReuseAddress, $true)
		$udp.Client.Bind((New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)))
		$udp.Client.ReceiveTimeout = 500

		$probe = $template.Replace("__ID__", [guid]::NewGuid().ToString())
		$bytes = [Text.Encoding]::UTF8.GetBytes($probe)
		$endpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Parse("239.255.255.250"), 3702)
		$null = $udp.Send($bytes, $bytes.Length, $endpoint)

		$deadline = (Get-Date).AddMilliseconds($TimeoutMs)
		$remote = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
		while ((Get-Date) -lt $deadline) {
			try {
				$null = $udp.Receive([ref]$remote)
				# ProbeMatch XAddrs are often hostnames ("http://nas:5357/..."),
				# not IPs, so trust the address the reply came from instead of
				# scraping a URL out of the body.
				$ip = $remote.Address.ToString()
				if ($ip -and $ip -notlike "127.*") { $found[$ip] = $true }
			} catch {
				# receive timeout, keep listening until the deadline
			}
		}
	} catch {
		# multicast unavailable; treat as no results
	} finally {
		if ($null -ne $udp) { try { $udp.Close() } catch { } }
	}

	return $found
}

function Skip-DnsName {
	param([byte[]]$Data, [int]$Offset)

	# A name is either a sequence of length-prefixed labels ending in 0, or a
	# two-byte compression pointer. Never follow the pointer: we only need to
	# know where the next record starts.
	while ($Offset -lt $Data.Length) {
		$length = [int]$Data[$Offset]
		if ($length -eq 0) { return $Offset + 1 }
		if (($length -band 0xC0) -eq 0xC0) { return $Offset + 2 }
		if ($Offset + $length -ge $Data.Length) { return $Data.Length }
		$Offset += $length + 1
	}

	return $Data.Length
}

# ------------------------------------------------------------------- mDNS

function New-MdnsQuery {
	# One PTR question for _smb._tcp.local. The QCLASS high bit (0x8000) asks
	# for a unicast reply: responders that honour it answer to the ephemeral
	# port that sent the query, which is the only port this helper can read.
	# Multicast replies go to 5353, owned by somebody else on Windows.
	$bytes = New-Object System.Collections.ArrayList
	$header = @(0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
	foreach ($b in $header) { $null = $bytes.Add([byte]$b) }

	foreach ($label in @("_smb", "_tcp", "local")) {
		$text = [Text.Encoding]::ASCII.GetBytes($label)
		$null = $bytes.Add([byte]$text.Length)
		foreach ($b in $text) { $null = $bytes.Add($b) }
	}
	$null = $bytes.Add([byte]0)     # root label ends the name
	$null = $bytes.Add([byte]0)     # QTYPE PTR
	$null = $bytes.Add([byte]12)
	$null = $bytes.Add([byte]0x80)  # QCLASS IN + unicast-response bit
	$null = $bytes.Add([byte]1)

	return , $bytes.ToArray()
}

function Read-DnsName {
	param([byte[]]$Data, [int]$Offset)

	# Reads one length-prefixed name, following compression pointers. Returns
	# the dot-joined text and where the caller continues: past the pointer, not
	# past the labels it pointed at.
	$labels = New-Object System.Collections.ArrayList
	$cursor = $Offset
	$next = -1
	$jumps = 0

	while ($cursor -ge 0 -and $cursor -lt $Data.Length) {
		$length = [int]$Data[$cursor]

		if ($length -eq 0) {
			if ($next -lt 0) { $next = $cursor + 1 }
			break
		}

		if (($length -band 0xC0) -eq 0xC0) {
			if ($cursor + 1 -ge $Data.Length) { break }
			if ($next -lt 0) { $next = $cursor + 2 }
			$jumps++
			# A crafted packet can point at itself. No real name needs more than
			# a couple of jumps, and this stops the loop dead.
			if ($jumps -gt 8) { break }
			$cursor = (($length -band 0x3F) * 256) + [int]$Data[$cursor + 1]
			continue
		}

		# Length bytes with the top bits set are not labels at all; treat the
		# name as unreadable instead of guessing.
		if ($length -gt 63) { break }
		if ($cursor + 1 + $length -gt $Data.Length) { break }

		$null = $labels.Add([Text.Encoding]::ASCII.GetString($Data, $cursor + 1, $length))
		$cursor += $length + 1
	}

	if ($next -lt 0) { $next = $Data.Length }

	return @{ name = ($labels -join "."); next = $next }
}

function ConvertFrom-MdnsLabel {
	param([string]$Label)

	# DNS-SD escapes non-printable bytes as \DDD in presentation format, and a
	# literal backslash as \\. Undo it: "DiskStation\0321" is "DiskStation 1".
	if (-not $Label) { return "" }

	$builder = New-Object System.Text.StringBuilder
	$index = 0
	while ($index -lt $Label.Length) {
		$char = $Label[$index]
		if ($char -eq [char]92 -and ($index + 1) -lt $Label.Length) {
			$pending = $Label[$index + 1]
			if ($pending -eq [char]92) {
				$null = $builder.Append([char]92)
				$index += 2
				continue
			}
			if ($index + 3 -lt $Label.Length) {
				$digits = $Label.Substring($index + 1, 3)
				$code = 0
				if ([int]::TryParse($digits, [ref]$code) -and $code -ge 0 -and $code -le 255) {
					$null = $builder.Append([char]$code)
					$index += 4
					continue
				}
			}
		}

		# Anything that is not \\, \" + three digits, or a valid code stays as it is.
		$null = $builder.Append($char)
		$index++
	}

	return $builder.ToString()
}

function ConvertFrom-MdnsMessage {
	param([byte[]]$Data, [string]$SenderIp)

	# Pulls the SMB service instances out of a DNS message. Pure: no sockets, no
	# environment, so tests/mdns-harness.ps1 can feed it captured packets.
	if ($null -eq $Data -or $Data.Length -lt 12) { return $null }

	$questionCount = ([int]$Data[4] * 256) + [int]$Data[5]
	$answerCount = ([int]$Data[6] * 256) + [int]$Data[7]
	$authorityCount = ([int]$Data[8] * 256) + [int]$Data[9]
	$additionalCount = ([int]$Data[10] * 256) + [int]$Data[11]

	$offset = 12
	for ($q = 0; $q -lt $questionCount; $q++) {
		$question = Read-DnsName -Data $Data -Offset $offset
		if ($question.next -le $offset) { return $null }
		$offset = $question.next
		if ($offset + 4 -gt $Data.Length) { return $null }
		$offset += 4
	}

	$instances = New-Object System.Collections.ArrayList
	$targets = New-Object System.Collections.ArrayList
	$addresses = New-Object System.Collections.ArrayList

	# A response puts the PTR in the answer section and the SRV/A records in the
	# additional section as often as not, so walk all three.
	$recordCount = $answerCount + $authorityCount + $additionalCount
	for ($r = 0; $r -lt $recordCount; $r++) {
		$record = Read-DnsName -Data $Data -Offset $offset
		if ($record.next -le $offset) { break }
		$offset = $record.next
		if ($offset + 10 -gt $Data.Length) { break }

		$type = ([int]$Data[$offset] * 256) + [int]$Data[$offset + 1]
		$ttl = ([int64]$Data[$offset + 4] -shl 24) -bor ([int64]$Data[$offset + 5] -shl 16) -bor ([int64]$Data[$offset + 6] -shl 8) -bor [int64]$Data[$offset + 7]
		$length = ([int]$Data[$offset + 8] * 256) + [int]$Data[$offset + 9]
		$offset += 10
		if ($offset + $length -gt $Data.Length) { break }

		$next = $offset + $length

		# TTL 0 is a goodbye packet: the service is leaving, not arriving.
		if ($ttl -gt 0) {
			if ($type -eq 12 -and ([string]$record.name).ToLower() -eq "_smb._tcp.local") {
				$target = Read-DnsName -Data $Data -Offset $offset
				if ($target.name) { $null = $instances.Add($target.name) }
			} elseif ($type -eq 33 -and $length -ge 7) {
				$target = Read-DnsName -Data $Data -Offset ($offset + 6)
				if ($target.name) { $null = $targets.Add($target.name) }
			} elseif ($type -eq 1 -and $length -eq 4) {
				$null = $addresses.Add(
					([int]$Data[$offset]).ToString() + "." +
					([int]$Data[$offset + 1]).ToString() + "." +
					([int]$Data[$offset + 2]).ToString() + "." +
					([int]$Data[$offset + 3]).ToString()
				)
			}
		}

		$offset = $next
	}

	if ($instances.Count -eq 0) { return $null }

	$instance = ConvertFrom-MdnsLabel -Label ([string]$instances[0])

	# The SRV target is the machine's own hostname ("nas01.local"); the service
	# instance is free text ("DiskStation on the shelf"), so prefer the former.
	$hostname = ""
	foreach ($target in $targets) {
		$first = ([string]$target).Split(".")[0]
		$first = ConvertFrom-MdnsLabel -Label $first
		if ($first) { $hostname = $first; break }
	}
	if (-not $hostname) {
		$hostname = $instance -replace "\._smb\._tcp\.local$", ""
	}

	return @{
		ip        = $SenderIp
		hostname  = $hostname
		workgroup = $null
		addresses = @($addresses)
	}
}

function Invoke-MdnsScan {
	param([int]$TimeoutMs)

	$found = @{}
	$udp = $null
	try {
		$udp = New-Object System.Net.Sockets.UdpClient
		$udp.Client.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::Socket, [System.Net.Sockets.SocketOptionName]::ReuseAddress, $true)
		$udp.Client.Bind((New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)))
		$udp.Client.ReceiveTimeout = 250

		$query = New-MdnsQuery
		$endpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Parse("224.0.0.251"), 5353)
		$null = $udp.Send($query, $query.Length, $endpoint)

		$deadline = (Get-Date).AddMilliseconds($TimeoutMs)
		$remote = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
		while ((Get-Date) -lt $deadline) {
			try {
				$data = $udp.Receive([ref]$remote)
				$ip = $remote.Address.ToString()
				if ($ip -and $ip -notlike "127.*") {
					$parsed = ConvertFrom-MdnsMessage -Data $data -SenderIp $ip
					if ($null -ne $parsed) { $found[$ip] = $parsed }
				}
			} catch {
				# timeout, keep listening until the deadline
			}
		}
	} catch {
		# multicast unavailable on this adapter; the other techniques still work
	} finally {
		if ($null -ne $udp) { try { $udp.Close() } catch { } }
	}

	return $found
}

function Get-DirectedBroadcast {
	param([string]$IP, [int]$PrefixLength)

	# 255.255.255.255 is dropped by some access points and switches; the
	# subnet-directed broadcast (e.g. 192.168.1.255) usually still works.
	if (-not $IP) { return $null }
	if ($PrefixLength -lt 1 -or $PrefixLength -gt 30) { return $null }

	$parts = $IP.Split(".")
	if ($parts.Length -ne 4) { return $null }

	$value = ([int64]$parts[0] * 16777216) + ([int64]$parts[1] * 65536) + ([int64]$parts[2] * 256) + [int64]$parts[3]
	$hostBits = 32 - $PrefixLength
	$hostMask = ([int64]1 -shl $hostBits) - 1
	$network = $value -band (-bnot $hostMask -band 0xFFFFFFFFL)
	$broadcast = $network -bor $hostMask

	return (
		(($broadcast -shr 24) -band 255).ToString() + "." +
		(($broadcast -shr 16) -band 255).ToString() + "." +
		(($broadcast -shr 8) -band 255).ToString() + "." +
		($broadcast -band 255).ToString()
	)
}

function Invoke-NetBiosScan {
	param([int]$TimeoutMs)

	$found = @{}
	$udp = $null
	try {
		$udp = New-Object System.Net.Sockets.UdpClient
		$udp.EnableBroadcast = $true
		$udp.Client.ReceiveTimeout = 500

		$query = New-Object byte[] 50
		$query[0] = 0x82
		$query[1] = 0x28
		$query[5] = 0x01
		$query[12] = 0x20
		$query[13] = 0x43
		$query[14] = 0x4B
		for ($i = 15; $i -lt 45; $i++) { $query[$i] = 0x41 }
		$query[45] = 0x00
		$query[47] = 0x21
		$query[49] = 0x01

		$endpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Broadcast, 137)
		$null = $udp.Send($query, $query.Length, $endpoint)

		$net = Get-NetworkInfo
		$directed = Get-DirectedBroadcast -IP $net.ip -PrefixLength ([int]$net.prefixLength)
		if ($directed) {
			try {
				$null = $udp.Send($query, $query.Length, (New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Parse($directed), 137)))
			} catch {
				# directed broadcast unavailable on this adapter
			}
		}

		$deadline = (Get-Date).AddMilliseconds($TimeoutMs)
		$remote = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
		while ((Get-Date) -lt $deadline) {
			try {
				$data = $udp.Receive([ref]$remote)
				$parsed = ConvertFrom-Nbstat -Data $data
				if ($null -ne $parsed) {
					$ip = $remote.Address.ToString()
					$found[$ip] = $parsed
				}
			} catch {
				# timeout, keep listening
			}
		}
	} catch {
		# broadcast unavailable
	} finally {
		if ($null -ne $udp) { try { $udp.Close() } catch { } }
	}

	return $found
}

function ConvertFrom-Nbstat {
	param([byte[]]$Data)

	# NBNS header: id(2) flags(2) qdcount(2) ancount(2) nscount(2) arcount(2)
	if ($null -eq $Data -or $Data.Length -lt 12) { return $null }

	$questionCount = ([int]$Data[4] * 256) + [int]$Data[5]
	$answerCount = ([int]$Data[6] * 256) + [int]$Data[7]
	$offset = 12

	# Some servers echo the question, some do not (qdcount = 0). Follow the
	# header instead of assuming, or every reply is thrown away.
	for ($q = 0; $q -lt $questionCount; $q++) {
		$offset = Skip-DnsName -Data $Data -Offset $offset
		if ($offset + 4 -gt $Data.Length) { return $null }
		$offset += 4
	}

	for ($a = 0; $a -lt $answerCount; $a++) {
		$offset = Skip-DnsName -Data $Data -Offset $offset
		# type(2) class(2) ttl(4) rdlength(2)
		if ($offset + 10 -gt $Data.Length) { return $null }
		$type = ([int]$Data[$offset] * 256) + [int]$Data[$offset + 1]
		$length = ([int]$Data[$offset + 8] * 256) + [int]$Data[$offset + 9]
		$offset += 10
		if ($length -lt 1 -or $offset + $length -gt $Data.Length) { return $null }
		if ($type -ne 0x21) { $offset += $length; continue }

		# NBSTAT rdata: one byte of name count, then 18 bytes per name.
		$count = [int]$Data[$offset]
		$cursor = $offset + 1
		$names = @()
		for ($n = 0; $n -lt $count; $n++) {
			if ($cursor + 18 -gt $Data.Length) { break }
			$raw = New-Object byte[] 15
			[Array]::Copy($Data, $cursor, $raw, 0, 15)
			$suffix = [int]$Data[$cursor + 15]
			$flags = ([int]$Data[$cursor + 16] * 256) + [int]$Data[$cursor + 17]
			$cursor += 18

			$name = [Text.Encoding]::ASCII.GetString($raw).TrimEnd([char]0).Trim()
			if (-not $name) { continue }
			$isGroup = (($flags -band 0x8000) -ne 0)
			$names += @{ name = $name; suffix = $suffix; group = $isGroup }
		}

		$offset += $length
		if ($names.Count -eq 0) { continue }

		$hostName = $null
		$workgroup = $null
		foreach ($entry in $names) {
			if ($null -eq $hostName -and -not $entry.group -and $entry.suffix -eq 0) { $hostName = $entry.name }
			if ($null -eq $workgroup -and $entry.group -and $entry.suffix -eq 0) { $workgroup = $entry.name }
		}
		if ($null -eq $hostName) {
			foreach ($entry in $names) {
				if ($entry.suffix -eq 0) { $hostName = $entry.name; break }
			}
		}
		if ($null -eq $hostName) { $hostName = $names[0].name }

		return @{ hostname = $hostName; workgroup = $workgroup }
	}

	return $null
}

function Invoke-Sweep {
	param([int]$ConnectTimeoutMs)

	$results = New-Object System.Collections.ArrayList
	$net = Get-NetworkInfo
	if (-not $net.ip -or -not $net.prefix) { return @() }

	$batchSize = 64
	$index = 1
	while ($index -le 254) {
		$batch = New-Object System.Collections.ArrayList
		for ($n = 0; $n -lt $batchSize -and $index -le 254; $n++) {
			$ip = $net.prefix + "." + $index
			$index++
			if ($ip -eq $net.ip) { continue }
			$client = New-Object System.Net.Sockets.TcpClient
			$watch = [System.Diagnostics.Stopwatch]::StartNew()
			try {
				$async = $client.BeginConnect($ip, 445, $null, $null)
				$null = $batch.Add(@{ Ip = $ip; Client = $client; Async = $async; Watch = $watch })
			} catch {
				try { $client.Close() } catch { }
			}
		}

		Start-Sleep -Milliseconds $ConnectTimeoutMs

		foreach ($item in $batch) {
			$open = $false
			try {
				if ($item.Async.AsyncWaitHandle.WaitOne(0)) {
					$item.Client.EndConnect($item.Async)
					$open = $true
				}
			} catch {
				$open = $false
			}
			$item.Watch.Stop()
			if ($open) {
				$null = $results.Add(@{ Ip = $item.Ip; RttMs = [int]$item.Watch.ElapsedMilliseconds })
			}
			try { $item.Client.Close() } catch { }
		}
	}

	return @($results.ToArray())
}

# ------------------------------------------------------------------ shares

function Convert-ShareType {
	param($Type)
	$value = [int64]$Type
	$base = $value % 16
	switch ($base) {
		0 { return "Disk" }
		1 { return "Print" }
		2 { return "Device" }
		3 { return "IPC" }
	}
	return "Unknown"
}

# Every share path returns this shape, so the routing layer never has to guess
# whether `reason`/`detail` exist.
function New-ShareResult {
	param($Shares, [bool]$Denied, [string]$Reason, [string]$Detail)
	return @{
		shares = @($Shares)
		denied = $Denied
		reason = $Reason
		detail = $Detail
	}
}

# Turns the app's two credential fields into the names Windows actually wants,
# in the order worth trying. The app accepts `user`, `DOMAIN\user` and
# `you@example.com`, and asks for a domain separately, so combining them blindly
# produces nonsense like `WORKGROUP\CONTOSO\alice`. A username that already
# carries a separator always wins over the domain field.
function Get-UserCandidates {
	param([string]$Username, [string]$Domain)

	$list = New-Object System.Collections.ArrayList
	$user = ""
	if ($null -ne $Username) { $user = $Username.Trim() }
	if (-not $user) { return @() }

	$dom = ""
	if ($null -ne $Domain) { $dom = $Domain.Trim().TrimEnd("\") }

	# ".\alice" is Windows shorthand for "the local account on that machine".
	# `net use` understands it; DCOM does not, so drop the prefix.
	if ($user.StartsWith(".\")) { $user = $user.Substring(2) }
	if (-not $user) { return @() }

	# Already qualified: respect exactly what was typed.
	if ($user.IndexOf("\") -ge 0) {
		$null = $list.Add($user)
		return @($list.ToArray())
	}

	if ($user.IndexOf("@") -ge 0) {
		# A bare e-mail address is a Microsoft account. Prefixing the domain
		# field would produce nonsense, and SMB wants the `MicrosoftAccount\`
		# form on the wire even though the sign-in UI is happy with the address.
		$null = $list.Add($user)
		$null = $list.Add("MicrosoftAccount\" + $user)
		return @($list.ToArray())
	}

	if ($dom) { $null = $list.Add($dom + "\" + $user) }
	$null = $list.Add($user)

	return @($list.ToArray())
}

# net.exe exits with 2 for "something went wrong" no matter what actually
# happened; the real Win32 code only appears in the message ("System error 1326
# has occurred."). Prefer the number in the text when there is one, so a wrong
# password is reported as a wrong password and not as a generic failure.
function Get-NetErrorCode {
	param([int]$ExitCode, [string]$Text)
	if ($Text -and ($Text -match "System error (\d+)")) { return [int]$matches[1] }
	return $ExitCode
}

# Maps the exit codes `net use` / `net view` return onto something the app can
# show. The message text is localised, the codes are not.
function Get-NetUseReason {
	param([int]$Code)
	switch ($Code) {
		0 { return "ok" }
		5 { return "access_denied" }
		53 { return "unreachable" }
		67 { return "unreachable" }
		86 { return "bad_credentials" }
		1219 { return "session_conflict" }
		1231 { return "unreachable" }
		1272 { return "guest_blocked" }
		1326 { return "bad_credentials" }
		1327 { return "bad_credentials" }
		1331 { return "account_disabled" }
		1907 { return "password_expired" }
		1909 { return "account_locked" }
		2202 { return "bad_credentials" }
		6118 { return "unreachable" }
	}
	return "failed"
}

# Collapses net.exe output into one short line for the app and the console log.
# Drops the boilerplate net.exe always appends, and never contains a password:
# net.exe does not echo the one it was given.
function Get-NetMessage {
	param([string]$Text)

	if (-not $Text) { return "" }
	$lines = @($Text -split "\r?\n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
	$kept = @($lines | Where-Object {
		($_ -notmatch "^More help is available") -and
		($_ -notmatch "^Type NET HELP") -and
		($_ -notmatch "^The command completed successfully")
	})
	$message = ($kept -join " ").Trim()
	if ($message.Length -gt 300) { $message = $message.Substring(0, 300) + "..." }
	return $message
}

# Quotes one argument the way CommandLineToArgvW parses it: wrap in double
# quotes, double any backslashes that precede a quote, and escape embedded
# quotes. Needed because net.exe is started through ProcessStartInfo, not
# through PowerShell's own argument marshalling.
function Quote-NetArgument {
	param([string]$Value)

	$builder = New-Object System.Text.StringBuilder
	$null = $builder.Append('"')
	$slashes = 0
	foreach ($char in $Value.ToCharArray()) {
		if ($char -eq "\") {
			$slashes++
			continue
		}
		if ($char -eq '"') {
			$null = $builder.Append("\" * (($slashes * 2) + 1))
			$null = $builder.Append('"')
			$slashes = 0
			continue
		}
		if ($slashes -gt 0) { $null = $builder.Append("\" * $slashes) }
		$slashes = 0
		$null = $builder.Append($char)
	}
	if ($slashes -gt 0) { $null = $builder.Append("\" * ($slashes * 2)) }
	$null = $builder.Append('"')
	return $builder.ToString()
}

# Runs net.exe with stdin closed and a hard timeout.
#
# Both matter. `net use` prompts on the console when the password it was given
# is empty (a blank password is refused for network logon anyway), and on an
# expired account it can ask whether to change the password. This helper answers
# one request at a time, so a prompt does not slow it down - it wedges it until
# somebody types into its console window. Closed stdin turns that into an
# immediate "system error 1326". The timeout covers `net view` hanging on a host
# that answers the TCP connect and then goes quiet.
function Invoke-NetCommand {
	param([string[]]$Arguments, [int]$TimeoutMs = 45000)

	$psi = New-Object System.Diagnostics.ProcessStartInfo
	$psi.FileName = Join-Path $env:SystemRoot "System32\net.exe"
	$psi.Arguments = (@($Arguments) | ForEach-Object { Quote-NetArgument -Value ([string]$_) }) -join " "
	$psi.UseShellExecute = $false
	$psi.RedirectStandardInput = $true
	$psi.RedirectStandardOutput = $true
	$psi.RedirectStandardError = $true
	$psi.CreateNoWindow = $true

	$process = $null
	try {
		$process = [System.Diagnostics.Process]::Start($psi)
		$process.StandardInput.Close()
		$stdoutTask = $process.StandardOutput.ReadToEndAsync()
		$stderrTask = $process.StandardError.ReadToEndAsync()
		if (-not $process.WaitForExit($TimeoutMs)) {
			try { $process.Kill() } catch { }
			$seconds = [int]($TimeoutMs / 1000)
			return @{ code = -1; text = "net.exe did not answer within " + $seconds + "s" }
		}
		$process.WaitForExit()
		$text = (([string]$stdoutTask.Result) + " " + ([string]$stderrTask.Result)).Trim()
		return @{ code = $process.ExitCode; text = $text }
	} finally {
		if ($null -ne $process) { $process.Dispose() }
	}
}

function Get-SharesViaCim {
	param([string]$IP, $Credential)

	# Get-CimInstance -ComputerName defaults to WS-Management, and WinRM is
	# stopped *and disabled* on a stock Windows install, so that call fails with
	# "The client cannot connect to the destination" for every host. Win32_Share
	# is a WMI class, so use DCOM explicitly - the transport Get-WmiObject used,
	# and the only one that works out of the box.
	$option = New-CimSessionOption -Protocol Dcom
	$session = $null
	try {
		if ($null -ne $Credential) {
			$session = New-CimSession -ComputerName $IP -SessionOption $option -Credential $Credential -OperationTimeoutSec 30 -ErrorAction Stop
		} else {
			$session = New-CimSession -ComputerName $IP -SessionOption $option -OperationTimeoutSec 30 -ErrorAction Stop
		}
		$shares = Get-CimInstance -ClassName Win32_Share -CimSession $session -ErrorAction Stop
	} finally {
		if ($null -ne $session) {
			Remove-CimSession -CimSession $session -ErrorAction SilentlyContinue
		}
	}

	$list = New-Object System.Collections.ArrayList
	foreach ($share in $shares) {
		$name = [string]$share.Name
		if (-not $name) { continue }
		$value = [int64]$share.Type
		$admin = ($name.EndsWith("$")) -or ($value -ge 2147483648)
		$null = $list.Add(@{
			name    = $name
			type    = Convert-ShareType -Type $value
			comment = [string]$share.Description
			admin   = $admin
		})
	}

	return New-ShareResult -Shares $list.ToArray() -Denied $false -Reason "ok" -Detail ""
}

# Parses the aligned table that `net view \\host /all` prints. Kept separate so
# it can be checked against captured output without touching the network.
#
#   Share name  Type  Used as  Comment
#   --------------------------------------------------------------
#   ADMIN$      Disk           Remote Admin
#   C$          Disk           Default share
#
# The empty "Used as" column collapses, so split on runs of two or more spaces
# and treat the second field as the type. Only rows whose second field is a
# known share type are data rows; that filters out the title, the header and the
# rule line without depending on language for anything but the type words.
function ConvertFrom-NetViewOutput {
	param([string[]]$Lines)

	$list = New-Object System.Collections.ArrayList
	$knownTypes = @("Disk", "IPC", "Print", "Device")

	foreach ($line in @($Lines)) {
		$text = ([string]$line).Trim()
		if (-not $text) { continue }

		$parts = $text -split "\s{2,}"
		if ($parts.Length -lt 2) { continue }

		$type = $parts[1].Trim()
		if ($knownTypes -notcontains $type) { continue }

		# Some Samba/NetApp builds print the full UNC path in the name column.
		$name = $parts[0].Trim()
		if ($name.StartsWith("\\")) {
			$cut = $name.LastIndexOf("\")
			if ($cut -ge 0) { $name = $name.Substring($cut + 1) }
		}
		if (-not $name) { continue }

		$comment = ""
		if ($parts.Length -ge 4) { $comment = $parts[3].Trim() }
		elseif ($parts.Length -eq 3) { $comment = $parts[2].Trim() }

		$null = $list.Add(@{
			name    = $name
			type    = $type
			comment = $comment
			admin   = $name.EndsWith("$")
		})
	}

	return @($list.ToArray())
}

function Get-SharesViaNetView {
	param([string]$IP, [string]$Username, [string]$Password, [string]$Domain)

	$unc = "\\" + $IP + "\ipc$"
	$connected = $false
	$candidates = @(Get-UserCandidates -Username $Username -Domain $Domain)
	$credentialed = ($candidates.Count -gt 0) -and [bool]$Password
	$lastUser = ""
	$last = @{ code = 0; text = "" }

	try {
		# A username with no password is not worth a `net use`: Windows refuses
		# network logon with a blank password, and net.exe would sit at its
		# password prompt instead of failing.
		if ($credentialed) {
			foreach ($userSpec in $candidates) {
				$null = Invoke-NetCommand -Arguments @("use", $unc, "/delete", "/y") -TimeoutMs 15000
				$last = Invoke-NetCommand -Arguments @("use", $unc, ("/user:" + $userSpec), $Password)
				$lastUser = $userSpec
				if ($last.code -eq 0) {
					$connected = $true
					break
				}
				# 1219: this PC already has a connection to that host under a
				# different name. Clearing the ipc$ session usually fixes it.
				if ($last.code -eq 1219) {
					$null = Invoke-NetCommand -Arguments @("use", $unc, "/delete", "/y") -TimeoutMs 15000
				}
			}
		}

		if ($credentialed -and -not $connected) {
			$code = Get-NetErrorCode -ExitCode $last.code -Text $last.text
			$detail = "Signing in to " + $unc + " as " + $lastUser + " failed (exit " + $last.code + ")."
			$message = Get-NetMessage -Text $last.text
			if ($message) { $detail = $detail + " " + $message }
			if ($code -eq 1219) {
				$detail = $detail + " This PC already holds a connection to " + $IP + " under another name; clear it with: net use " + ("\\" + $IP) + " /delete"
			}
			return New-ShareResult -Shares @() -Denied $true -Reason (Get-NetUseReason -Code $code) -Detail $detail
		}

		$view = Invoke-NetCommand -Arguments @("view", ("\\" + $IP), "/all")
		if ($view.code -ne 0) {
			$code = Get-NetErrorCode -ExitCode $view.code -Text $view.text
			$detail = "net view " + ("\\" + $IP) + " failed (exit " + $view.code + ")."
			$message = Get-NetMessage -Text $view.text
			if ($message) { $detail = $detail + " " + $message }
			if ($candidates.Count -gt 0 -and -not $credentialed) {
				$detail = $detail + " A username was entered without a password, so only the anonymous attempt ran."
			}
			$reason = Get-NetUseReason -Code $code
			if (-not $credentialed -and ($reason -eq "failed" -or $reason -eq "access_denied")) { $reason = "anonymous" }
			return New-ShareResult -Shares @() -Denied $true -Reason $reason -Detail $detail
		}

		$shares = @(ConvertFrom-NetViewOutput -Lines @($view.text -split "\r?\n"))
		if ($shares.Count -eq 0) {
			# Not a failure: the host answered and simply publishes nothing the
			# account can see. The app has a pane for exactly this.
			return New-ShareResult -Shares @() -Denied $false -Reason "empty" -Detail "The host answered and listed no shares for this account."
		}
		return New-ShareResult -Shares $shares -Denied $false -Reason "ok" -Detail ""
	} catch {
		return New-ShareResult -Shares @() -Denied $true -Reason "failed" -Detail $_.Exception.Message
	} finally {
		if ($connected) { $null = Invoke-NetCommand -Arguments @("use", $unc, "/delete", "/y") -TimeoutMs 15000 }
	}
}

function Invoke-ShareEnumeration {
	param([string]$IP, [string]$Username, [string]$Password, [string]$Domain)

	$candidates = @(Get-UserCandidates -Username $Username -Domain $Domain)
	$credential = $null
	$rpcError = ""

	if ($candidates.Count -gt 0) {
		try {
			$secure = ConvertTo-SecureString -String $Password -AsPlainText -Force
			$credential = New-Object System.Management.Automation.PSCredential($candidates[0], $secure)
		} catch {
			$rpcError = "Could not build a credential: " + $_.Exception.Message
			$credential = $null
		}
	}

	# 1. Win32_Share over DCOM: structured, includes real share types and the
	#    description. With no username this still runs as the current user, which
	#    is exactly what an anonymous attempt should mean.
	#
	#    Only worth trying when RPC endpoint mapping (135) is open. A NAS never
	#    listens there, and the doomed DCOM connect costs seconds before the 445
	#    pass - the one that actually answers - even starts.
	if (Test-TcpPort -IP $IP -Port 135 -TimeoutMs 700) {
		try {
			return Get-SharesViaCim -IP $IP -Credential $credential
		} catch {
			$rpcError = $_.Exception.Message
			Write-AgentLog ("RPC share enumeration failed for " + $IP + ": " + (Get-NetMessage -Text $rpcError))
			Write-AgentLog "Falling back to net view over TCP/445."
		}
	} else {
		$rpcError = "Port 135 is closed, so DCOM was not attempted."
		Write-AgentLog ("No RPC endpoint mapper on " + $IP + "; using net view over TCP/445.")
	}

	# 2. SRVSVC over TCP/445. Survives networks that block RPC's dynamic ports,
	#    and is the path a NAS usually answers on.
	$result = Get-SharesViaNetView -IP $IP -Username $Username -Password $Password -Domain $Domain
	if ($result.denied) {
		Write-AgentLog ("Share enumeration refused by " + $IP + " (" + $result.reason + "): " + $result.detail)
		# Carry the RPC failure along. It is usually the more useful clue when
		# 445 never got as far as an answer of its own.
		if ($rpcError) {
			$result.detail = ([string]$result.detail + " RPC: " + (Get-NetMessage -Text $rpcError)).Trim()
		}
	}
	return $result
}

# ----------------------------------------------------------------- routing

function Invoke-ApiRequest {
	param($Request)

	$path = $Request.Path
	$method = $Request.Method

	if ($method -eq "GET" -and $path -eq "/health") {
		return @{
			Status  = 200
			Payload = @{
				ok        = $true
				version   = $script:AgentVersion
				platform  = "windows"
				psVersion = $PSVersionTable.PSVersion.ToString()
				hostname  = $env:COMPUTERNAME
			}
		}
	}

	if ($method -eq "GET" -and $path -eq "/subnet") {
		$net = Get-NetworkInfo
		return @{
			Status  = 200
			Payload = @{ ip = $net.ip; cidr = $net.cidr; gateway = $net.gateway }
		}
	}

	if ($method -eq "POST" -and $path -eq "/scan") {
		$body = $null
		if ($Request.Body) {
			try { $body = $Request.Body | ConvertFrom-Json } catch { $body = $null }
		}

		$mode = [string](Get-JsonValue -Object $body -Name "mode" -Default "passive")
		$timeoutMs = [int](Get-JsonValue -Object $body -Name "timeoutMs" -Default 6000)
		Write-AgentLog ("Scan requested: mode=" + $mode + " timeout=" + $timeoutMs + "ms")
		if ($timeoutMs -lt 1000) { $timeoutMs = 1000 }
		if ($timeoutMs -gt 120000) { $timeoutMs = 120000 }

		$hosts = @{}

		if ($mode -eq "sweep") {
			Write-AgentLog "Sweep: probing TCP/445 on the local subnet..."
			$swept = Invoke-Sweep -ConnectTimeoutMs 300
			foreach ($item in $swept) {
				$hosts[$item.Ip] = @{
					ip        = $item.Ip
					hostname  = $null
					workgroup = $null
					sources   = @("sweep")
					port445   = $true
					rttMs     = $item.RttMs
				}
			}
			Write-AgentLog ("Sweep: " + $hosts.Count + " host(s) with 445 open.")
		} else {
			Write-AgentLog "Passive scan: mDNS (_smb._tcp.local)..."
			# LAN responders answer in well under a second; a long window only
			# makes the scan feel broken. NetBIOS and the sweep are the backstops.
			$mdns = Invoke-MdnsScan -TimeoutMs 1200
			foreach ($ip in $mdns.Keys) {
				$entry = $mdns[$ip]
				Merge-DiscoveredHost -Hosts $hosts -IP $ip -Source "mdns" -Hostname $entry.hostname
			}
			Write-AgentLog ("mDNS: " + $mdns.Count + " host(s) answered.")

			Write-AgentLog "Passive scan: WS-Discovery..."
			$wsdTimeout = [Math]::Min($timeoutMs, 3000)
			$wsd = Invoke-WsDiscovery -TimeoutMs $wsdTimeout
			foreach ($ip in $wsd.Keys) {
				Merge-DiscoveredHost -Hosts $hosts -IP $ip -Source "wsd"
			}
			Write-AgentLog ("WS-Discovery: " + $wsd.Count + " host(s) answered.")

			Write-AgentLog "Passive scan: NetBIOS..."
			$netbios = Invoke-NetBiosScan -TimeoutMs 1500
			foreach ($ip in $netbios.Keys) {
				$entry = $netbios[$ip]
				Merge-DiscoveredHost -Hosts $hosts -IP $ip -Source "netbios" -Hostname $entry.hostname -Workgroup $entry.workgroup
			}
			Write-AgentLog ("Passive scan: " + $hosts.Count + " host(s) answered.")
		}

		foreach ($ip in @($hosts.Keys)) {
			$entry = $hosts[$ip]
			if (-not $entry.hostname) {
				$name = Resolve-HostName -IP $ip
				if ($name) { $entry.hostname = $name }
			}
			if ($null -eq $entry.port445) {
				$watch = [System.Diagnostics.Stopwatch]::StartNew()
				$open = Test-TcpPort -IP $ip -Port 445 -TimeoutMs 500
				$watch.Stop()
				$entry.port445 = $open
				$entry.rttMs = [int]$watch.ElapsedMilliseconds
			}
			$hosts[$ip] = $entry
		}

		return @{
			Status  = 200
			Payload = @{ hosts = @($hosts.Values) }
		}
	}

	if ($method -eq "POST" -and $path -match "^/hosts/([^/]+)/shares$") {
		$requested = $matches[1]
		$ip = Resolve-IPv4 -HostName $requested
		if (-not $ip) {
			# The app shows `detail` verbatim, so say which name failed and why
			# that matters, rather than "invalid IP" for a perfectly valid host.
			return @{
				Status  = 400
				Payload = @{
					error  = "unreachable"
					detail = "Could not turn '" + $requested + "' into an IPv4 address. Save the host's IP address if its name does not resolve from this PC."
				}
			}
		}
		if ($ip -ne $requested) { Write-AgentLog ("Resolved " + $requested + " to " + $ip + ".") }

		$body = $null
		if ($Request.Body) {
			try { $body = $Request.Body | ConvertFrom-Json } catch { $body = $null }
		}

		$username = [string](Get-JsonValue -Object $body -Name "username" -Default "")
		$password = [string](Get-JsonValue -Object $body -Name "password" -Default "")
		$domain = [string](Get-JsonValue -Object $body -Name "domain" -Default "")

		$credNote = "none"
		if ($username) {
			$primary = @(Get-UserCandidates -Username $username -Domain $domain)
			if ($primary.Count -gt 0) { $credNote = "as " + $primary[0] } else { $credNote = "supplied, but empty once trimmed" }
		}
		Write-AgentLog ("Enumerating shares on " + $ip + " (credentials " + $credNote + ")...")
		try {
			$result = Invoke-ShareEnumeration -IP $ip -Username $username -Password $password -Domain $domain
			return @{
				Status  = 200
				Payload = @{
					shares = @($result.shares)
					denied = [bool]$result.denied
					reason = [string]$result.reason
					detail = [string]$result.detail
				}
			}
		} catch {
			return @{
				Status  = 500
				Payload = @{ error = "enumeration_failed"; detail = $_.Exception.Message }
			}
		}
	}

	return @{
		Status  = 404
		Payload = @{ error = "not_found"; detail = "No such endpoint: " + $method + " " + $path }
	}
}

# -------------------------------------------------------------------- main

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $script:ListenPort)
try {
	$listener.Server.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::Socket, [System.Net.Sockets.SocketOptionName]::ReuseAddress, $true)
	$listener.Start(16)
} catch {
	Write-Host ""
	Write-Host "Could not start the helper on 127.0.0.1:$($script:ListenPort)." -ForegroundColor Red
	Write-Host "It may already be running in another window." -ForegroundColor Yellow
	Write-Host ""
	Write-Host "Press any key to close."
	$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
	exit 1
}

$net = Get-NetworkInfo
Write-Host ""
Write-Host "  ArcOS Share Discovery helper v$($script:AgentVersion)" -ForegroundColor Cyan
Write-Host "  Listening on http://127.0.0.1:$($script:ListenPort) (loopback only)" -ForegroundColor DarkGray
if ($net.ip) {
	Write-Host "  Local address: $($net.ip)  (sweep range $($net.prefix).0/24)" -ForegroundColor DarkGray
}
Write-Host "  Leave this window open while you use the app. Ctrl+C stops it." -ForegroundColor DarkGray
Write-Host ""

try {
	while ($true) {
		$client = $listener.AcceptTcpClient()
		$stream = $null
		$origin = $null
		$privateNetwork = $false
		$preflight = $false

		try {
			$stream = $client.GetStream()
			$stream.ReadTimeout = 10000
			$stream.WriteTimeout = 10000

			$request = Read-HttpRequest -Stream $stream
			if ($null -eq $request) { continue }

			$origin = $request.Headers["origin"]
			if ($request.Headers.ContainsKey("access-control-request-private-network")) {
				if ($request.Headers["access-control-request-private-network"] -eq "true") { $privateNetwork = $true }
			}

			if (-not (Test-OriginAllowed $origin)) {
				Write-AgentLog ("Rejected request from origin " + $origin)
				Write-HttpResponse -Stream $stream -Status 403 -Origin $null -PrivateNetwork $false -Preflight $false -Payload @{
					error  = "origin_not_allowed"
					detail = "This origin is not allowed to talk to the helper."
				}
				continue
			}

			if ($request.Method -eq "OPTIONS") {
				$preflight = $true
				Write-HttpResponse -Stream $stream -Status 204 -Origin $origin -PrivateNetwork $privateNetwork -Preflight $true -Payload $null
				continue
			}

			$response = Invoke-ApiRequest -Request $request
			Write-HttpResponse -Stream $stream -Status $response.Status -Origin $origin -PrivateNetwork $privateNetwork -Preflight $false -Payload $response.Payload
		} catch {
			try {
				Write-HttpResponse -Stream $stream -Status 500 -Origin $origin -PrivateNetwork $privateNetwork -Preflight $false -Payload @{
					error  = "internal_error"
					detail = $_.Exception.Message
				}
			} catch {
				# the client is already gone
			}
		} finally {
			if ($null -ne $stream) { try { $stream.Close() } catch { } }
			try { $client.Close() } catch { }
		}
	}
} finally {
	try { $listener.Stop() } catch { }
	Write-Host ""
	Write-Host "Helper stopped." -ForegroundColor DarkGray
}
