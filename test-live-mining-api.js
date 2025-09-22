#!/usr/bin/env node

// Simple test for DirectMiningService functionality
const axios = require('axios');

const WALLET_ADDRESS = '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzDQtNLf2bsp2DX2qCCgC5mg';
const API_BASE = 'https://supportxmr.com/api';

async function testMiningAPI() {
  console.log('🧪 Testing Direct Mining API Integration\n');

  try {
    // Test miner stats
    console.log('1️⃣ Testing miner stats API...');
    const minerURL = `${API_BASE}/miner/${WALLET_ADDRESS}/stats`;
    console.log(`   URL: ${minerURL}`);

    const minerResponse = await axios.get(minerURL, { timeout: 10000 });
    console.log('   ✅ Miner API Response:', minerResponse.status);
    console.log('   📊 Miner Data:', JSON.stringify(minerResponse.data, null, 2));

    // Test pool stats
    console.log('\n2️⃣ Testing pool stats API...');
    const poolURL = `${API_BASE}/pool/stats`;
    console.log(`   URL: ${poolURL}`);

    const poolResponse = await axios.get(poolURL, { timeout: 10000 });
    console.log('   ✅ Pool API Response:', poolResponse.status);
    console.log('   🏊 Pool Hashrate:', (poolResponse.data.pool_statistics.hashRate / 1e6).toFixed(2), 'MH/s');
    console.log('   👥 Pool Miners:', poolResponse.data.pool_statistics.miners.toLocaleString());
    console.log('   🎯 Blocks Found:', poolResponse.data.pool_statistics.totalBlocksFound.toLocaleString());

    console.log('\n🎉 All API tests passed! Mining feed is working correctly.');

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    if (error.response) {
      console.error('   Response Status:', error.response.status);
      console.error('   Response Data:', error.response.data);
    }
  }
}

testMiningAPI();
