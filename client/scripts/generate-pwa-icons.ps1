$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-AppIcon {
  param(
    [int]$Size,
    [string]$Path
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(15, 22, 36))

  $penWidth = [Math]::Max(2, [int]($Size / 50))
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(6, 182, 212), $penWidth)
  $graphics.DrawEllipse($pen, 4, 4, $Size - 8, $Size - 8)

  $fontSize = [Math]::Floor($Size / 3.2)
  $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, 211, 238))
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF 0, 0, $Size, $Size
  $graphics.DrawString('RK', $font, $brush, $rect, $format)

  $graphics.Dispose()
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

$publicDir = Join-Path $PSScriptRoot '..\public' | Resolve-Path
New-AppIcon -Size 192 -Path (Join-Path $publicDir 'icon-192x192.png')
New-AppIcon -Size 512 -Path (Join-Path $publicDir 'icon-512x512.png')
New-AppIcon -Size 512 -Path (Join-Path $publicDir 'maskable-icon-512x512.png')
Copy-Item (Join-Path $publicDir 'icon-192x192.png') (Join-Path $publicDir 'apple-touch-icon.png') -Force
Write-Host "Generated PWA icons in $publicDir"
