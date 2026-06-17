# MCP & AI Server 테스트 스크립트
# PowerShell에서 실행: .\test_mcp.ps1

$base_ai   = "http://localhost:8000"
$base_mcp  = "http://localhost:8002"
$jwt_token = $env:JWT_TOKEN

function Test-Endpoint {
    param($label, $url, $method = "GET", $body = $null, $requiresAuth = $false)
    Write-Host "`n[$label]" -ForegroundColor Cyan
    Write-Host "  $method $url"

    $headers = @{}
    if ($requiresAuth) {
        if (-not $jwt_token) {
            Write-Host "  SKIP: JWT_TOKEN 환경변수가 필요합니다." -ForegroundColor Yellow
            return
        }
        $headers["Authorization"] = "Bearer $jwt_token"
    }

    try {
        if ($method -eq "POST" -and $body) {
            $res = Invoke-RestMethod -Uri $url -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json" -Headers $headers -TimeoutSec 15
        } else {
            $res = Invoke-RestMethod -Uri $url -Method GET -Headers $headers -TimeoutSec 10
        }
        Write-Host "  OK" -ForegroundColor Green
        Write-Host ($res | ConvertTo-Json -Depth 4)
    } catch {
        Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host " MCP / AI Server 통합 테스트" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
if (-not $jwt_token) {
    Write-Host " JWT_TOKEN이 없어 인증이 필요한 AI API 테스트는 SKIP됩니다." -ForegroundColor Yellow
}

# 1. AI Server health check
Test-Endpoint "AI Server Health" "$base_ai/"

# 2. MCP Server SSE endpoint (GET — 연결 확인만)
Write-Host "`n[MCP Server SSE]" -ForegroundColor Cyan
Write-Host "  GET $base_mcp/sse"
try {
    $req = [System.Net.WebRequest]::Create("$base_mcp/sse")
    $req.Timeout = 3000
    $res = $req.GetResponse()
    Write-Host "  OK - ContentType: $($res.ContentType)" -ForegroundColor Green
    $res.Close()
} catch [System.Net.WebException] {
    if ($_.Exception.Response) {
        Write-Host "  OK (SSE 스트림 시작됨 - 연결 성공)" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
    }
} catch {
    Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. MCP /github/repo 직접 REST 테스트
Test-Endpoint "MCP GitHub Repo (REST)" "$base_ai/mcp/github/repo?url=https://github.com/octocat/Hello-World" "GET" $null $true

# 4. RAG embed (전체 게시글 벡터화)
Test-Endpoint "RAG Embed All Posts" "$base_ai/rag/embed" "POST" @{}

# 5. RAG 자연어 검색
Test-Endpoint "RAG Search" "$base_ai/rag/search" "POST" @{ query = "React로 만든 프로젝트 추천해줘" } $true

# 6. Agent chat (MCP + RAG 통합)
Test-Endpoint "Agent Chat (tool 없이)" "$base_ai/agent/chat" "POST" @{ query = "안녕, 뭘 도와줄 수 있어?" } $true

Test-Endpoint "Agent Chat (RAG 도구 필요)" "$base_ai/agent/chat" "POST" @{ query = "게시판에서 React 관련 프로젝트 찾아줘" } $true

Test-Endpoint "Agent Chat (GitHub 도구 필요)" "$base_ai/agent/chat" "POST" @{ query = "https://github.com/octocat/Hello-World 이 레포 정보 알려줘" } $true

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host " 테스트 완료" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
