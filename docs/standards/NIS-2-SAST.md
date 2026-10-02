# NIS2 + SonarQube Evidence Matrix

## 1. Amaç

Bu doküman, NIS2 kapsamında yazılım güvenliği, Secure SDLC, security
testing ve vulnerability management kontrollerinin kanıtlanması amacıyla
SonarQube ve diğer AppSec araçlarından üretilecek evidence'ların nasıl
kullanılacağını tanımlar.

> **Önemli:** SonarQube tek başına NIS2 uyumluluğunu kanıtlamaz.
> SonarQube; Secure SDLC, SAST, security testing ve vulnerability
> management kontrollerinin uygulanmasına ilişkin teknik evidence olarak
> kullanılabilir.

---

# 2. Evidence Matrix

| Kontrol Alanı | Kontrol | SonarQube Evidence | Diğer Evidence | Saklanacak Kanıt |
|---|---|---|---|---|
| Secure SDLC | Güvenli yazılım geliştirme yaşam döngüsü | SonarQube entegrasyonu | Secure SDLC Policy | Policy + SonarQube config |
| SAST | Kaynak kod güvenlik analizi | Vulnerabilities, Security Hotspots | - | SonarQube Security Report |
| Security Testing | Otomatik güvenlik testi | Scan sonuçları | DAST, Pentest | Test raporları |
| CI/CD Security | Release öncesi otomatik kontrol | Quality Gate | CI/CD pipeline | Pipeline log/screenshot |
| Vulnerability Management | Güvenlik bulgularının yönetimi | Vulnerability listesi | Jira/ServiceNow | Finding + ticket + remediation |
| Risk Management | Bulguların risk bazlı değerlendirilmesi | Severity | Risk assessment | Risk kayıtları |
| Remediation | Bulguların giderilmesi | Önce/sonra SonarQube sonucu | Jira ticket | Ticket + re-scan |
| Security Hotspots | Manuel security review | Security Hotspots | Code review | Review kayıtları |
| Release Security | Production öncesi kontrol | Quality Gate | Deployment pipeline | PASS/FAIL evidence |
| Continuous Testing | Düzenli/otomatik test | Tarihsel analizler | CI/CD | Pipeline history |
| Auditability | Geçmiş sonuçların izlenebilirliği | SonarQube history | Git/CI/CD | Tarihli raporlar |

---

# 3. SonarQube'dan Alınacak Evidence'lar

## 3.1 Security Report

Her önemli uygulama/release için aşağıdaki bilgiler saklanmalıdır:

- Vulnerabilities
- Security Hotspots
- Severity
- Security Rating
- CWE bilgileri
- OWASP ilişkileri
- Scan tarihi
- Branch
- Version/release bilgisi

### Evidence

```text
SEC-APP-001
SAST Security Analysis Report
Tool: SonarQube
Application: <APPLICATION>
Version: <VERSION>
Branch: <BRANCH>
Scan Date: <DATE>
```

# 4. Quality Gate Evidence

```text
Production'a çıkacak kod için SonarQube Quality Gate kullanılmalıdır.

Source Code
    |
    v
Build
    |
    v
Unit Tests
    |
    v
SonarQube Analysis
    |
    v
Security Quality Gate
    |
    +---- PASS ----> Deployment
    |
    +---- FAIL ----> Release Blocked
```

## Saklanacak Evidence
- Quality Gate sonucu
- Pipeline sonucu
- Pipeline execution ID
- Tarih
- Commit SHA
- Branch
- Release/version

### Evidence
``` text
SEC-APP-002
CI/CD Security Gate Evidence

Pipeline: <PIPELINE>
Commit: <COMMIT>
Branch: <BRANCH>
SonarQube Quality Gate: PASSED
Date: <DATE>
```

# 5. Vulnerability Remediation Evidence

En önemli evidence'lardan biridir.

Her önemli bulgu için aşağıdaki zincir kurulmalıdır:

```text
SonarQube Finding
       |
       v
Severity Assessment
       |
       v
Security/Jira Ticket
       |
       v
Developer Assignment
       |
       v
Fix
       |
       v
SonarQube Re-scan
       |
       v
Finding Resolved
```

Örnek

```text
Finding:
    SONAR-12345

Severity:
    HIGH

Issue:
    <DESCRIPTION>

Ticket:
    SEC-142

Owner:
    <TEAM>

Remediation:
    <DESCRIPTION>

Fix Date:
    <DATE>

Re-scan:
    PASSED

Status:
    RESOLVED
```

# 6. Security Hotspot Evidence

Security Hotspots için aşağıdaki bilgiler saklanmalıdır:
- Hotspot listesi
- Severity
- Reviewer
- Review tarihi
- Review sonucu
- Safe / Fixed / Acknowledged gibi sonuç
- Gerekçe

### Evidence

```text
SEC-APP-003
Security Hotspot Review Report

Application: <APPLICATION>
Review Period: <PERIOD>

Total Hotspots: <N>
Reviewed: <N>
Open: <N>

Reviewer: <NAME/TEAM>
```

# 7. CI/CD Integration Evidence

SonarQube'un sadece manuel olarak çalıştırılmadığını,
CI/CD pipeline'a entegre olduğunu göstermek daha güçlü evidence sağlar.

```text
1. Checkout
2. Build
3. Unit Tests
4. SAST / SonarQube
5. Quality Gate
6. SCA
7. Build Artifact
8. Deployment

```
## Örnek Pipeline
```text
1. Checkout
2. Build
3. Unit Tests
4. SAST / SonarQube
5. Quality Gate
6. SCA
7. Build Artifact
8. Deployment

```
### Saklanacak Kanıt
- Pipeline configuration
- Pipeline execution
- SonarQube step
- Quality Gate sonucu
- Failed pipeline örneği
- Başarılı pipeline örneği

### Özellikle faydalı
Bir kez Quality Gate'in FAIL olduğu ve deployment'ın engellendiği
gerçek pipeline kaydı varsa saklanmalıdır.

Bu, kontrolün sadece teorik olarak tanımlanmadığını gösterir.

# 8. SCA Evidence

SonarQube SAST'ın yanında dependency/security scanning de kullanılmalıdır.

```text
Third Party Dependencies
        |
        v
SCA Scanner
        |
        v
CVE Detection
        |
        v
Risk Assessment
        |
        v
Remediation

```

### Evidence
- Dependency scan report
- Critical/High CVE listesi
- SBOM
- Remediation tickets
- Updated dependency
- Re-scan sonucu

# 9. DAST Evidence

Çalışan uygulamanın güvenlik testi ayrı tutulmalıdır.

```text
Running Application
        |
        v
DAST
        |
        v
Security Findings
        |
        v
Remediation
        |
        v
Re-test

```

### Evidence
- DAST report
- Scan date
- Target environment
- Findings
- Severity
- Remediation
- Re-test result

# 10. Penetration Test Evidence

Pentest SonarQube'un yerine geçmez.

Pentest ayrı bir evidence olarak tutulmalıdır.

```text
Pentest
    |
    +-- Scope
    +-- Methodology
    +-- Findings
    +-- Severity
    +-- Risk
    +-- Remediation
    +-- Re-test
    +-- Final Report

```

### Saklanacak Kanıt
```text
PEN-001
Penetration Test Report

Scope: <APPLICATION/SYSTEM>
Test Date: <DATE>
Provider: <PROVIDER>
Methodology: <METHODOLOGY>

Critical: <N>
High: <N>
Medium: <N>
Low: <N>

Remediation Status: <STATUS>
Re-test Date: <DATE>

```

# 11. Vulnerability Management Evidence
SonarQube'daki bulguların vulnerability management sürecine bağlanması gerekir.

## Önerilen Süreç
```text
Detection
    |
    v
Classification
    |
    v
Risk Assessment
    |
    v
Assignment
    |
    v
Remediation
    |
    v
Verification
    |
    v
Closure

```

### Minimum Kayıt Alanları

| Alan | Açıklama |
|------|----------|
| Finding ID | SonarQube/CVE/Ticket ID |
| Source | SonarQube/SCA/DAST/Pentest |
| Application | İlgili uygulama |
| Severity | Critical/High/Medium/Low |
| Risk | Kurumsal risk değerlendirmesi |
| Owner | Sorumlu ekip |
| Due Date | Hedef çözüm tarihi |
| Remediation | Alınan aksiyon |
| Verification | Re-test sonucu |
| Status | Open/Resolved/Accepted |
| Risk Acceptance | Varsa onay |
| Closure Date | Kapatılma tarihi |

# 12. Secure SDLC Policy

SonarQube'un kurum politikasında tanımlı olması önemlidir.
Örnek politika:
> All internally developed software shall undergo automated static application security testing as part of the CI/CD pipeline.
>
> Security findings shall be assessed according to their severity and organizational risk criteria.
>
> Critical findings shall be remediated or formally risk-accepted before production deployment.
>
> Security testing results and remediation evidence shall be retained in accordance with the organization's security testing and vulnerability management procedures.

# 13. Risk Acceptance
Bir vulnerability hemen düzeltilemiyorsa:
```text
Finding
   |
   v
Risk Assessment
   |
   +---- Remediate
   |
   +---- Risk Acceptance
              |
              v
        Authorized Approval
              |
              v
        Expiration Date

```

Risk acceptance kaydında:
- Finding
- Risk
- Business justification
- Compensating controls
- Approver
- Approval date
- Expiration date

bulunmalıdır.

> Risk acceptance kalıcı bir "ignore" mekanizması olarak kullanılmamalıdır.

# 14. Evidence Naming Convention

Önerilen dosya isimleri:
```text
SEC-APP-001-SonarQube-Security-Report.pdf
SEC-APP-002-CI-CD-Quality-Gate.pdf
SEC-APP-003-Security-Hotspot-Review.pdf
SEC-APP-004-SonarQube-Configuration.pdf

SCA-001-Dependency-Scan.pdf
SCA-002-SBOM.pdf

DAST-001-DAST-Report.pdf

PEN-001-Penetration-Test-Report.pdf
PEN-002-Penetration-Test-Retest.pdf

VUL-001-Vulnerability-Register.xlsx
VUL-002-Remediation-Evidence.pdf

SDLC-001-Secure-SDLC-Policy.pdf
SDLC-002-Security-Testing-Procedure.pdf

```
# 15. Önerilen Evidence Repository

```text
NIS2-EVIDENCE/
│
├── 01-Governance/
│   ├── Secure-SDLC-Policy.pdf
│   ├── Security-Testing-Policy.pdf
│   └── Vulnerability-Management-Policy.pdf
│
├── 02-SAST/
│   ├── SonarQube/
│   │   ├── Reports/
│   │   ├── Quality-Gates/
│   │   ├── Security-Hotspots/
│   │   └── Configuration/
│   └── CI-CD/
│
├── 03-SCA/
│   ├── Reports/
│   └── SBOM/
│
├── 04-DAST/
│   └── Reports/
│
├── 05-Pentest/
│   ├── Reports/
│   ├── Findings/
│   └── Retests/
│
├── 06-Vulnerability-Management/
│   ├── Register/
│   ├── Remediation/
│   └── Risk-Acceptance/
│
└── 07-Audit/
    ├── Evidence-Index.xlsx
    └── Evidence-Mapping.xlsx

```

# 16. Auditor Evidence Mapping

| Auditor Sorusu | Gösterilecek Evidence |
|----------------|------------------------|
| Secure development processiniz var mı? | Secure SDLC Policy |
| Source code security test ediliyor mu? | SonarQube Security Report |
| Test otomatik mi? | CI/CD Pipeline |
| Production öncesinde kontrol var mı? | Quality Gate |
| Kritik bulgu varsa ne oluyor? | Quality Gate + Jira |
| Bulgu nasıl takip ediliyor? | Vulnerability Register |
| Bulgu gerçekten düzeltildi mi? | Jira + SonarQube Re-scan |
| Security Hotspot'lar inceleniyor mu? | Hotspot Review |
| Dependency güvenliği kontrol ediliyor mu? | SCA Report |
| Çalışan uygulama test ediliyor mu? | DAST Report |
| Bağımsız güvenlik testi yapılıyor mu? | Pentest Report |
| Pentest bulguları kapatılıyor mu? | Remediation + Re-test |
| Test sonuçları saklanıyor mu? | Evidence Repository |
| Kontroller düzenli uygulanıyor mu? | Historical Reports / CI-CD History |
| İstisnalar nasıl yönetiliyor? | Risk Acceptance Records |


# 17. Minimum AppSec Evidence Set

```text
                    Secure SDLC Policy
                           |
                           v
                    Security Testing
                           |
          +----------------+----------------+
          |                |                |
         SAST             SCA              DAST
      SonarQube        Dependency         Runtime
          |             Scanner            Scan
          |                |                |
          +----------------+----------------+
                           |
                           v
                       Pentest
                           |
                           v
                  Vulnerability Mgmt.
                           |
                           v
                      Remediation
                           |
                           v
                     Re-testing
                           |
                           v
                     Audit Evidence

```

# 18. Denetçiye Verilecek Kısa Açıklama

> Our secure software development lifecycle incorporates automated
> security testing into the CI/CD process.
>
> Static application security testing is performed using SonarQube.
> Security findings are assessed based on severity and organizational risk
> criteria. Relevant findings are tracked through the vulnerability
> management process until remediation and verification.
>
> SonarQube Quality Gates are integrated into the CI/CD process to provide
> an automated security control before release.
>
> SAST is complemented by software composition analysis, dynamic security
> testing and periodic penetration testing where applicable.
>
> Security testing results, findings, remediation activities and
> re-test results are retained as audit evidence.

# 19. NIS2 Evidence Mantığı
SonarQube aşağıdaki iddiayı tek başına kanıtlamaz:
> "NIS2 Compliant"

Daha doğru evidence zinciri:
```text
SonarQube
    ↓
SAST / Security Testing Control
    ↓
Secure SDLC
    ↓
Vulnerability Management
    ↓
Remediation
    ↓
Audit Evidence

```
Dolayısıyla SonarQube, NIS2 uyumluluğunun tek kanıtı değil;
uyumluluk kontrollerinden birinin uygulandığını ve izlenebilir olduğunu
gösteren teknik kanıttır.

# 20. Önerilen AppSec Stack

| Katman | Araç / Evidence | Amaç |
|--------|-----------------|------|
| Secure SDLC | Policy + Procedure | Sürecin tanımlanması |
| SAST | SonarQube | Source-code security |
| SCA | Dependency Scanner | Third-party dependency security |
| DAST | DAST Tool | Runtime security |
| Pentest | Independent Pentest | Bağımsız güvenlik testi |
| Vulnerability Management | Jira/ServiceNow vb. | Findings lifecycle |
| CI/CD | GitLab/GitHub/Jenkins/Azure DevOps vb. | Otomasyon ve enforcement |
| Risk Management | Risk Register | Risk bazlı karar |
| Audit Evidence | Evidence Repository | İzlenebilirlik |

# 21. Son Kontrol Listesi

### Governance
- [ ] Secure SDLC Policy mevcut
- [ ] Security Testing Procedure mevcut
- [ ] Vulnerability Management Procedure mevcut
- [ ] Risk Acceptance Procedure mevcut
- [ ] SonarQube kullanımı ilgili policy/procedure içinde tanımlı

### SonarQube
- [ ] SonarQube CI/CD'ye entegre
- [ ] Security analysis aktif
- [ ] Security Hotspots takip ediliyor
- [ ] Vulnerabilities takip ediliyor
- [ ] Quality Gate tanımlı
- [ ] Quality Gate production release sürecine bağlı
- [ ] Scan sonuçları saklanıyor
- [ ] Tarihsel sonuçlar tutuluyor
- [ ] Critical/High findings için remediation süreci mevcut

### Vulnerability Management
- [ ] SonarQube finding → ticket bağlantısı mevcut
- [ ] Owner belirleniyor
- [ ] Due date belirleniyor
- [ ] Risk değerlendiriliyor
- [ ] Remediation kaydediliyor
- [ ] Re-scan yapılıyor
- [ ] Closure evidence tutuluyor
- [ ] Risk acceptance kayıtları tutuluyor

### Diğer Security Testing
- [ ] SCA yapılıyor
- [ ] SBOM üretiliyor
- [ ] DAST yapılıyor
- [ ] Penetration test yapılıyor
- [ ] Pentest findings takip ediliyor
- [ ] Pentest remediation kanıtlanıyor
- [ ] Re-test yapılıyor

### Audit
- [ ] Evidence naming standardı mevcut
- [ ] Evidence repository mevcut
- [ ] Evidence tarihleri mevcut
- [ ] Application/version/commit bilgileri mevcut
- [ ] CI/CD execution kayıtları mevcut
- [ ] Quality Gate sonuçları mevcut
- [ ] Remediation kayıtları mevcut
- [ ] Risk acceptance kayıtları mevcut
- [ ] Evidence → NIS2 control mapping mevcut

# 22. Referanslar
- ENISA — NIS2 Technical Implementation Guidance, 2025
- European Commission — Commission Implementing Regulation (EU) 2024/2690
- SonarQube Documentation — Security Reports
- Honeywell — NIS2 Cybersecurity / Secure Software Development documentation

> Final note: NIS2 kapsamındaki gerçek yükümlülükler kuruluşun sektörü,
> kapsamı, büyüklüğü ve uygulanabilir ulusal/sektörel düzenlemelere göre
> ayrıca değerlendirilmelidir. ENISA rehberi teknik uygulama konusunda
> yol gösterici olmakla birlikte tek başına tüm ulusal denetim kriterlerini
> belirlemez.
