
// Test script to verify mining service functionality
import { miningService } from '../services/miningService';

async function testMiningService() {
  console.log('🧪 Testing Mining Service Integration');
  console.log('=' * 50);

  try {
    // Test wallet address validation
    const walletAddress = '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg';
    const isValidWallet = miningService.isValidMoneroAddress(walletAddress);
    console.log(`✅ Wallet validation: ${isValidWallet ? 'PASS' : 'FAIL'}`);

    // Test hashrate formatting
    console.log(`✅ Hashrate formatting:
      375 H/s -> ${miningService.formatHashrate(375)}
      1500 H/s -> ${miningService.formatHashrate(1500)}
      1500000 H/s -> ${miningService.formatHashrate(1500000)}`);

    // Test XMR formatting
    const testAmount = 0.007601508330;
    console.log(`✅ XMR formatting: ${testAmount} -> ${miningService.formatXMR(testAmount)}`);

    // Test mining stats fetch
    console.log('🔄 Fetching real mining statistics...');
    const miningStats = await miningService.getMiningStats();
    console.log('✅ Mining stats received:', {
      hashrate: miningService.formatHashrate(miningStats.hashrate),
      status: miningStats.status,
      validShares: miningStats.validShares,
      amountDue: miningService.formatXMR(miningStats.amtDue),
      isOnline: miningStats.isOnline,
      efficiency: miningStats.efficiency ? `${miningStats.efficiency.toFixed(1)}%` : 'N/A'
    });

    // Test pool stats fetch
    console.log('🔄 Fetching pool statistics...');
    const poolStats = await miningService.getPoolStats();
    console.log('✅ Pool stats received:', {
      poolHashrate: miningService.formatHashrate(poolStats.poolHashrate),
      miners: poolStats.poolMiners.toLocaleString(),
      totalBlocks: poolStats.totalBlocksFound.toLocaleString()
    });

    // Test earnings calculation
    if (miningStats.hashrate > 0 && poolStats.poolHashrate > 0) {
      const earnings = miningService.calculateEstimatedEarnings(
        miningStats.hashrate, 
        poolStats.poolHashrate
      );
      console.log('✅ Estimated earnings:', {
        daily: miningService.formatXMR(earnings.daily),
        weekly: miningService.formatXMR(earnings.weekly),
        monthly: miningService.formatXMR(earnings.monthly)
      });
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMiningService();
