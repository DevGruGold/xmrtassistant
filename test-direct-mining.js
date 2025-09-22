// Test script for DirectMiningService
import axios from 'axios';

const WALLET_ADDRESS = '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzDQtNLf2bsp2DX2qCCgC5mg';
const SUPPORTXMR_API = 'https://www.supportxmr.com/api';

async function testMiningAPI() {
  console.log('🧪 Testing Direct Mining API Connection...');

  try {
    console.log('📡 Testing miner stats endpoint...');
    const minerUrl = `${SUPPORTXMR_API}/miner/${WALLET_ADDRESS}/stats`;
    const minerResponse = await axios.get(minerUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'XMRT-DAO/1.0',
        'Accept': 'application/json'
      }
    });

    console.log('✅ Miner stats response:', {
      status: minerResponse.status,
      hashrate: minerResponse.data?.hash || 0,
      validShares: minerResponse.data?.validShares || 0,
      amountDue: (minerResponse.data?.amtDue || 0) / 1e12,
      totalHashes: minerResponse.data?.totalHashes || 0
    });

  } catch (error) {
    console.error('❌ Miner stats error:', error.message);
  }

  try {
    console.log('📡 Testing pool stats endpoint...');
    const poolUrl = `${SUPPORTXMR_API}/pool/stats`;
    const poolResponse = await axios.get(poolUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'XMRT-DAO/1.0',
        'Accept': 'application/json'
      }
    });

    console.log('✅ Pool stats response:', {
      status: poolResponse.status,
      poolHashrate: poolResponse.data?.pool_statistics?.hashRate || 0,
      miners: poolResponse.data?.pool_statistics?.miners || 0,
      networkDifficulty: poolResponse.data?.network?.difficulty || 0
    });

  } catch (error) {
    console.error('❌ Pool stats error:', error.message);
  }
}

testMiningAPI();
