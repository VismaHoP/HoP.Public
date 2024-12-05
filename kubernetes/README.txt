Privātais ECR reģistrs tiek izmantots kā pagaidu risinājums.
Lai veiksmīgi lejupielādēt images no AWS privātā ECR reģistra nepieciešams konfigurēt credentials, kuri ir nosūtīti.
Lai veiksmīgi autorizēties pret ECR ir nepieciešams izmantot "laicīgu" tokenu. Piemērs ar docker login.
https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html

SVARĪGI:
Yaml failos privātais repo ir aizvietots ar "${registryURL}", to nepieciešams find/replace visos failos uz vērtību, kura ir nosūtīta privāti.
Gateway un Database mikroservisu yaml failus jāpapildina/jānomaina ar nosūtīto PgConnectionString.
Pirmo reizi startējot HoP ir nepieciešams ievērot sekojošu secību (šis attiecas tikai uz gadījumu, kad HoP tiek startēts pirmo reizi):
1. Startējam Postgres (pg_ecr.yaml)
2. Startējam h2o.app.database.yaml
3. Startējam h2o.app.auth.yaml
4. Pēc +/- 2min startējam h2o.app.gateway.yaml
5. Var startēt visus atlikušos mikroservisus.

Pieeju pie HoP nodrošina H2O.Web mikroserviss, kurš pēc noklusējuma pieejams uz 80 porta. Lai izmantotu HoP jāizmanto/jāpublicē šis mikroserviss/ports.

Keycloak:
Lai iespējotu Keycloak h2o.app.auth mikroservisa yaml failā nepieciešams parametru EnableKeycloakAuthenticationMethod: 'false' uzstādīt uz 'true'