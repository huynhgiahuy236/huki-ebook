/**
 * Test script to audit Docker environment configurations for UAT and Production.
 * Specifically checks the environment block of each service.
 */
const fs = require('fs');
const path = require('path');

function getServiceBlock(composeContent, serviceName) {
  const serviceRegex = new RegExp(`^\\s{2}${serviceName}:\\s*$`, 'm');
  const match = serviceRegex.exec(composeContent);
  if (!match) return null;
  const startIndex = match.index;
  // Next service starts with two spaces and a word followed by colon
  const nextServiceRegex = /^\s{2}[a-zA-Z0-9_-]+:\s*$/gm;
  nextServiceRegex.lastIndex = startIndex + match[0].length;
  const nextMatch = nextServiceRegex.exec(composeContent);
  const endIndex = nextMatch ? nextMatch.index : composeContent.length;
  return composeContent.slice(startIndex, endIndex);
}

function checkEnv() {
  const uatComposePath = path.resolve(__dirname, '../../docker-compose.uat.yml');
  const prodComposePath = path.resolve(__dirname, '../../docker-compose.prod.yml');

  console.log('=== DOCKER CONFIGURATION AUDIT FOR UAT & PROD ===\n');

  if (fs.existsSync(uatComposePath)) {
    const uatContent = fs.readFileSync(uatComposePath, 'utf8');
    const promoBlock = getServiceBlock(uatContent, 'promotion-service-uat');
    const bizBlock = getServiceBlock(uatContent, 'business-service-uat');

    console.log('--- docker-compose.uat.yml ---');
    console.log('1. [promotion-service-uat] BUSINESS_DATABASE_URL:', 
      promoBlock && promoBlock.includes('BUSINESS_DATABASE_URL') ? 'CONFIGURED' : 'MISSING (Root Cause: Empty seller vouchers query)');
    console.log('2. [promotion-service-uat] COMMERCE_SERVICE_URL:', 
      promoBlock && promoBlock.includes('COMMERCE_SERVICE_URL') ? 'CONFIGURED' : 'MISSING (Root Cause: 5s hang & "Không tìm thấy sách trong kho")');
    console.log('3. [business-service-uat] IDENTITY_DATABASE_URL:', 
      bizBlock && bizBlock.includes('IDENTITY_DATABASE_URL') ? 'CONFIGURED' : 'MISSING (Root Cause: Followers fail DB lookup, fall back to "Khách Hàng")');
  }

  if (fs.existsSync(prodComposePath)) {
    const prodContent = fs.readFileSync(prodComposePath, 'utf8');
    const promoProdBlock = getServiceBlock(prodContent, 'promotion-service');

    console.log('\n--- docker-compose.prod.yml ---');
    console.log('1. [promotion-service] BUSINESS_DATABASE_URL:', 
      promoProdBlock && promoProdBlock.includes('BUSINESS_DATABASE_URL') ? 'CONFIGURED' : 'MISSING');
    console.log('2. [promotion-service] COMMERCE_SERVICE_URL:', 
      promoProdBlock && promoProdBlock.includes('COMMERCE_SERVICE_URL') ? 'CONFIGURED' : 'MISSING');
  }
}

checkEnv();
