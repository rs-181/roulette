export interface SimUser {
  id: string;
  displayName: string;
  isGuest: boolean;
  tokenBalance: number;
  createdAt: string;
  lastActive: string;
}

export interface SpinLogEntry {
  id: string;
  userId: string;
  result: number;
  color: "red" | "black" | "green";
  totalStaked: number;
  totalReturned: number;
  netChange: number;
  timestamp: string;
}

export interface ConsentLogEntry {
  id: string;
  userId: string | null;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  termsVersion: string;
}

export interface BalanceAdjustment {
  id: string;
  targetUserId: string;
  previousBalance: number;
  newBalance: number;
  reason: string;
  adjustedBy: string;
  timestamp: string;
}
