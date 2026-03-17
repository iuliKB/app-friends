import { useState } from 'react';

export function useNetworkStatus() {
  const [isConnected] = useState(true);
  return { isConnected };
}
