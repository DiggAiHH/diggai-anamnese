// ─── useSocketEvents — Modul 7/8 Socket.IO Hook ─────────────
// Subscribes to real-time flow/chat/payment/feedback events

import { useEffect } from 'react';
import { getSocket } from '../lib/socketClient';

// ─── Event Payload Types ─────────────────────────────────────

export interface FlowStepChangedPayload {
  sessionId: string;
  currentStep: number;
  fromStep?: number;
  roomName?: string;
  instructions?: unknown;
  reason?: string;
  changedAt: string;
}

export interface FlowDelayUpdatePayload {
  sessionId: string;
  delayMinutes: number;
  reason: string;
  updatedAt: string;
}

export interface NavigationGuidePayload {
  sessionId: string;
  type: 'TEXT' | 'VIDEO' | 'COLOR';
  content: string;
  pathColor?: string;
  targetRoom?: string;
  calledAt?: string;
}

export interface CheckoutReadyPayload {
  sessionId: string;
  options: string[];
}

export interface FeedbackEscalationPayload {
  feedbackId: string;
  escalationStatus: string;
}

export interface PaymentStatusPayload {
  transactionId: string;
  status: string;
  receiptUrl?: string;
}

// ─── Hook ────────────────────────────────────────────────────

export interface SocketEventHandlers {
  onFlowStepChanged?: (payload: FlowStepChangedPayload) => void;
  onFlowDelayUpdate?: (payload: FlowDelayUpdatePayload) => void;
  onNavigationGuide?: (payload: NavigationGuidePayload) => void;
  onCheckoutReady?: (payload: CheckoutReadyPayload) => void;
  onFeedbackEscalation?: (payload: FeedbackEscalationPayload) => void;
  onPaymentStatus?: (payload: PaymentStatusPayload) => void;
  onChatBroadcast?: (payload: { message: string; target: string; sentAt: string }) => void;
  onNfcTapEvent?: (payload: { locationId: string; praxisId: string; timestamp: number }) => void;
}

export function useSocketEvents(handlers: SocketEventHandlers) {
  useEffect(() => {
    const socket = getSocket();

    if (handlers.onFlowStepChanged) {
      socket.on('flow:step-changed', handlers.onFlowStepChanged);
    }
    if (handlers.onFlowDelayUpdate) {
      socket.on('flow:delay-update', handlers.onFlowDelayUpdate);
    }
    if (handlers.onNavigationGuide) {
      socket.on('navigation:guide', handlers.onNavigationGuide);
    }
    if (handlers.onCheckoutReady) {
      socket.on('checkout:ready', handlers.onCheckoutReady);
    }
    if (handlers.onFeedbackEscalation) {
      socket.on('feedback:escalation', handlers.onFeedbackEscalation);
    }
    if (handlers.onPaymentStatus) {
      socket.on('payment:status', handlers.onPaymentStatus);
    }
    if (handlers.onChatBroadcast) {
      socket.on('chat:broadcast:received', handlers.onChatBroadcast);
    }
    if (handlers.onNfcTapEvent) {
      socket.on('nfc:tap:event', handlers.onNfcTapEvent);
    }

    return () => {
      if (handlers.onFlowStepChanged) socket.off('flow:step-changed', handlers.onFlowStepChanged);
      if (handlers.onFlowDelayUpdate) socket.off('flow:delay-update', handlers.onFlowDelayUpdate);
      if (handlers.onNavigationGuide) socket.off('navigation:guide', handlers.onNavigationGuide);
      if (handlers.onCheckoutReady) socket.off('checkout:ready', handlers.onCheckoutReady);
      if (handlers.onFeedbackEscalation) socket.off('feedback:escalation', handlers.onFeedbackEscalation);
      if (handlers.onPaymentStatus) socket.off('payment:status', handlers.onPaymentStatus);
      if (handlers.onChatBroadcast) socket.off('chat:broadcast:received', handlers.onChatBroadcast);
      if (handlers.onNfcTapEvent) socket.off('nfc:tap:event', handlers.onNfcTapEvent);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Emitter helpers ─────────────────────────────────────────

export function emitNfcTap(locationId: string, praxisId: string, signature: string, timestamp: number) {
  getSocket().emit('nfc:tap', { locationId, praxisId, signature, timestamp });
}

export function emitFlowAdvance(sessionId: string, fromStep: number, toStep: number, reason?: string) {
  getSocket().emit('flow:advance', { sessionId, fromStep, toStep, reason });
}

export function emitFlowDelay(sessionId: string, delayMinutes: number, reason: string) {
  getSocket().emit('flow:delay', { sessionId, delayMinutes, reason });
}

export function emitCallPatient(sessionId: string, targetRoom: string, message?: string) {
  getSocket().emit('flow:call-patient', { sessionId, targetRoom, message });
}

export function emitChatBroadcast(message: string, target: 'waiting' | 'all', praxisId?: string) {
  getSocket().emit('chat:broadcast', { message, target, praxisId });
}

export function emitKioskHeartbeat(kioskId: string, status: string) {
  getSocket().emit('kiosk:heartbeat', { kioskId, status });
}
