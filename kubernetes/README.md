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

HoP risinājumam gala lietotājiem jābūt pieejamam izmantojot HTTPS protokolu.

### Gateway Konfigurācija

Gateway `yaml` failā nepieciešams aizpildīt `ExternalH2OApplicationHost`, kurš satur adresi, kurā pieejams Gateway micro.

### Registry URL

Yaml failos privātais repo ir aizvietots ar `${registryURL}`. To nepieciešams **find/replace** visos failos uz vērtību, kura ir nosūtīta privāti.

### Datubāzes Connection String

Šādiem yaml failiem jāpapildina/jānomaina ar nosūtīto `PgConnectionString`:
- Gateway
- Database
- Notification
- Acquaint
- Workplace
- Secrets Job (`hop.secrets.job.yaml`) — pēc noklusējuma tukšs, obligāti jāaizpilda **pirms** Job palaišanas

---

## Pirmā Startēšana

Pirmo reizi startējot HoP, ir nepieciešams ievērot **sekojošu secību**:

1. **Startējam Postgres**
   ```bash
   kubectl apply -f pg_ecr.yaml
   ```

2. **Startējam Database mikroservisu**
   ```bash
   (kubectl get secret hop-secrets-database >/dev/null 2>&1 || \
     kubectl create secret generic hop-secrets-database --from-literal='appsettings.Secrets.json={}') && \
   kubectl apply -f h2o.app.database.yaml
   ```
   Sagaidāms `CrashLoopBackOff` līdz Secrets Job; nav jāgaida `Ready`.

3. **Ģenerējam un sinhronizējam secrets**
   ```bash
   kubectl apply -f hop.secrets.job.yaml
   kubectl wait --for=condition=complete job/hop-secrets-job --timeout=300s && \
   kubectl rollout restart deployment/database && \
   kubectl rollout status deployment/database --timeout=300s
   ```

4. **Startējam Auth mikroservisu**
   ```bash
   kubectl apply -f h2o.app.auth.yaml
   ```

5. **Pēc ~2 minūtēm startējam Gateway**
   ```bash
   kubectl apply -f h2o.app.gateway.yaml
   ```

6. **Startējam visus atlikušos mikroservisus**
   ```bash
   kubectl apply -k .
   ```

---

## Atjaunināšana (Upgrade)

Pirms `hop.secrets.job.yaml` atkārtotas palaišanas — obligāti izveidojam backup, lai būtu no kā atjaunoties,
ja process neizdodas vai secrets pēc tam pazūd no klastera:

```bash
pg_dump ... > backup-db-$(date +%F).sql
kubectl get secret -o name | grep '^secret/hop-secrets-' | xargs kubectl get -o yaml > backup-secrets-$(date +%F).yaml
```

Atjaunošanas gadījumā abi šie faili jāatjauno **kopā**, ne atsevišķi — citādi datubāze un secrets faili nesakrīt.

Pati atjaunināšana:

1. **Dzēšam un no jauna palaižam secrets Job, tad restartējam migrētos mikroservisus vienā komandu ķēdē**
   (Job'a `spec.template` nav maināms; `subPath` mounti nekad neatjaunojas dzīvam podam):
   ```bash
   kubectl delete job hop-secrets-job --ignore-not-found --wait && \
   kubectl apply -f hop.secrets.job.yaml && \
   kubectl wait --for=condition=complete job/hop-secrets-job --timeout=300s && \
   kubectl get deployments -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.template.spec.volumes[*].secret.secretName}{"\n"}{end}' \
     | awk '/hop-secrets-/ {print $1}' \
     | xargs -r -n1 kubectl rollout restart deployment
   ```

2. **Atjaunojam visus mikroservisus uz jauno versiju** parastajā veidā (jaunais image tags manifestos).

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
| ✅ | `hop.secrets.job` | `PgConnectionString` | `Server=localhost;Port=5432;User Id=user;Password=password;Database=db` |
| ❌ | `h2o.app.elmar` | `GeneralAuthenticationSettingsUiEnabled` | `true` / `false` |

**Apzīmējumi:**
- ✅ = Obligāts mainīgais
- ❌ = Neobligāts mainīgais
