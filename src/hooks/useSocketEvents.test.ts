import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSocketEvents, emitNfcTap, emitFlowAdvance, emitFlowDelay, emitCallPatient, emitChatBroadcast, emitKioskHeartbeat } from './useSocketEvents';
import { getSocket } from '../lib/socketClient';

// Mock socket client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('../lib/socketClient', () => ({
  getSocket: vi.fn(() => mockSocket),
}));

describe('useSocketEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register flow:step-changed event handler', () => {
    const onFlowStepChanged = vi.fn();
    
    renderHook(() => useSocketEvents({ onFlowStepChanged }));

    expect(mockSocket.on).toHaveBeenCalledWith('flow:step-changed', onFlowStepChanged);
  });

  it('should register flow:delay-update event handler', () => {
    const onFlowDelayUpdate = vi.fn();
    
    renderHook(() => useSocketEvents({ onFlowDelayUpdate }));

    expect(mockSocket.on).toHaveBeenCalledWith('flow:delay-update', onFlowDelayUpdate);
  });

  it('should register navigation:guide event handler', () => {
    const onNavigationGuide = vi.fn();
    
    renderHook(() => useSocketEvents({ onNavigationGuide }));

    expect(mockSocket.on).toHaveBeenCalledWith('navigation:guide', onNavigationGuide);
  });

  it('should register checkout:ready event handler', () => {
    const onCheckoutReady = vi.fn();
    
    renderHook(() => useSocketEvents({ onCheckoutReady }));

    expect(mockSocket.on).toHaveBeenCalledWith('checkout:ready', onCheckoutReady);
  });

  it('should register feedback:escalation event handler', () => {
    const onFeedbackEscalation = vi.fn();
    
    renderHook(() => useSocketEvents({ onFeedbackEscalation }));

    expect(mockSocket.on).toHaveBeenCalledWith('feedback:escalation', onFeedbackEscalation);
  });

  it('should register payment:status event handler', () => {
    const onPaymentStatus = vi.fn();
    
    renderHook(() => useSocketEvents({ onPaymentStatus }));

    expect(mockSocket.on).toHaveBeenCalledWith('payment:status', onPaymentStatus);
  });

  it('should register chat:broadcast:received event handler', () => {
    const onChatBroadcast = vi.fn();
    
    renderHook(() => useSocketEvents({ onChatBroadcast }));

    expect(mockSocket.on).toHaveBeenCalledWith('chat:broadcast:received', onChatBroadcast);
  });

  it('should register nfc:tap:event event handler', () => {
    const onNfcTapEvent = vi.fn();
    
    renderHook(() => useSocketEvents({ onNfcTapEvent }));

    expect(mockSocket.on).toHaveBeenCalledWith('nfc:tap:event', onNfcTapEvent);
  });

  it('should not register handlers that are not provided', () => {
    renderHook(() => useSocketEvents({}));

    expect(mockSocket.on).not.toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const onFlowStepChanged = vi.fn();
    const onChatBroadcast = vi.fn();
    
    const { unmount } = renderHook(() => 
      useSocketEvents({ onFlowStepChanged, onChatBroadcast })
    );

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('flow:step-changed', onFlowStepChanged);
    expect(mockSocket.off).toHaveBeenCalledWith('chat:broadcast:received', onChatBroadcast);
  });

  it('should handle multiple event handlers at once', () => {
    const handlers = {
      onFlowStepChanged: vi.fn(),
      onFlowDelayUpdate: vi.fn(),
      onNavigationGuide: vi.fn(),
    };
    
    renderHook(() => useSocketEvents(handlers));

    expect(mockSocket.on).toHaveBeenCalledTimes(3);
    expect(mockSocket.on).toHaveBeenCalledWith('flow:step-changed', handlers.onFlowStepChanged);
    expect(mockSocket.on).toHaveBeenCalledWith('flow:delay-update', handlers.onFlowDelayUpdate);
    expect(mockSocket.on).toHaveBeenCalledWith('navigation:guide', handlers.onNavigationGuide);
  });
});

describe('Socket Event Emitters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit nfc:tap event', () => {
    emitNfcTap('location-1', 'praxis-1', 'signature-123', 1234567890);

    expect(mockSocket.emit).toHaveBeenCalledWith('nfc:tap', {
      locationId: 'location-1',
      praxisId: 'praxis-1',
      signature: 'signature-123',
      timestamp: 1234567890,
    });
  });

  it('should emit flow:advance event', () => {
    emitFlowAdvance('session-123', 1, 2, 'patient completed step');

    expect(mockSocket.emit).toHaveBeenCalledWith('flow:advance', {
      sessionId: 'session-123',
      fromStep: 1,
      toStep: 2,
      reason: 'patient completed step',
    });
  });

  it('should emit flow:advance event without reason', () => {
    emitFlowAdvance('session-123', 1, 2);

    expect(mockSocket.emit).toHaveBeenCalledWith('flow:advance', {
      sessionId: 'session-123',
      fromStep: 1,
      toStep: 2,
      reason: undefined,
    });
  });

  it('should emit flow:delay event', () => {
    emitFlowDelay('session-123', 15, 'Arzt wird verzögert');

    expect(mockSocket.emit).toHaveBeenCalledWith('flow:delay', {
      sessionId: 'session-123',
      delayMinutes: 15,
      reason: 'Arzt wird verzögert',
    });
  });

  it('should emit flow:call-patient event', () => {
    emitCallPatient('session-123', 'Room 3', 'Bitte kommen Sie zu Raum 3');

    expect(mockSocket.emit).toHaveBeenCalledWith('flow:call-patient', {
      sessionId: 'session-123',
      targetRoom: 'Room 3',
      message: 'Bitte kommen Sie zu Raum 3',
    });
  });

  it('should emit flow:call-patient event without message', () => {
    emitCallPatient('session-123', 'Room 1');

    expect(mockSocket.emit).toHaveBeenCalledWith('flow:call-patient', {
      sessionId: 'session-123',
      targetRoom: 'Room 1',
      message: undefined,
    });
  });

  it('should emit chat:broadcast event to waiting', () => {
    emitChatBroadcast('Willkommen in der Praxis', 'waiting', 'praxis-1');

    expect(mockSocket.emit).toHaveBeenCalledWith('chat:broadcast', {
      message: 'Willkommen in der Praxis',
      target: 'waiting',
      praxisId: 'praxis-1',
    });
  });

  it('should emit chat:broadcast event to all', () => {
    emitChatBroadcast('Allgemeine Nachricht', 'all', 'praxis-1');

    expect(mockSocket.emit).toHaveBeenCalledWith('chat:broadcast', {
      message: 'Allgemeine Nachricht',
      target: 'all',
      praxisId: 'praxis-1',
    });
  });

  it('should emit kiosk:heartbeat event', () => {
    emitKioskHeartbeat('kiosk-1', 'online');

    expect(mockSocket.emit).toHaveBeenCalledWith('kiosk:heartbeat', {
      kioskId: 'kiosk-1',
      status: 'online',
    });
  });

  it('should emit kiosk:heartbeat with error status', () => {
    emitKioskHeartbeat('kiosk-1', 'error');

    expect(mockSocket.emit).toHaveBeenCalledWith('kiosk:heartbeat', {
      kioskId: 'kiosk-1',
      status: 'error',
    });
  });
});
