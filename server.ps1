# SmartRail Local PowerShell Web Server
param(
    [int]$Port = 8080
)

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host " SmartRail MVP Web Server Running" -ForegroundColor Cyan
    Write-Host " Access the app at: $prefix" -ForegroundColor Yellow
    Write-Host " Press Ctrl+C to stop the server." -ForegroundColor Gray
    Write-Host "==================================================" -ForegroundColor Green

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = $request.Url.LocalPath
        if ($rawUrl -eq "/") {
            $rawUrl = "/index.html"
        }

        $localPath = Join-Path $PSScriptRoot $rawUrl.TrimStart('/')

        if (Test-Path $localPath -PathType Leaf) {
            $contentBytes = [System.IO.File]::ReadAllBytes($localPath)
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()

            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                default { $response.ContentType = "application/octet-stream" }
            }

            $response.ContentLength64 = $contentBytes.Length
            $response.OutputStream.Write($contentBytes, 0, $contentBytes.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            $buf = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
            $response.ContentLength64 = $buf.Length
            $response.OutputStream.Write($buf, 0, $buf.Length)
        }

        $response.OutputStream.Close()
    }
} catch {
    Write-Host "Server stopped or error occurred: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
