$port = 8080

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Host "Started raw TCP server on port $port"

while ($true) {
    if (!$listener.Pending()) {
        Start-Sleep -Milliseconds 50
        continue
    }
    
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    
    $buffer = New-Object byte[] 8192
    
    try {
        if ($stream.DataAvailable) {
            $read = $stream.Read($buffer, 0, $buffer.Length)
            $requestText = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
            
            $reqLine = ($requestText -split "`r`n")[0]
            if ($reqLine -match "^GET\s+([^\s]+)\s+HTTP") {
                $path = $matches[1]
                $path = $path.Split('?')[0]
                if ($path -eq "/" -or $path -eq "") {
                    $path = "/index.html"
                }
                
                $localPath = "c:\Users\AIPC\.antigravity\antigravity workspace" + $path.Replace('/', '\')
                Write-Host "Serving: $localPath"
                
                if (Test-Path $localPath -PathType Leaf) {
                    $content = [System.IO.File]::ReadAllBytes($localPath)
                    
                    $type = "text/html"
                    if ($localPath.EndsWith(".css")) { $type = "text/css" }
                    elseif ($localPath.EndsWith(".js")) { $type = "application/javascript" }
                    elseif ($localPath.EndsWith(".png") -or $localPath.EndsWith(".jpg") -or $localPath.EndsWith(".jpeg")) { $type = "image/png" }
                    elseif ($localPath.EndsWith(".ico")) { $type = "image/x-icon" }
                    
                    # Essential headers for proxy passing
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $type`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($content.Length)`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($content, 0, $content.Length)
                    $stream.Flush()
                } else {
                    $header = "HTTP/1.1 404 Not Found`r`nConnection: close`r`nContent-Length: 9`r`n`r`nNot Found"
                    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Flush()
                }
            }
        }
    } catch {
        Write-Host "Request error: $_"
    } finally {
        $client.Close()
    }
}
