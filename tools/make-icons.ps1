# Genera los iconos de GYMDEX a partir de una imagen cuadrada.
# Uso: powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1 -Origen "C:\ruta\imagen.jpg"
param(
  [string]$Origen = "$env:USERPROFILE\Downloads\snorlax.jpg"
)

Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz 'icons'
if (-not (Test-Path $destino)) { New-Item -ItemType Directory $destino | Out-Null }

if (-not (Test-Path $Origen)) { Write-Error "No existe: $Origen"; exit 1 }

$img = [System.Drawing.Image]::FromFile($Origen)
Write-Output "Origen: $Origen ($($img.Width)x$($img.Height))"

# recorte central por si la imagen no fuese cuadrada
$lado = [Math]::Min($img.Width, $img.Height)
$ox = [int](($img.Width - $lado) / 2)
$oy = [int](($img.Height - $lado) / 2)
$recorte = New-Object System.Drawing.Rectangle($ox, $oy, $lado, $lado)

# iOS no admite transparencia en el icono de inicio: fondo opaco
$fondo = [System.Drawing.ColorTranslator]::FromHtml('#0d1220')

$tamanos = [ordered]@{
  'apple-touch-icon.png' = 180
  'icon-192.png'         = 192
  'icon-512.png'         = 512
  'favicon.png'          = 64
}

foreach ($nombre in $tamanos.Keys) {
  $px = $tamanos[$nombre]
  $bmp = New-Object System.Drawing.Bitmap($px, $px)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($fondo)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $px, $px)),
    $recorte, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $ruta = Join-Path $destino $nombre
  $bmp.Save($ruta, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $kb = [Math]::Round((Get-Item $ruta).Length / 1KB, 1)
  Write-Output "  $nombre ${px}x${px} ${kb} KB"
}

$img.Dispose()
Write-Output "Listo -> $destino"
