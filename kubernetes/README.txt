Privātais ECR reģistrs tiek izmantots kā pagaidu risinājums.
Lai veiksmīgi lejupielādēt images no AWS privātā ECR reģistra nepieciešams konfigurēt credentials, kuri ir nosūtīti.
Lai veiksmīgi autorizēties pret ECR ir nepieciešams izmantot "laicīgu" tokenu. Piemērs ar docker login.
https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html

SVARĪGI:
Gateway yaml failā nepieciešams aizpildīt ExternalH2OApplicationHost kurš satur adresi, kurā pieejams GateWay micro.
Yaml failos privātais repo ir aizvietots ar "${registryURL}", to nepieciešams find/replace visos failos uz vērtību, kura ir nosūtīta privāti.
Gateway, Database, Notification un Workplace mikroservisu yaml failus jāpapildina/jānomaina ar nosūtīto PgConnectionString.
Pirmo reizi startējot HoP ir nepieciešams ievērot sekojošu secību (šis attiecas tikai uz gadījumu, kad HoP tiek startēts pirmo reizi):
1. Startējam Postgres (pg_ecr.yaml)
2. Startējam h2o.app.database.yaml
3. Startējam h2o.app.auth.yaml
4. Pēc +/- 2min startējam h2o.app.gateway.yaml
5. Var startēt visus atlikušos mikroservisus.

Pieeju pie HoP nodrošina H2O.Web mikroserviss, kurš pēc noklusējuma pieejams uz 80 porta. Lai izmantotu HoP jāizmanto/jāpublicē šis mikroserviss/ports.

Keycloak:
Lai iespējotu Keycloak h2o.app.auth mikroservisa yaml failā nepieciešams parametru EnableKeycloakAuthenticationMethod: 'false' uzstādīt uz 'true'

Acquaint:
Nepieciešams aizpildīt PgConnectionString un SignaturePlatformHost.

LogFailu atrašanās vietas konfigurācija:
Lai mainītu noklusēto log failu attrašanās vietu konteinerī, jāuzstāda env parametrs LogFileDirectory, piemēram, /opt/hop/logs.

| Command | Description |
| --- | --- |
| git status | List all new or modified files |
| git diff | Show file differences that haven't been staged |

Common environmental variables:
| Variable  | Value |
| ------------- | ------------- |
| LogFileMinLevel  | Info/Warn/Trace/Debug/Error/Fatal  |
| LogFileDirectory  | /var/log/hop  |

Micro specific environmental variables:
| Microservice | Variable  | Value |
| h2o.app.acquaint |PgConnectionString  | Server=localhost;Port=5432;User Id=user;Password=change-this-to-new-password;Database=db  |
| h2o.app.attachment | AllowedFileExtensions  | txt,pdf,rtf,doc,docx,docm,docb,xls,xlsx,xlsm,xlsxb,ppt,pps,pptx,pptm,ppsx,sldx,sldm,jpg,jpeg,png,gif,tif,tiff,bmp,ico,edoc |
| h2o.app.attachment | GetMagicNumbersFromConfiguration | true/false |
| h2o.app.attachment | MagicNumbersForConfiguredFileExtensions | ${value} |
| h2o.app.antra.license | IsLicenseReloadEnabled | true/false |
| h2o.app.auth | IsLicenseReloadEnabled | true/false |
| h2o.app.auth | EnableKeycloakAuthenticationMethod|true/false |
| h2o.app.auth | AllowExternalUserIdMismatch|true/false |
| h2o.app.auth | AutoAssignClientId|true/false |
| h2o.app.database |PgConnectionString | Server=localhost;Port=5432;User Id=user;Password=change-this-to-new-password;Database=db  |
| h2o.app.gateway | PgConnectionString | Server=localhost;Port=5432;User Id=user;Password=change-this-to-new-password;Database=db  |
| h2o.app.gateway | AutoAssignClientId | true/false |
|h2o.app.license|RefreshLicenceIntervalInSeconds|43200|
|h2o.app.license|LicenceReloadForbiddenFromHour|08:00|
|h2o.app.license|LicenceReloadForbiddenUntilHour|19:00|
|h2o.app.notification|PgConnectionString|Server=localhost;Port=5432;User Id=user;Password=change-this-to-new-password;Database=db|
|h2o.app.workplace|PgConnectionString|Server=localhost;Port=5432;User Id=user;Password=change-this-to-new-password;Database=db|