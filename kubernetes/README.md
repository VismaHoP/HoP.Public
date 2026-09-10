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
- Secrets Job (`hop.secretsjob.yaml`) — pēc noklusējuma tukšs, obligāti jāaizpilda **pirms** Job palaišanas

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
   kubectl apply -f hop.secretsjob.yaml
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

Ja HoP darbojas virtuālajā mašīnā un izmantotā virtualizācijas platforma to atbalsta, pirms atjaunināšanas ieteicams izveidot virtuālās mašīnas kontrolpunktu (checkpoint) vai momentuzņēmumu (snapshot).

Pirms `hop.secretsjob.yaml` palaišanas — obligāti izveidojam backup, lai būtu no kā atjaunoties,
ja process neizdodas vai secrets pēc tam pazūd no klastera:

```bash
DATE=$(date +%Y%m%d)

kubectl exec deploy/postgres -- pg_dump -U h2ouser -Fc h2o > backup-db-$DATE.dump
kubectl exec deploy/postgres -- pg_dumpall -U h2ouser --roles-only > backup-roles-$DATE.sql
kubectl get secret -o name | grep '^secret/hop-secrets-' | xargs -r kubectl get -o yaml > backup-secrets-$DATE.yaml
```

Pēc rezerves kopiju izveides pārliecinieties, ka visi backup faili ir veiksmīgi izveidoti un pieejami pašreizējā darba mapē.

Atjaunošanas gadījumā šīs rezerves kopijas jāizmanto kā viena komplekta kopijas no viena laika punkta — citādi datubāzes dati, PostgreSQL lomu paroles un Kubernetes secrets var savstarpēji neatbilst.

**Piezīme:** `backup-secrets-*.yaml` satur darba secrets Base64 kodējumā (nevis šifrētus) — glabājiet kā sensitīvu failu.
Neizmantojiet to tieši ar `kubectl apply` (satur novecojušu `resourceVersion`/`uid` u.c. metadatus) — pārbaudiet atjaunošanas procedūru iepriekš.

1. Sagatavojam jaunās versijas manifestus, bet vēl neveicam `apply`.
2. Palaižam secrets Job un gaidām tā veiksmīgu pabeigšanu:
   ```bash
   kubectl delete job hop-secrets-job --ignore-not-found --wait && \
   kubectl apply -f hop.secretsjob.yaml && \
   kubectl wait --for=condition=complete job/hop-secrets-job --timeout=300s
   ```
3. Pielietojam manifestus:
   ```bash
   kubectl apply -k .
   ```
4. Restartējam visus mikroservisus, kuri izmanto `hop-secrets-*`:
   ```bash
   kubectl get deployments -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.template.spec.volumes[*].secret.secretName}{"\n"}{end}' \
     | awk '/hop-secrets-/ {print $1}' \
     | xargs -r -n1 kubectl rollout restart deployment
   ```

### Ja lomu paroles netiek rotētas

Ja `PgConnectionString` lietotājam trūkst tiesību, Job'a logos (`kubectl logs job/hop-secrets-job`) parādās
`Cannot alter role '<role>' — skipping password rotation.` — Job turpina darboties, tikai šī loma paliek nerotēta.

PostgreSQL administratoram (superuser) jāizpilda šādas komandas (aizvietojot `h2ouser` ar `PgConnectionString` lietotāju):

```sql
GRANT h2o_quartz TO h2ouser WITH ADMIN OPTION;
GRANT h2o_sys_notify TO h2ouser WITH ADMIN OPTION;
GRANT h2o_hangfire TO h2ouser WITH ADMIN OPTION;
```

Pēc tam atkārtoti izpildiet visus atjaunināšanas soļus iepriekš (Job → `apply -k .` → `rollout restart`).

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
| ✅ | `hop.secretsjob` | `PgConnectionString` | `Server=localhost;Port=5432;User Id=user;Password=password;Database=db` |
| ❌ | `h2o.app.elmar` | `GeneralAuthenticationSettingsUiEnabled` | `true` / `false` |

**Apzīmējumi:**
- ✅ = Obligāts mainīgais
- ❌ = Neobligāts mainīgais
