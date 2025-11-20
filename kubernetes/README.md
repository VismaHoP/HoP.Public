# HoP Deployment Konfigurācijas Ceļvedis

## AWS ECR Privātais Reģistrs

Privātais ECR reģistrs tiek izmantots kā pagaidu risinājums.

### Autentifikācija

Lai veiksmīgi lejupielādētu images no AWS privātā ECR reģistra, nepieciešams konfigurēt credentials, kuri ir nosūtīti.

Lai veiksmīgi autorizētos pret ECR, ir nepieciešams izmantot "laicīgu" tokenu. 

**Dokumentācija:** [AWS ECR Registry Authentication](https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html)

#### Docker Login piemērs

```bash
aws ecr get-login-password --region region | docker login --username AWS --password-stdin aws_account_id.dkr.ecr.region.amazonaws.com
```

---

## Svarīga Konfigurācija

### Gateway Konfigurācija

Gateway `yaml` failā nepieciešams aizpildīt `ExternalH2OApplicationHost`, kurš satur adresi, kurā pieejams Gateway micro.

### Registry URL

Yaml failos privātais repo ir aizvietots ar `${registryURL}`. To nepieciešams **find/replace** visos failos uz vērtību, kura ir nosūtīta privāti.

### Datubāzes Connection String

Šādiem mikroservisu yaml failiem jāpapildina/jānomaina ar nosūtīto `PgConnectionString`:
- Gateway
- Database
- Notification
- Acquaint
- Workplace

---

## Pirmā Startēšana

Pirmo reizi startējot HoP, ir nepieciešams ievērot **sekojošu secību**:

1. **Startējam Postgres**
   ```bash
   kubectl apply -f pg_ecr.yaml
   ```

2. **Startējam Database mikroservisu**
   ```bash
   kubectl apply -f h2o.app.database.yaml
   ```

3. **Startējam Auth mikroservisu**
   ```bash
   kubectl apply -f h2o.app.auth.yaml
   ```

4. **Pēc ~2 minūtēm startējam Gateway**
   ```bash
   kubectl apply -f h2o.app.gateway.yaml
   ```

5. **Startējam visus atlikušos mikroservisus**
   ```bash
   kubectl apply -f .
   ```

---

## Piekļuve HoP

Pieeju pie HoP nodrošina **H2O.Web** mikroserviss, kurš pēc noklusējuma pieejams uz **porta 80**. 

Lai izmantotu HoP, jāizmanto/jāpublicē šis mikroserviss/ports.

---

## Specifiskas Konfigurācijas

### Acquaint Mikroserviss

Nepieciešams aizpildīt `SignaturePlatformHost`.

### FTG Mikroserviss

FTG micro konfigurācijas apraksts: [FTG README](https://github.com/VismaHoP/HoP.Public/blob/Delivery-92/kubernetes/FTG_README.md)

---

## Vides Mainīgie

### Kopējie Vides Mainīgie

| Mainīgais | Iespējamās Vērtības | Apraksts |
|-----------|---------------------|----------|
| `LogFileMinLevel` | `Info`, `Warn`, `Trace`, `Debug`, `Error`, `Fatal` | Faila log līmenis |
| `LogFileDirectory` | `/var/log/hop` | Log failu direktorija |
| `LogConsoleMinLevel` | `Trace`, `Debug`, `Info`, `Warn`, `Error`, `Fatal`, `Off` | Konsoles log līmenis. [Detalizēta info](https://github.com/VismaHoP/HoP.Public/blob/Delivery-92/kubernetes/COMMON.md) |

### Mikroservisu Specifiskie Vides Mainīgie

| Obligāts | Mikroserviss | Mainīgais | Piemēra Vērtība |
|----------|--------------|-----------|-----------------|
| ✅ | `h2o.app.gateway` | `ExternalH2OApplicationHost` | `https://gateway.example.com` |
| ✅ | `h2o.app.acquaint` | `SignaturePlatformHost` | `https://signature.example.com` |
| ✅ | `h2o.app.acquaint` | `PgConnectionString` | `Server=localhost;Port=5432;User Id=user;Password=password;Database=db` |
| ❌ | `h2o.app.attachment` | `AllowedFileExtensions` | `txt,pdf,rtf,doc,docx,docm,docb,xls,xlsx,xlsm,xlsxb,ppt,pps,pptx,pptm,ppsx,sldx,sldm,jpg,jpeg,png,gif,tif,tiff,bmp,ico,edoc` |
| ❌ | `h2o.app.attachment` | `GetMagicNumbersFromConfiguration` | `true` / `false` |
| ❌ | `h2o.app.attachment` | `MagicNumbersForConfiguredFileExtensions` | - |
| ❌ | `h2o.app.antra.license` | `IsLicenseReloadEnabled` | `true` / `false` |
| ❌ | `h2o.app.auth` | `IsLicenseReloadEnabled` | `true` / `false` |
| ❌ | `h2o.app.auth` | `EnableKeycloakAuthenticationMethod` | `true` / `false` |
| ❌ | `h2o.app.auth` | `AllowExternalUserIdMismatch` | `true` / `false` |
| ❌ | `h2o.app.auth` | `AutoAssignClientId` | `true` / `false` |
| ✅ | `h2o.app.database` | `PgConnectionString` | `Server=localhost;Port=5432;User Id=user;Password=password;Database=db` |
| ✅ | `h2o.app.gateway` | `PgConnectionString` | `Server=localhost;Port=5432;User Id=user;Password=password;Database=db` |
| ❌ | `h2o.app.gateway` | `AutoAssignClientId` | `true` / `false` |
| ❌ | `h2o.app.license` | `RefreshLicenceIntervalInSeconds` | `43200` |
| ❌ | `h2o.app.license` | `LicenceReloadForbiddenFromHour` | `08:00` |
| ❌ | `h2o.app.license` | `LicenceReloadForbiddenUntilHour` | `19:00` |
| ✅ | `h2o.app.notification` | `PgConnectionString` | `Server=localhost;Port=5432;User Id=user;Password=password;Database=db` |
| ✅ | `h2o.app.workplace` | `PgConnectionString` | `Server=localhost;Port=5432;User Id=user;Password=password;Database=db` |
| ❌ | `h2o.app.elmar` | `GeneralAuthenticationSettingsUiEnabled` | `true` / `false` |

**Apzīmējumi:**
- ✅ = Obligāts mainīgais
- ❌ = Neobligāts mainīgais
