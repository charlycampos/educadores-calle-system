$path = "D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"
$content = Get-Content $path -Raw -Encoding UTF8

$fixes = [ordered]@{
    "Ã¡" = "á"
    "Ã©" = "é"
    "Ã³" = "ó"
    "Ãº" = "ú"
    "Ã­" = "í"
    "Ã-" = "í"
    "Ã±" = "ñ"
    "Ã‘" = "Ñ"
    "Â¿" = "¿"
    "Ãš" = "Ú"
    "Ã“" = "Ó"
    "Ã‰" = "É"
    "Ã " = "Á"
    "Â¡" = "¡"
    "Ã¼" = "ü"
}

foreach ($key in $fixes.Keys) {
    $content = $content.Replace($key, $fixes[$key])
}

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Fixed Mojibake!"
