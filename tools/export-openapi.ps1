param(
    [Parameter(Mandatory = $false)]
    [string]$BaseUrl = "http://127.0.0.1:5000",
    [Parameter(Mandatory = $false)]
    [string]$OutputPath = "docs/api/openapi/v2.json"
)

$uri = "$($BaseUrl.TrimEnd('/'))/swagger/v2/swagger.json"
$response = Invoke-WebRequest -Uri $uri -UseBasicParsing
if ($response.StatusCode -ne 200) {
    throw "OpenAPI endpoint returned HTTP $($response.StatusCode)."
}

$document = $response.Content | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($document.openapi)) {
    throw "Response is not an OpenAPI document."
}
if ($document.info.version -ne "2.0.0") {
    throw "Expected OpenAPI info.version 2.0.0, got '$($document.info.version)'."
}
if (-not ($document.paths.PSObject.Properties.Name -match '^/api/')) {
    throw "OpenAPI document does not contain an /api path."
}

$resolvedOutput = Join-Path (Get-Location) $OutputPath
$parent = Split-Path -Parent $resolvedOutput
New-Item -ItemType Directory -Force -Path $parent | Out-Null
$response.Content | Set-Content -LiteralPath $resolvedOutput -Encoding utf8NoBOM
Write-Output "Exported $uri to $OutputPath"
