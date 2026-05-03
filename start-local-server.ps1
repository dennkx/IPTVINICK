param(
  [int]$Port = 4173,
  [string]$Root = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

$rootPath = [System.IO.Path]::GetFullPath($Root)
$listener = [System.Net.Sockets.TcpListener]::new(
  [System.Net.IPAddress]::Parse("127.0.0.1"),
  $Port
)

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".htm" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".xml" = "application/xml; charset=utf-8"
  ".svg" = "image/svg+xml"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif" = "image/gif"
  ".ico" = "image/x-icon"
  ".m3u" = "audio/x-mpegurl; charset=utf-8"
  ".m3u8" = "application/vnd.apple.mpegurl; charset=utf-8"
  ".md" = "text/plain; charset=utf-8"
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [string]$Status,
    [string]$ContentType,
    [byte[]]$Body
  )

  $headers = @(
    "HTTP/1.1 $Status"
    "Content-Type: $ContentType"
    "Content-Length: $($Body.Length)"
    "Access-Control-Allow-Origin: *"
    "Cache-Control: no-store"
    "Connection: close"
    ""
    ""
  ) -join "`r`n"

  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

function Resolve-RequestPath {
  param([string]$UrlPath)

  $cleanPath = [Uri]::UnescapeDataString(($UrlPath -split "\?")[0]).TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($cleanPath)) {
    $cleanPath = "index.html"
  }

  $candidate = [System.IO.Path]::GetFullPath(
    [System.IO.Path]::Combine($rootPath, $cleanPath)
  )

  if (-not $candidate.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Forbidden"
  }

  return $candidate
}

$listener.Start(50)
Write-Host "Servidor local em http://127.0.0.1:$Port/"
Write-Host "Raiz: $rootPath"
Write-Host "Pressione Ctrl+C para parar."

while ($true) {
  $client = $listener.AcceptTcpClient()
  $stream = $client.GetStream()

  try {
    $buffer = New-Object byte[] 16384
    $read = $stream.Read($buffer, 0, $buffer.Length)
    $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)

    if ($request -notmatch "^(GET|HEAD)\s+([^\s]+)") {
      $body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
      Send-Response $stream "405 Method Not Allowed" "text/plain; charset=utf-8" $body
      continue
    }

    $method = $matches[1]
    $filePath = Resolve-RequestPath $matches[2]

    if (-not [System.IO.File]::Exists($filePath)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      Send-Response $stream "404 Not Found" "text/plain; charset=utf-8" $body
      continue
    }

    $ext = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $contentType = "application/octet-stream"
    if ($mimeTypes.ContainsKey($ext)) {
      $contentType = $mimeTypes[$ext]
    }

    $bodyBytes = [System.IO.File]::ReadAllBytes($filePath)
    if ($method -eq "HEAD") {
      $bodyBytes = New-Object byte[] 0
    }
    Send-Response $stream "200 OK" $contentType $bodyBytes
  }
  catch {
    $body = [System.Text.Encoding]::UTF8.GetBytes("Server error")
    Send-Response $stream "500 Server Error" "text/plain; charset=utf-8" $body
  }
  finally {
    $stream.Close()
    $client.Close()
  }
}
