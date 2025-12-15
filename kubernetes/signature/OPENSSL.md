# Signature Microservices - Key Generation Guide

## Overview

Signature mikroservisi savā starpā izmanto asimetrisko JWT autorizāciju (Private/Public keys) ar simetrisko payload kriptēšanu (EncryptionKey).

## Key Requirements

Katrai videi jāģenerē savs komplekts ar atslēgām, ievērojot ka:

- **Private key** ir RSA 2048 PKCS#1 (-traditional)
- **Public key** arī ir PKCS#1 formāta (-RSAPublicKey)
- **Encryption key** ir 24 baitu gara

## Key Generation Commands

Atslēgu ģenerācijai var izmantot sekojošās komandas (openssl for windows):

### Client
```bash
openssl genrsa -traditional -out .\Signature.Client.private.key 2048
openssl rsa -in .\Signature.Client.private.key -RSAPublicKey_out -out .\Signature.Client.public.key
```

### Authorize
```bash
openssl genrsa -traditional -out .\Signature.Authorize.private.key 2048
openssl rsa -in .\Signature.Authorize.private.key -RSAPublicKey_out -out .\Signature.Authorize.public.key
```

### Worker
```bash
openssl genrsa -traditional -out .\Signature.Worker.private.key 2048
openssl rsa -in .\Signature.Worker.private.key -RSAPublicKey_out -out .\Signature.Worker.public.key
```

### Integration
```bash
openssl genrsa -traditional -out .\Signature.Integration.private.key 2048
openssl rsa -in .\Signature.Integration.private.key -RSAPublicKey_out -out .\Signature.Integration.public.key
```

### Person
```bash
openssl genrsa -traditional -out .\Signature.Person.private.key 2048
openssl rsa -in .\Signature.Person.private.key -RSAPublicKey_out -out .\Signature.Person.public.key
```

### Configuration
```bash
openssl genrsa -traditional -out .\Signature.Configuration.private.key 2048
openssl rsa -in .\Signature.Configuration.private.key -RSAPublicKey_out -out .\Signature.Configuration.public.key
```

### Encryption Key
```bash
openssl rand -base64 24 > .\Encryption.key
```

## Configuration

Encyption key, paša servisa Private key, un citu servisu Public keys jānorāda appsettings.json failā:

```json
{
  "EncryptionKey": "<encryption key>",
  "PrivateKey": "<private key>",
  "Microservices": [
    {
      "Microservice": "Configuration",
      "Host": "https://localhost:7000",
      "PublicKey": "<configuration public key>"
    },
    {
      "Microservice": "Client",
      "Host": "https://localhost:7001",
      "PublicKey": "<client public key>"
    },
    {
      "Microservice": "Person",
      "Host": "https://localhost:7002",
      "PublicKey": "<person public key>"
    },
    {
      "Microservice": "Worker",
      "Host": "https://localhost:7003",
      "PublicKey": "<worker public key>"
    },
    {
      "Microservice": "Authorization",
      "Host": "https://localhost:7004",
      "PublicKey": "<authorization public key>"
    },
    {
      "Microservice": "Integration",
      "Host": "https://localhost:7005",
      "PublicKey": "<integration public key>"
    }
  ]
}
```