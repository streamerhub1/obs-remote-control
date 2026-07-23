Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Start-Sleep -Milliseconds 3000
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
$bitmap.Save('C:\Users\almaz\.gemini\antigravity\brain\1003cb63-e439-4e54-9602-615fdbab4365\screenshot_streamerhub.png')
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Screenshot saved"
