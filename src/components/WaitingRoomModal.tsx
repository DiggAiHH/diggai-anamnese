import React from 'react';
import { Modal } from './ui/Modal';
import { PatientWartezimmer } from './PatientWartezimmer';

interface WaitingRoomModalProps {
  /** Whether modal is open */
  open: boolean;
  
  /** Callback when user closes modal (X button or outside click) */
  onClose: () => void;
  
  /** Session ID for queue tracking */
  sessionId: string;
  
  /** Patient name for display */
  patientName: string;
  
  /** Service/reason for visit */
  service: string;
  
  /** Auth token for Socket.IO */
  token?: string;
}

/**
 * WaitingRoomModal
 * 
 * Wraps PatientWartezimmer in a dismissable modal.
 * Replaces the fixed bottom-positioned component with a centered, opaque modal
 * that users can dismiss by clicking the X button or outside the modal.
 * 
 * Socket.IO connection persists; queue updates continue in real-time.
 * Theme-aware styling (opaque backgrounds for both light & dark modes).
 */
export const WaitingRoomModal: React.FC<WaitingRoomModalProps> = ({
  open,
  onClose,
  sessionId,
  patientName,
  service,
  token,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      showCloseButton={true}
      trapFocus={true}
      className="max-w-2xl overflow-auto max-h-[90vh]"
    >
      {/* Full waiting room inside modal — styling already theme-aware */}
      <PatientWartezimmer
        sessionId={sessionId}
        patientName={patientName}
        service={service}
        token={token}
      />
    </Modal>
  );
};
