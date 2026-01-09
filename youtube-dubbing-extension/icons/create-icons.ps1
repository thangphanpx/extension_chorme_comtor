# Create icon PNG files
Add-Type -AssemblyName System.Drawing

$sizes = @(16, 48, 128)

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Background gradient
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)), 
        (New-Object System.Drawing.Point($size, $size)),
        [System.Drawing.Color]::FromArgb(102, 126, 234),
        [System.Drawing.Color]::FromArgb(118, 75, 162)
    )
    $graphics.FillRectangle($brush, 0, 0, $size, $size)
    
    # Globe outline
    $penWidth = [Math]::Max(1, $size / 16)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penWidth)
    $radius = $size * 0.3
    $center = $size / 2
    $graphics.DrawEllipse($pen, ($center - $radius), ($center - $radius), ($radius * 2), ($radius * 2))
    
    # Cross lines for globe
    $graphics.DrawLine($pen, ($center - $radius), $center, ($center + $radius), $center)
    $graphics.DrawLine($pen, $center, ($center - $radius), $center, ($center + $radius))
    
    # Cleanup
    $graphics.Dispose()
    $brush.Dispose()
    $pen.Dispose()
    
    # Save
    $filename = "icon$size.png"
    $bitmap.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    
    Write-Host "Created $filename"
}