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
- `signatureworker.yaml` - Darba servisa konfigurācija (Nepieciešams DNS/adrese, lai servisam varētu piekļūt ārpus cluster)

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

1. **Palaidiet sertifikātu ģenerēšanu:**
   ```bash
   cd generate_certificates
   node gen.js
   ```

2. **Manuāli konfigurējiet:**
   - Datubāzes savienojuma virkni
   - Ārējo servisu galapunktus

### Svarīgas Piezīmes

- **Nekad nemainiet** automātiski ģenerētos sertifikātus un atslēgas
- Pārliecinieties, ka visi servisu URL ir pareizi konfigurēti jūsu videi
- PostgreSQL datubāze tiek izveidota ar `signature-postgres.yaml`

### PostgreSQL Datubāzes Konfigurācija

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

##### Resursu Ierobežojumi:
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

#### Izvietošanas Secība

1. **Vispirms izvietojiet PostgreSQL:**
   ```bash
   kubectl apply -f signature-postgres.yaml
   ```
2. **Pēc tam izvietojiet Signature servisus:**
   ```bash
   kubectl apply -f signatureauthorize.yaml
   kubectl apply -f signatureclient.yaml
   # utt.
   ```
#### Pirmreizējā lietotāja izveide

Lai izveidotu pirmreizējo administratora lietotāju Signature sistēmā, ir jāpalaiž PowerShell skripts `generate_first_user` mapē.

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
- `signaturePersonURL` - Jūsu signatureperson servisa publiskais URL (piemēram: `https://signature-person.example.com`)

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

**LVRTC Konfigurācija:**

```yaml
lvrtc:
  baseUri: https://eidas.eparaksts.lv/
  clientId: ${clientId}                                              # OBLIGĀTI MAINĪT
  clientSecret: ${clientSecret}                                      # OBLIGĀTI MAINĪT
  authRedirectUri: ${signaturePersonURL}/api/lvrtc-signing/sign-authorize/
  signRedirectUri: ${signaturePersonURL}/api/lvrtc-signing/signing-identity/
  defaultLocale: lv
  tspUrl: https://tsa.eparaksts.lv/
```

**Piezīme:** `clientId`, `clientSecret` un `signaturePersonURL` jābūt tādiem pašiem kā `dmss-authentication-service.yaml`.

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
      failover: "FSA-MAIN"
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
    url: jdbc:postgresql://fallback-postgres-db:5432/signature
    username: admin      # OBLIGĀTI MAINĪT
    password: example    # OBLIGĀTI MAINĪT
```

**PostgreSQL Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: fallback-postgres-secret
type: Opaque
data:
  password: ZXhhbXBsZQ==  # base64("example") - OBLIGĀTI MAINĪT
```

**Kā mainīt paroli:**
```bash
echo -n 'jūsu-drošā-parole' | base64
```

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
| `dmss-container-and-signature-service.yaml` | `${displayText}` | Teksts lietotājam (tāds pats) | Jūsu izvēle |
| `dmss-container-and-signature-service.yaml` | `${clientId}` | LVRTC klienta ID (tāds pats) | eParaksts.lv reģistrācija |
| `dmss-container-and-signature-service.yaml` | `${clientSecret}` | LVRTC noslēpums (tāds pats) | eParaksts.lv reģistrācija |
| `dmss-container-and-signature-service.yaml` | `${signaturePersonURL}` | Signature Person URL (tāds pats) | Jūsu DNS/Ingress konfigurācija |

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
