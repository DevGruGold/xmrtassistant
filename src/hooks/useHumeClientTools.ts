import { useState, useCallback } from 'react';
import { useEnhancedHumeClientTools } from '@/services/enhancedHumeClientTools';

interface MiningStats {
  hash: number;
  validShares: number;
  invalidShares: number;
  lastHash: number;
  totalHashes: number;
  amtDue: number;
  amtPaid: number;
  txnCount: number;
  isOnline: boolean;
}

// Enhanced hook that uses the new comprehensive client tools
export const useHumeClientTools = () => {
  // Use the enhanced client tools with full ecosystem capabilities
  return useEnhancedHumeClientTools();
};