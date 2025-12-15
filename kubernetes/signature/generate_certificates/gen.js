const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate Encryption Key (32 random characters)
function generateEncryptionKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/?()+=@$&';
  let key = '';
  const randomBytes = crypto.randomBytes(32);
  
  for (let i = 0; i < 32; i++) {
    key += chars[randomBytes[i] % chars.length];
  }
  return key;
}

// Generate RSA Key Pair in PKCS#1 format without headers
function generateRSAKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    }
  });
  
  // Remove PEM headers and newlines
  const privateKeyBase64 = privateKey
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\n/g, '')
    .trim();
    
  const publicKeyBase64 = publicKey
    .replace(/-----BEGIN RSA PUBLIC KEY-----/g, '')
    .replace(/-----END RSA PUBLIC KEY-----/g, '')
    .replace(/\n/g, '')
    .trim();
  
  return {
    privateKey: privateKeyBase64,
    publicKey: publicKeyBase64
  };
}

// Key pair names
const keyNames = [
  'signatureauthorize',
  'signatureclient',
  'signatureconfiguration',
  'signatureintegration',
  'signatureperson',
  'signatureworker'
];

// Generate all keys
const encryptionKey = generateEncryptionKey();
console.log('Encryption Key generated');

// Save encryption key
fs.writeFileSync('encryption-key.txt', encryptionKey);

// Generate 6 key pairs with specific names
keyNames.forEach((name, index) => {
  const { privateKey, publicKey } = generateRSAKeyPair();
  
  fs.writeFileSync(`${name}-private.txt`, privateKey);
  fs.writeFileSync(`${name}-public.txt`, publicKey);
  
  console.log(`✓ ${name} key pair generated`);
});

console.log('\nAll keys generated successfully!');
console.log('\nFiles created:');
console.log('- encryption-key.txt');
keyNames.forEach(name => {
  console.log(`- ${name}-private.txt`);
  console.log(`- ${name}-public.txt`);
});

// Update YAML files
console.log('\n--- Updating YAML files ---');

const yamlDir = path.join(__dirname, '..');
const yamlFiles = fs.readdirSync(yamlDir).filter(f => f.startsWith('signature') && f.endsWith('.yaml'));

console.log(`Looking for YAML files in: ${yamlDir}`);
console.log(`Found ${yamlFiles.length} signature*.yaml files`);

// Mapping: Microservice index -> key name
const microserviceMapping = {
  0: 'signatureconfiguration',
  1: 'signatureclient',
  2: 'signatureperson',
  3: 'signatureworker',
  4: 'signatureauthorize',
  5: 'signatureintegration'
};

yamlFiles.forEach(yamlFile => {
  const yamlPath = path.join(yamlDir, yamlFile);
  const serviceName = yamlFile.replace('.yaml', '');

  // Skip if not one of our services
  if (!keyNames.includes(serviceName)) {
    console.log(`⊘ Skipping ${yamlFile} (no matching keys)`);
    return;
  }

  let content = fs.readFileSync(yamlPath, 'utf8');

  // Replace EncryptionKey (matches empty or non-empty values)
  content = content.replace(
    /(EncryptionKey:\s*['"])([^'"]*)(['"])/,
    `$1${encryptionKey}$3`
  );

  // Replace PrivateKey for this service (matches empty or non-empty values)
  const privateKey = fs.readFileSync(`${serviceName}-private.txt`, 'utf8');
  content = content.replace(
    /(PrivateKey:\s*['"])([^'"]*)(['"])/,
    `$1${privateKey}$3`
  );

  // Replace Microservices 0-5 PublicKeys (matches empty or non-empty values)
  for (let i = 0; i <= 5; i++) {
    const microserviceName = microserviceMapping[i];
    const publicKey = fs.readFileSync(`${microserviceName}-public.txt`, 'utf8');

    const regex = new RegExp(
      `(Microservices__${i}__PublicKey:\\s*["\'])([^"\']*)(["\'])`,
      'g'
    );
    content = content.replace(regex, `$1${publicKey}$3`);
  }

  fs.writeFileSync(yamlPath, content, 'utf8');
  console.log(`✓ Updated ${yamlFile}`);
});

console.log('\n✓ All YAML files updated successfully!');