# Konfigurācijas Dokumentācija - Clean Files

Šī dokumentācija apraksta `signature*.yaml` un `dmss-*.yaml` failu konfigurāciju.

---

## 1. SIGNATURE KONFIGURĀCIJA

### Failu Pārskats

Direktorijā atrodas šādi Signature konfigurācijas faili:
- `signatureauthorize.yaml` - Autorizācijas servisa konfigurācija
- `signatureclient.yaml` - Klienta servisa konfigurācija
- `signatureconfiguration.yaml` - Konfigurācijas servisa iestatījumi (Nepieciešams DNS/adrese, lai servisam varētu piekļūt ārpus cluster)
- `signatureintegration.yaml` - Integrācijas servisa konfigurācija (Nepieciešams DNS/adrese, lai servisam varētu piekļūt ārpus cluster)
- `signatureperson.yaml` - Personu servisa konfigurācija (Nepieciešams DNS/adrese, lai servisam varētu piekļūt ārpus cluster)
- `signatureworker.yaml` - Fona darbu servisa konfigurācija (Nepieciešams DNS/adrese, lai servisam varētu piekļūt ārpus cluster)

### Automātiski Aizpildāmie Lauki

Šie lauki tiek automātiski aizpildīti ar `gen.js` skriptu un **NAV jāmaina manuāli**:

#### Šifrēšanas un Sertifikāti
- `EncryptionKey` - Šifrēšanas atslēga
- `PrivateKey` - Privātā atslēga
- `Microservices__X__Microservice` - Mikroservisu nosaukumi
- `Microservices__X__PublicKey` - Publiskās atslēgas

#### Mikroservisu Hosti
- `Microservices__X__Host` - Iekšējās servisu adreses (nav jāmaina, ja servisu nosaukumi nav mainīti)

### Manuāli Konfigurējamie Lauki

#### Obligāti Konfigurējamie Iestatījumi

##### Datubāzes Savienojums (visos failos)
```yaml
ConnectionString: 'Server=postgres-signature;Port=5432;User Id=signature;Password=signaturePassword;Database=signature'
```

##### signatureauthorize.yaml
```yaml
DigitalMindsAuthenticationService: 'http://dmss-authentication-service:8089/'
```

##### signatureclient.yaml
```yaml
DigitalMindsContainersAndSignaturesService: 'http://dmss-container-and-signature:8092/'
DigitalMindsArchiveService: 'http://dmss-archive-services:8090/'
PersonsMicroserviceHost: 'https://signature-person.example.com/'
```

**Piezīme:** `PersonsMicroserviceHost` vērtība ir klienta veidots DNS ieraksts, kurā atrodams/pieejams šis serviss ārpus Kubernetes klastera.

##### signatureworker.yaml
```yaml
Host: 'https://signature-worker.example.com/'
```

**Piezīme:** DMSS servisu adreses (`DigitalMindsAuthenticationService`, `DigitalMindsContainersAndSignaturesService`, `DigitalMindsArchiveService`) nav jākonfigurē, ja `dmss-*` servisi nav izvietoti ar citiem nosaukumiem vai portiem.

### Konfigurācijas Soļi

**Priekšnosacījumi:** `gen.js` skripta darbināšanai nepieciešama Node.js instalācija darbastacijā.

1. **Palaidiet sertifikātu ģenerēšanu:**
   ```bash
   cd generate_certificates
   node gen.js
   ```

   **Alternatīva:** Ja nevēlaties izmantot `gen.js`, atslēgas var ģenerēt manuāli ar OpenSSL. Skatiet [OPENSSL.md](OPENSSL.md) instrukcijas.

2. **Manuāli konfigurējiet:**
   - Datubāzes savienojuma virkni
   - Ārējo servisu galapunktus

### Svarīgas Piezīmes

- **Bez vajadzības nemainiet** automātiski ģenerētos sertifikātus un atslēgas, ja ir nepieciešamība pārģenerēt, tad izmantojiet `gen.js` skriptu
- Pārliecinieties, ka visi servisu URL ir pareizi konfigurēti jūsu videi
- PostgreSQL datubāze tiek izveidota ar `signature-postgres.yaml`

### PostgreSQL Datubāzes Konfigurācija

Datubāzes konfigurācija atrodas failā `signature-postgres.yaml`.

#### Obligāti Mainīt

##### Datubāzes Parole
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-signature-secret
type: Opaque
data:
  POSTGRES_PASSWORD: c2lnbmF0dXJlUGFzc3dvcmQ= # base64: signaturePassword
```

**Svarīgi:** Mainiet noklusēto paroli `signaturePassword` uz drošu paroli un kodējiet to base64 formātā.

##### Datu Glabāšana
```yaml
resources:
  requests:
    storage: 10Gi
storageClassName: standard
```

**Konfigurējiet:** Pielāgojiet glabāšanas apjomu un storage class atbilstoši jūsu videi.

#### Konfigurējamie Parametri

##### Obligāti Mainīt Ražošanā:
- **POSTGRES_PASSWORD**: Mainiet noklusēto paroli `signaturePassword`
- **storage**: Pielāgojiet datu glabāšanas apjomu (noklusētais: 10Gi)
- **storageClassName**: Iestatiet atbilstošu storage class jūsu Kubernetes klasterim

#### Izvietošanas Secība

1. **Vispirms izvietojiet PostgreSQL:**
   ```bash
   kubectl apply -f signature-postgres.yaml
   ```
2. **Pēc tam izvietojiet Signature servisus:**
   ```bash
   kubectl apply -f signatureauthorize.yaml
   kubectl apply -f signatureclient.yaml
   kubectl apply -f signatureconfiguration.yaml
   kubectl apply -f signatureintegration.yaml
   kubectl apply -f signatureperson.yaml
   kubectl apply -f signatureworker.yaml
   ```
#### Pirmreizējā lietotāja izveide

Lai izveidotu pirmreizējo administratora lietotāju Signature.Configuration lietotnei, ir jāpalaiž PowerShell skripts `generate_first_user` mapē.

1. **Pārejiet uz generate_first_user direktoriju:**
   ```bash
   cd generate_first_user
   ```

2. **Palaidiet PowerShell skriptu ar nepieciešamajiem parametriem:**
   ```powershell
   .\CreateInitialSQLScript.ps1 -Username 'admin' -Password 'P@ssw0rd!' -Email 'admin@example.com' -FirstName 'Admin' -LastName 'User'
   ```

3. **Sekojiet instrukcijām:**
   - Skripts uzģenerēs `CreateInitialUser.sql` failu ar drošu paroles hash un salt vērtībām
   - SQL skripts izmantos PBKDF2-HMACSHA256 algoritmu ar 10,000 iterācijām

4. **Izpildiet ģenerēto SQL pret signature-postgres datubāzi:**
   ```bash
   # Piemērs ar kubectl
   kubectl exec -it deployment/postgres-signature -- psql -U signature -d signature -f /path/to/CreateInitialUser.sql

   # Vai kopējiet SQL saturu un izpildiet to manuāli
   kubectl exec -it deployment/postgres-signature -- psql -U signature -d signature
   ```

**Svarīgi:**
- Mainiet noklusētos parametrus (Username, Password, Email) uz drošām vērtībām
- SQL skripts izveidos lietotāju ar administratora tiesībām (`IsAdmin: true`)
- Parole tiek droši hešēta un nekad netiek glabāta atklātā tekstā

#### Drošības Apsvērumi

- Mainiet noklusēto datubāzes paroli
- Izmantojiet Kubernetes Secrets sensitīviem datiem
- Konfigurējiet backup stratēģiju persistent volume
- Ierobežojiet piekļuvi datubāzei tikai nepieciešamajiem servisiem

---

## 2. DMSS KONFIGURĀCIJA

### Failu Pārskats

DMSS (Digital Minds Signature Services) konfigurācijas faili:
- `dmss-authentication-service.yaml` - Autentifikācijas serviss (Smart-ID, Mobile-ID, LVRTC)
- `dmss-container-and-signature-service.yaml` - Konteineru un parakstu serviss
- `dmss-archive-services.yaml` - Arhivēšanas serviss (primārais)
- `dmss-archive-services-fallback.yaml` - Rezerves arhivēšanas serviss

### Obligāti Konfigurējamie Parametri

Visi parametri ar `${variableName}` formātu **OBLIGĀTI** jākonfigurē manuāli/automatizēti.

#### dmss-authentication-service.yaml

**Smart-ID Konfigurācija:**

```yaml
smartId:
  hostUrl: https://rp-api.smart-id.com/v2
  relyingPartyUUID: ${relyingPartyUUID}      # OBLIGĀTI MAINĪT
  relyingPartyName: ${relyingPartyName}      # OBLIGĀTI MAINĪT
  displayText: ${displayText}                # OBLIGĀTI MAINĪT
```

**Kur iegūt:**
- Reģistrējieties Smart-ID pakalpojumu sniedzēja portālā
- Ražošanai: https://www.smart-id.com/
- Testēšanai: https://github.com/SK-EID/smart-id-documentation

**LVRTC Konfigurācija:**

```yaml
lvrtc:
  authUri: https://eidas.eparaksts.lv/trustedx-authserver/oauth/lvrtc-eipsign-as
  resourcesUri: https://eidas.eparaksts.lv/trustedx-resources/openid/v1/users/me
  clientId: ${clientId}                                     # OBLIGĀTI MAINĪT
  clientSecret: ${clientSecret}                             # OBLIGĀTI MAINĪT
  redirectUri: ${signaturePersonURL}/api/lvrtc-signing/     # OBLIGĀTI MAINĪT
```

**Kur iegūst:**
- `clientId` un `clientSecret` - Reģistrējieties https://www.eparaksts.lv/
- `signaturePersonUrl` - Jūsu SignaturePerson servisa publiskais URL (piemēram: `https://signature-person.example.com`)

**Hazelcast Konfigurācija:**

```yaml
hazelcast:
  kubernetes:
    enabled: true
    service-dns: dmss-authentication-service.default.svc.cluster.local
```

**Piezīme:** Ja izmantojat citu namespace, mainiet `default` uz savu namespace nosaukumu.

---

#### dmss-container-and-signature-service.yaml

**Smart-ID Konfigurācija:**

```yaml
smartId:
  hostUrl: https://rp-api.smart-id.com/v2/
  relyingPartyUUID: ${relyingPartyUUID}      # OBLIGĀTI MAINĪT (tāds pats kā authentication-service)
  relyingPartyName: ${relyingPartyName}      # OBLIGĀTI MAINĪT (tāds pats kā authentication-service)
  displayText: ${displayText}                # OBLIGĀTI MAINĪT (tāds pats kā authentication-service)
```

**Piezīme:** `${displayText} konfigurē tekstu, kurš tiks attēlots lietotājiem Smart-ID autentifikācijas laikā.

**LVRTC Konfigurācija:**

```yaml
lvrtc:
  baseUri: https://eidas.eparaksts.lv/
  clientId: ${clientId}                                              # OBLIGĀTI MAINĪT (tāds pats kā authentication-service)
  clientSecret: ${clientSecret}                                      # OBLIGĀTI MAINĪT (tāds pats kā authentication-service)
  authRedirectUri: ${signaturePersonUrl}/api/lvrtc-signing/sign-authorize/
  signRedirectUri: ${signaturePersonUrl}/api/lvrtc-signing/signing-identity/
  defaultLocale: lv
  tspUrl: https://tsa.eparaksts.lv/
```

**Piezīme:** `clientId`, `clientSecret` un `signaturePersonUrl` jābūt tādiem pašiem kā `dmss-authentication-service.yaml`.

**DigiDoc4j Konfigurācija:**

```yaml
digidoc4j:
  configuration:
    mode: PROD              # vai TEST
```

**Hazelcast Konfigurācija:**

```yaml
hazelcast:
  kubernetes:
    enabled: true
    kubernetesServiceDns: dmss-container-and-signature.default.svc.cluster.local
```

**Arhīva Servisu Konfigurācija:**

```yaml
archive-services:
  baseUrl: http://dmss-archive-services:8090/api
```

---

#### dmss-archive-services.yaml

**Arhīva Savienojumi:**

```yaml
archive-connections:
  connections:
    -
      name: "FS-MAIN"
      url: http://dmss-archive-services-fallback:8095/api
      type: EXTERNAL_FILE_SYSTEM
      priority: 1
```

**Piezīme:** Šī konfigurācija norāda uz fallback servisu. Pārliecinieties, ka URL ir pareizs.

---

#### dmss-archive-services-fallback.yaml

**PostgreSQL Datubāzes Konfigurācija:**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://fallback-postgres-db:5432/${fallbackDbName}
    username: ${fallbackDbUsername}      # OBLIGĀTI MAINĪT
    password: ${fallbackDbPassword}      # OBLIGĀTI MAINĪT
```

**Kur iegūt:**
- `${fallbackDbName}` - Datubāzes nosaukums (piemēram: `signature`)
- `${fallbackDbUsername}` - Datubāzes lietotājvārds (piemēram: `admin`)
- `${fallbackDbPassword}` - Datubāzes parole (jāizveido droša parole)

**PostgreSQL Deployment Konfigurācija:**

```yaml
env:
  - name: POSTGRES_PASSWORD
    valueFrom:
      secretKeyRef:
        name: fallback-postgres-secret
        key: password
  - name: POSTGRES_DB
    value: ${fallbackDbName}           # OBLIGĀTI MAINĪT
  - name: POSTGRES_USER
    value: ${fallbackDbUsername}       # OBLIGĀTI MAINĪT
```

**PostgreSQL Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: fallback-postgres-secret
type: Opaque
data:
  password: <base64-encoded-password>  # OBLIGĀTI MAINĪT
```

**Kā izveidot base64 kodētu paroli:**
```bash
echo -n 'jūsu-drošā-parole' | base64
```

**Piezīme:** Pārliecinieties, ka `${fallbackDbName}` un `${fallbackDbUsername}` vērtības ir identiskas gan Spring datasource konfigurācijā, gan PostgreSQL deployment environment mainīgajos.

**Persistent Volume:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: fallback-db-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard    # Mainīt atbilstoši jūsu Kubernetes klasterim
  resources:
    requests:
      storage: 500Mi             # Pielāgot nepieciešamajam apjomam
```

### Kopsavilkums: Visi ${} Parametri

| Fails | Parametrs | Apraksts | Kur iegūt |
|-------|-----------|----------|-----------|
| `dmss-authentication-service.yaml` | `${relyingPartyUUID}` | Smart-ID Relying Party UUID | Smart-ID reģistrācija |
| `dmss-authentication-service.yaml` | `${relyingPartyName}` | Smart-ID Relying Party nosaukums | Smart-ID reģistrācija |
| `dmss-authentication-service.yaml` | `${displayText}` | Teksts, ko rāda lietotājam | Jūsu izvēle |
| `dmss-authentication-service.yaml` | `${clientId}` | LVRTC klienta ID | eParaksts.lv reģistrācija |
| `dmss-authentication-service.yaml` | `${clientSecret}` | LVRTC klienta noslēpums | eParaksts.lv reģistrācija |
| `dmss-authentication-service.yaml` | `${signaturePersonURL}` | Signature Person publiskais URL | Jūsu DNS/Ingress konfigurācija |
| `dmss-container-and-signature-service.yaml` | `${relyingPartyUUID}` | Smart-ID UUID (tāds pats) | Smart-ID reģistrācija |
| `dmss-container-and-signature-service.yaml` | `${relyingPartyName}` | Smart-ID nosaukums (tāds pats) | Smart-ID reģistrācija |
| `dmss-container-and-signature-service.yaml` | `${displayText}` | Teksts, ko rāda lietotājam Smart-ID autentifikācijas laikā | Jūsu izvēle |
| `dmss-container-and-signature-service.yaml` | `${clientId}` | LVRTC klienta ID (tāds pats) | eParaksts.lv reģistrācija |
| `dmss-container-and-signature-service.yaml` | `${clientSecret}` | LVRTC noslēpums (tāds pats) | eParaksts.lv reģistrācija |
| `dmss-container-and-signature-service.yaml` | `${signaturePersonURL}` | Signature Person URL (tāds pats) | Jūsu DNS/Ingress konfigurācija |
| `dmss-archive-services-fallback.yaml` | `${fallbackDbName}` | PostgreSQL datubāzes nosaukums | Jūsu izvēle (piemēram: `signature`) |
| `dmss-archive-services-fallback.yaml` | `${fallbackDbUsername}` | PostgreSQL lietotājvārds | Jūsu izvēle (piemēram: `admin`) |
| `dmss-archive-services-fallback.yaml` | `${fallbackDbPassword}` | PostgreSQL parole | Droša parole (base64 kodēta Secret) |

### Izvietošanas Secība

1. **Vispirms izvietojiet Fallback PostgreSQL un Archive servisu:**
   ```bash
   kubectl apply -f dmss-archive-services-fallback.yaml
   ```

2. **Pēc tam izvietojiet pārējos DMSS servisus:**
   ```bash
   kubectl apply -f dmss-archive-services.yaml
   kubectl apply -f dmss-authentication-service.yaml
   kubectl apply -f dmss-container-and-signature-service.yaml
   ```

### Drošības Apsvērumi

- **OBLIGĀTI** mainiet visas noklusētās paroles (`example`, `signaturePassword`)
- Izmantojiet Kubernetes Secrets visiem sensitīvajiem datiem
- Ierobežojiet piekļuvi DMSS servisiem tikai no Signature mikroservisiem
