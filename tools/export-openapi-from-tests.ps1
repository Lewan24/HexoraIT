param(
    [Parameter(Mandatory = $false)]
    [string]$OutputPath = "docs/api/openapi/v2.json"
)

$repoRoot = (Get-Location).Path
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputPath))
$env:HEXORAIT_OPENAPI_OUTPUT = $resolvedOutput

try {
    dotnet test HexoraITApi/HexoraIT.Tests/HexoraIT.Tests.csproj `
        --filter "FullyQualifiedName~OpenApiContractTests" `
        --logger "console;verbosity=minimal"

    if ($LASTEXITCODE -ne 0) {
        throw "OpenAPI contract tests failed with exit code $LASTEXITCODE."
    }
}
finally {
    Remove-Item Env:HEXORAIT_OPENAPI_OUTPUT -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $resolvedOutput)) {
    throw "OpenAPI artifact was not created at '$OutputPath'."
}

Write-Output "Exported test-host OpenAPI document to $OutputPath"
