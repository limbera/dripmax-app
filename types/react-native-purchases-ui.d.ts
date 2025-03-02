import { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import React from 'react';

declare module 'react-native-purchases-ui' {
  export enum PAYWALL_RESULT {
    PURCHASED = 'PURCHASED',
    RESTORED = 'RESTORED',
    CANCELLED = 'CANCELLED',
    ERROR = 'ERROR',
    NOT_PRESENTED = 'NOT_PRESENTED'
  }

  export interface PaywallOptions {
    offering?: PurchasesOffering;
  }

  export interface PresentPaywallOptions extends PaywallOptions {
    requiredEntitlementIdentifier?: string;
  }

  export interface PaywallProps {
    options?: PaywallOptions;
    onDismiss?: () => void;
    onPurchaseStarted?: () => void;
    onPurchaseCompleted?: (data: { customerInfo: CustomerInfo }) => void;
    onPurchaseError?: (error: Error) => void;
    onPurchaseCancelled?: () => void;
    onRestoreStarted?: () => void;
    onRestoreCompleted?: (data: { customerInfo: CustomerInfo }) => void;
    onRestoreError?: (error: Error) => void;
  }

  export interface RevenueCatUI {
    presentPaywall: (options?: PaywallOptions) => Promise<PAYWALL_RESULT>;
    presentPaywallIfNeeded: (options: PresentPaywallOptions) => Promise<PAYWALL_RESULT>;
    Paywall: React.FC<PaywallProps>;
  }

  const RevenueCatUI: RevenueCatUI;
  export default RevenueCatUI;
} 