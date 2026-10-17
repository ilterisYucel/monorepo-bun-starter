# GD-PMS demo v2/dev: build + up + container register (container-1/bess1, container-2/bess2)
$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot
function EnvVal($file, $key) { (Get-Content $file | Where-Object { $_ -match "^$key=" } | Select-Object -First 1) -replace "^$key=", "" }
$c1 = "deployment/v2/dev/container"; $c2 = "deployment/v2/dev/container2"; $f = "deployment/v2/dev/field"
function Hex32 { -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) }) }
function SetKey($text, $key, $val) { $text -replace "(?m)^$key=.*$", "$key=$val" }
# .env dosyalari yoksa .env.example'dan uretilir (sirlar bu bilgisayarda olusturulur).
if (-not (Test-Path "$c1/.env") -or -not (Test-Path "$c2/.env") -or -not (Test-Path "$f/.env")) {
  Write-Host "=== .env dosyalari olusturuluyor ===" -ForegroundColor Cyan
  $ct1 = Hex32; $ct2 = Hex32
  $t = Get-Content "$f/.env.example" -Raw
  $t = SetKey $t "FIELD_ID" ([guid]::NewGuid().ToString()); $t = SetKey $t "FIELD_JWT_SECRET" (Hex32); $t = SetKey $t "FIELD_NAME" "GD-1"
  Set-Content "$f/.env" $t -NoNewline
  $t = Get-Content "$c1/.env.example" -Raw
  $t = SetKey $t "JWT_SECRET" (Hex32); $t = SetKey $t "CONTAINER_TOKEN" $ct1; $t = SetKey $t "CONTAINER2_TOKEN" $ct2
  Set-Content "$c1/.env" $t -NoNewline
  $t = Get-Content "$c2/.env.example" -Raw
  $t = SetKey $t "JWT_SECRET" (Hex32); $t = SetKey $t "CONTAINER_TOKEN" $ct2; $t = SetKey $t "CONTAINER_ID" "container-2"; $t = SetKey $t "CONTAINER2_TOKEN" $ct2
  Set-Content "$c2/.env" $t -NoNewline
}
Write-Host "=== Durduruluyor (varsa) ===" -ForegroundColor Cyan
docker compose --env-file "$f/.env" -f "$f/docker-compose.yml" down 2>$null
docker compose --env-file "$c2/.env" -f "$c2/docker-compose.yml" down 2>$null
docker compose --env-file "$c1/.env" -f "$c1/docker-compose.yml" down --remove-orphans 2>$null
Write-Host "=== Build + up: container-1 ===" -ForegroundColor Cyan
docker compose --env-file "$c1/.env" -f "$c1/docker-compose.yml" up -d --build --remove-orphans; if ($LASTEXITCODE) { throw "container-1 build/up hatasi" }
Write-Host "=== Build + up: container-2 ===" -ForegroundColor Cyan
docker compose --env-file "$c2/.env" -f "$c2/docker-compose.yml" up -d --build; if ($LASTEXITCODE) { throw "container-2 build/up hatasi" }
Write-Host "=== Build + up: field ===" -ForegroundColor Cyan
docker compose --env-file "$f/.env" -f "$f/docker-compose.yml" up -d --build; if ($LASTEXITCODE) { throw "field build/up hatasi" }

Write-Host "=== Field API bekleniyor (5002) ===" -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 90; $i++) { try { Invoke-WebRequest -UseBasicParsing http://localhost:5002/health -TimeoutSec 3 | Out-Null; $ok = $true; break } catch { Start-Sleep 2 } }
if (-not $ok) { throw "field web-service 3 dk icinde ayaga kalkmadi" }

Write-Host "=== Login + konteyner kaydi ===" -ForegroundColor Cyan
$fid = EnvVal "$f/.env" "FIELD_ID"; $ct1 = EnvVal "$c1/.env" "CONTAINER_TOKEN"; $ct2 = EnvVal "$c1/.env" "CONTAINER2_TOKEN"
function Login($pw) { Invoke-RestMethod -Method Post -Uri http://localhost:5002/api/auth/login -ContentType "application/json" -Body (@{ username = "admin"; password = $pw } | ConvertTo-Json) }
try { $r = Login "password123" } catch { $r = Login "password1234" }
$tok = $r.accessToken
if ($r.user.mustChangePassword) {
  $h = @{ Authorization = "Bearer $tok" }
  $c = Invoke-RestMethod -Method Post -Uri http://localhost:5002/api/auth/change-password -Headers $h -ContentType "application/json" -Body (@{ oldPassword = "password123"; newPassword = "password1234" } | ConvertTo-Json)
  if ($c.accessToken) { $tok = $c.accessToken }
}
$h = @{ Authorization = "Bearer $tok" }
foreach ($x in @(@("container-1", $ct1, "bess1"), @("container-2", $ct2, "bess2"))) {
  try {
    Invoke-RestMethod -Method Post -Uri "http://localhost:5002/api/fields/$fid/containers/$($x[0])/register" -Headers $h -ContentType "application/json" -Body (@{ token = $x[1]; station = $x[2] } | ConvertTo-Json) | Out-Null
    Write-Host "kayit OK: $($x[0]) -> $($x[2])"
  } catch { Write-Host "kayit uyarisi ($($x[0])): $($_.Exception.Message)" -ForegroundColor Yellow }
}
docker restart demo-container-web-service demo-container2-web-service | Out-Null
Write-Host ""
Write-Host "=== HAZIR: http://localhost:8088  (kullanici: admin / password1234) ===" -ForegroundColor Green
Start-Process "http://localhost:8088"
