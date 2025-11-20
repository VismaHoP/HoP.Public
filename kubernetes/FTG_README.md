# FTG Micro

FTG micro, atšķirībā no citiem micro, izmanto skd image, jo ir nepieciešams papildus tools:

- `mcr.microsoft.com/dotnet/sdk:8.0-alpine3.22`
- https://github.com/stylianosnicoletti/dotnet-certificate-tool/tree/master

lai novietotu/nokonfigurētu sertifikātu korekti.

## Darbības princips

Šis micro startējoties izpilda `entrypoint.sh` skriptu, kurš meklē `/app/certificate` mikroservisa mapē sertifikātu. Ja to atrod, tad instalē/novieto nepieciešamajā vietā, rezultātus drukājot konsolē. Kad tas izdarīts, startējas mikroserviss.

## Sertifikāta konfigurācija

Mikroservisam svarīgi ir norādīt sertifikāta thumbprint un paroli. Sertifikāta formātam jābūt **pfx**. Sertifikāts ir vai nu jākopē iekšā konteinerī pie katras startēšanās, vai arī "piemauntot" klāt, lai katru reizi startējoties konteinerim tas ir atrodams `certificate` mapē.

### Vides mainīgie

Svarīgi ir norādīt sekojošos vides mainīgos konteinerim:

- **X509SsoThumbprint** - sertifikāta thumbprint, kuru izmantot HorizonWeb integrācijai, kā arī licences ielādei. Bez šī neizdosies ielādēt licenci/strādāt ar HoP.
- **CERT_NAME** - sertifikāta nosaukums, kurš atrodas `/app/certificate` mapē
- **CERT_PASSWORD** - parole šim sertifikātam

Nepieciešamības gadījumā klients var mauntot savu `entrypoint.sh` skriptu `/app/entrypoint.sh` mapē (konteinerī).

**SVARĪGI** - sertifikāta nosaukumā izmantot lowercase.

### Piemērs

```
X509SsoThumbprint=0d067f7004205c406e111100c19f9c
CERT_NAME=0d067f7004205c406e111100c19f9c.pfx
CERT_PASSWORD=pass
```

## entrypoint.sh skripts

```bash
#!/bin/sh
# Check if certificate folder exists
if [ -d "certificate" ]; then
    echo "Certificate folder found, checking for certificates..."
    # Check if there are any files in the certificate folder
    if [ "$(ls -A certificate)" ]; then
        echo "Certificate files found in certificate folder"
        certificate-tool add --file ./certificate/$CERT_NAME --password $CERT_PASSWORD --store-name 6 --store-location 1
    else
        echo "Certificate folder exists but is empty"
        echo "Skipping certificate-dependent operations"
    fi
else
    echo "Certificate folder not found"
    echo "Skipping certificate-dependent operations"
fi

exec "$@"
```

## Docker Compose/Swarm piemērs

```yaml
services:
  ftg:
    image: h2o.app.ftg:661
    environment:
      - H2OGateWay=https://gateway.address/
      - H2OApplicationHost=http://0.0.0.0:9002/
      - FtgRestServerUrl=http://x.x.x.x:88/rest
      - X509SsoThumbprint=0d067f7004205c406e111100c19f9c
      - CERT_NAME=0d067f7004205c406e111100c19f9c.pfx
      - CERT_PASSWORD=pass
      - LogFileMinLevel=Trace
    volumes:
      - /tmp/certificates:/app/certificate
```

## Kubernetes konfigurācija

### 1. ConfigMap izveide sertifikātam

Vispirms jāizveido configmap sertifikātam, kuru nepieciešams "piemauntot" konteinerim startējoties:

```bash
kubectl create configmap ftgcert --from-file 0d067f7004205c406e111100c19f9c.pfx
```

**SVARĪGI** - mape `/app/certificate` by-default konteinerī neeksistē, mountojot tā tiek izveidota. Ja viss ir izdarīts korekti un cert instalācijas logi konsolē nav atrodami, jāpārliecinās, ka mape tiek izveidota mauntojot sertifikātu.

### 2. Alternatīva - Entrypoint override

Ir iespējams veidot override entrypoint un sertifikātu kopēt, kad micro startējas. Piemērs, kad fails tiek kopēts no S3 (vispirms tiek veidota mape):

```json
"entryPoint": [
  "sh",
  "-c",
  "mkdir certificate && aws s3 cp s3://x-x-x/omega/test/xxxx.pfx ./certificate && /app/entrypoint.sh && dotnet h2o.app.ftg.dll"
]
```

### 3. Pilns Kubernetes YAML piemērs

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ftg
spec:
  selector:
    app: ftg
  ports:
    - port: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ftg
  labels:
    app: ftg
spec:
  selector:
    matchLabels:
      app: ftg
  template:
    metadata:
      labels:
        app: ftg
    spec:
      containers:
        - name: ftg
          image: xx.dkr.ecr.xxx.xx.com/h2o.app.ftg:latest
          env:
            - name: H2OGateWay
              valueFrom:
                configMapKeyRef:
                  name: ftg
                  key: H2OGateWay
            - name: H2OApplicationHost
              valueFrom:
                configMapKeyRef:
                  name: ftg
                  key: H2OApplicationHost
            - name: ListenUrls__0
              valueFrom:
                configMapKeyRef:
                  name: ftg
                  key: ListenUrls
            - name: LogFileMinLevel
              valueFrom:
                configMapKeyRef:
                  name: ftg
                  key: LogFileMinLevel
            - name: LogFileDirectory
              valueFrom:
                configMapKeyRef:
                  name: ftg
                  key: LogFileDirectory
            - name: X509SsoThumbprint
              valueFrom:
                configMapKeyRef:
                  name: ftg
                  key: X509SsoThumbprint
            - name: CERT_NAME
              valueFrom:
                configMapKeyRef:
                  name: ftg
                  key: CERT_NAME
            - name: CERT_PASSWORD
              valueFrom:
                configMapKeyRef:
                  name: ftg
                  key: CERT_PASSWORD
            - name: FtgRestServerUrl
              valueFrom:
                configMapKeyRef:
                  name: ftg
                  key: FtgRestServerUrl
          readinessProbe:
            httpGet:
              path: /api/microservice/health/live
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
          livenessProbe:
            httpGet:
              path: /api/microservice/health/live
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
          volumeMounts:
            - name: ftgcert
              mountPath: /app/certificate/0d067f7004205c406e111100c19f9c.pfx
              subPath: 0d067f7004205c406e111100c19f9c.pfx
      volumes:
        - name: ftgcert
          configMap:
            name: ftgcert
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ftg
data:
  H2OGateWay: 'http://gateway:8080/'
  ListenUrls: 'http://0.0.0.0:8080/'
  H2OApplicationHost: 'http://ftg:8080'
  LogFileMinLevel: 'Info'
  LogFileDirectory: '/var/log/hop'
  X509SsoThumbprint: '0d067f7004205c406e111100c19f9c'
  CERT_NAME: '0d067f7004205c406e111100c19f9c.pfx'
  CERT_PASSWORD: 'pass'
  FtgRestServerUrl: 'http://x.x.x.x:88/rest'
```
