import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the service
vi.mock('../db', () => ({
  prisma: {
    agentAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { auditService, type AuditAction } from './audit.service';
import { prisma } from '../db';

describe('AuditService - HIPAA/DSGVO Compliant Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ============================================
  // Log Entry Creation Tests
  // ============================================
  describe('Log Entry Creation', () => {
    it('should create a basic audit log entry', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await auditService.log({
        agentId: 'agent-123',
        action: 'task_created',
      });

      expect(prisma.agentAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          agentId: 'agent-123',
          action: 'task_created',
        }),
      });
    });

    it('should create log with all fields', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const params = {
        agentId: 'agent-123',
        taskId: 'task-456',
        action: 'llm_called' as AuditAction,
        details: 'Called GPT-4 for triage',
        modelUsed: 'gpt-4',
        promptText: 'Analyze patient symptoms',
        tokensUsed: 150,
        latencyMs: 2500,
        decisionType: 'triage',
        confidence: 0.95,
        humanReview: false,
        ipAddress: '192.168.1.100',
      };

      await auditService.log(params);

      expect(prisma.agentAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          agentId: 'agent-123',
          taskId: 'task-456',
          action: 'llm_called',
          details: 'Called GPT-4 for triage',
          modelUsed: 'gpt-4',
          tokensUsed: 150,
          latencyMs: 2500,
          decisionType: 'triage',
          confidence: 0.95,
          humanReview: false,
        }),
      });
    });

    it('should handle all audit action types', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValue({ id: 'log-id' });

      const actions: AuditAction[] = [
        'task_created',
        'task_queued',
        'task_started',
        'llm_called',
        'decision_made',
        'task_completed',
        'task_failed',
        'task_cancelled',
        'agent_registered',
        'agent_disabled',
        'human_review_requested',
        'human_review_completed',
      ];

      for (const action of actions) {
        await auditService.log({
          agentId: 'agent-123',
          action,
        });
      }

      expect(prisma.agentAuditLog.create).toHaveBeenCalledTimes(actions.length);
    });

    it('should default humanReview to false', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await auditService.log({
        agentId: 'agent-123',
        action: 'decision_made',
      });

      expect(prisma.agentAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          humanReview: false,
        }),
      });
    });

    it('should allow humanReview to be true', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await auditService.log({
        agentId: 'agent-123',
        action: 'human_review_requested',
        humanReview: true,
        humanReviewBy: 'dr-mustermann',
      });

      expect(prisma.agentAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          humanReview: true,
          humanReviewBy: 'dr-mustermann',
        }),
      });
    });

    it('should not throw when logging fails (fail-safe)', async () => {
      (prisma.agentAuditLog.create as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        auditService.log({
          agentId: 'agent-123',
          action: 'task_created',
        })
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        '[AuditService] Fehler beim Schreiben des Audit-Logs:',
        expect.any(Error)
      );
    });
  });

  // ============================================
  // PII Masking Tests (DSGVO/HIPAA Compliance)
  // ============================================
  describe('PII Masking (DSGVO/HIPAA Compliance)', () => {
    it('should hash promptText instead of storing plaintext', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const promptText = 'Patient Müller has symptoms...';
      await auditService.log({
        agentId: 'agent-123',
        action: 'llm_called',
        promptText,
      });

      const callArgs = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.promptHash).toBeDefined();
      expect(callArgs.data.promptHash).not.toBe(promptText);
      expect(callArgs.data.promptHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should produce consistent hash for same prompt', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValue({ id: 'log-id' });

      const promptText = 'Analyze patient data';
      
      await auditService.log({ agentId: 'agent-1', action: 'llm_called', promptText });
      await auditService.log({ agentId: 'agent-2', action: 'llm_called', promptText });

      const call1 = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      const call2 = (prisma.agentAuditLog.create as any).mock.calls[1][0];
      
      expect(call1.data.promptHash).toBe(call2.data.promptHash);
    });

    it('should produce different hashes for different prompts', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValue({ id: 'log-id' });

      await auditService.log({ agentId: 'agent-1', action: 'llm_called', promptText: 'Prompt A' });
      await auditService.log({ agentId: 'agent-2', action: 'llm_called', promptText: 'Prompt B' });

      const call1 = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      const call2 = (prisma.agentAuditLog.create as any).mock.calls[1][0];
      
      expect(call1.data.promptHash).not.toBe(call2.data.promptHash);
    });

    it('should handle undefined promptText', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await auditService.log({
        agentId: 'agent-123',
        action: 'task_created',
      });

      const callArgs = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.promptHash).toBeUndefined();
    });

    it('should hash IP addresses (DSGVO compliance)', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const ipAddress = '192.168.1.100';
      await auditService.log({
        agentId: 'agent-123',
        action: 'task_created',
        ipAddress,
      });

      const callArgs = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.ipHash).toBeDefined();
      expect(callArgs.data.ipHash).not.toBe(ipAddress);
      expect(callArgs.data.ipHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should produce consistent hash for same IP', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValue({ id: 'log-id' });

      const ipAddress = '10.0.0.1';
      
      await auditService.log({ agentId: 'agent-1', action: 'task_created', ipAddress });
      await auditService.log({ agentId: 'agent-2', action: 'task_created', ipAddress });

      const call1 = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      const call2 = (prisma.agentAuditLog.create as any).mock.calls[1][0];
      
      expect(call1.data.ipHash).toBe(call2.data.ipHash);
    });

    it('should produce different hashes for different IPs', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValue({ id: 'log-id' });

      await auditService.log({ agentId: 'agent-1', action: 'task_created', ipAddress: '192.168.1.1' });
      await auditService.log({ agentId: 'agent-2', action: 'task_created', ipAddress: '192.168.1.2' });

      const call1 = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      const call2 = (prisma.agentAuditLog.create as any).mock.calls[1][0];
      
      expect(call1.data.ipHash).not.toBe(call2.data.ipHash);
    });

    it('should handle undefined IP address', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await auditService.log({
        agentId: 'agent-123',
        action: 'task_created',
      });

      const callArgs = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.ipHash).toBeUndefined();
    });

    it('should NOT store patient names in logs', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await auditService.log({
        agentId: 'agent-123',
        action: 'task_created',
        details: 'Task created for patient',
        // Note: No patient name in logs - only taskId should reference patient
      });

      const callArgs = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      // Details should not contain PII
      expect(callArgs.data.details).not.toMatch(/Müller|Schmidt|Patient-Name/i);
    });
  });

  // ============================================
  // Log Query Tests
  // ============================================
  describe('Log Queries', () => {
    it('should get logs for specific agent', async () => {
      const mockLogs = [
        { id: 'log-1', agentId: 'agent-123', action: 'task_created' },
        { id: 'log-2', agentId: 'agent-123', action: 'task_completed' },
      ];
      (prisma.agentAuditLog.findMany as any).mockResolvedValueOnce(mockLogs);

      const result = await auditService.getLogsForAgent('agent-123');

      expect(prisma.agentAuditLog.findMany).toHaveBeenCalledWith({
        where: { agentId: 'agent-123' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
        select: expect.not.objectContaining({
          promptHash: true,
          ipHash: true,
        }),
      });
      expect(result).toEqual(mockLogs);
    });

    it('should respect limit parameter (max 200)', async () => {
      (prisma.agentAuditLog.findMany as any).mockResolvedValueOnce([]);

      await auditService.getLogsForAgent('agent-123', 500, 0);

      expect(prisma.agentAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 200, // Should be capped at 200
        })
      );
    });

    it('should respect offset parameter', async () => {
      (prisma.agentAuditLog.findMany as any).mockResolvedValueOnce([]);

      await auditService.getLogsForAgent('agent-123', 50, 100);

      expect(prisma.agentAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 100,
        })
      );
    });

    it('should get logs for specific task', async () => {
      const mockLogs = [
        { id: 'log-1', taskId: 'task-456', action: 'task_started' },
        { id: 'log-2', taskId: 'task-456', action: 'task_completed' },
      ];
      (prisma.agentAuditLog.findMany as any).mockResolvedValueOnce(mockLogs);

      const result = await auditService.getLogsForTask('task-456');

      expect(prisma.agentAuditLog.findMany).toHaveBeenCalledWith({
        where: { taskId: 'task-456' },
        orderBy: { createdAt: 'asc' },
        select: expect.not.objectContaining({
          promptHash: true,
          ipHash: true,
        }),
      });
      expect(result).toEqual(mockLogs);
    });

    it('should get logs for patient reference (DSGVO Art. 15)', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'task_created', agent: { name: 'TriageAgent', type: 'AUTONOMOUS' } },
      ];
      (prisma.agentAuditLog.findMany as any).mockResolvedValueOnce(mockLogs);

      const result = await auditService.getLogsForPatientRef('patient-ref-123');

      expect(prisma.agentAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          task: {
            patientRef: 'patient-ref-123',
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: expect.objectContaining({
          id: true,
          agentId: true,
          action: true,
          decisionType: true,
          humanReview: true,
          createdAt: true,
          agent: { select: { name: true, type: true } },
        }),
      });
      expect(result).toEqual(mockLogs);
    });

    it('should cap patient logs at 200', async () => {
      (prisma.agentAuditLog.findMany as any).mockResolvedValueOnce([]);

      await auditService.getLogsForPatientRef('patient-ref-123', 500);

      expect(prisma.agentAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 200,
        })
      );
    });
  });

  // ============================================
  // Statistics Tests
  // ============================================
  describe('Statistics', () => {
    it('should get audit statistics', async () => {
      (prisma.agentAuditLog.count as any)
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(150)  // decisions
        .mockResolvedValueOnce(25);  // humanReviews

      const result = await auditService.getStats();

      expect(result).toEqual({
        total: 1000,
        decisions: 150,
        humanReviews: 25,
      });
    });

    it('should get statistics since specific date', async () => {
      const since = new Date('2024-01-01');
      (prisma.agentAuditLog.count as any)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);

      await auditService.getStats(since);

      expect(prisma.agentAuditLog.count).toHaveBeenCalledWith({
        where: { createdAt: { gte: since } },
      });
    });

    it('should get all-time statistics when no date provided', async () => {
      (prisma.agentAuditLog.count as any)
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(25);

      await auditService.getStats();

      // getStats calls count with where: {} when no date provided
      expect(prisma.agentAuditLog.count).toHaveBeenCalledWith({ where: {} });
    });
  });

  // ============================================
  // Log Rotation & Archival Tests
  // ============================================
  describe('Log Rotation & Archival', () => {
    it('should handle large log volumes', async () => {
      const largeLogs = Array(1000).fill(null).map((_, i) => ({
        id: `log-${i}`,
        agentId: 'agent-123',
        action: 'task_created',
      }));
      
      (prisma.agentAuditLog.findMany as any).mockResolvedValueOnce(largeLogs);

      const result = await auditService.getLogsForAgent('agent-123', 1000);
      
      // Should be capped at 200
      expect(prisma.agentAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 200,
        })
      );
    });

    it('should not expose sensitive hashes in query results', async () => {
      (prisma.agentAuditLog.findMany as any).mockResolvedValueOnce([
        { id: 'log-1', action: 'llm_called' },
      ]);

      await auditService.getLogsForAgent('agent-123');

      const callArgs = (prisma.agentAuditLog.findMany as any).mock.calls[0][0];
      
      // Should not include promptHash or ipHash in select
      const selectFields = callArgs.select;
      expect(selectFields).not.toHaveProperty('promptHash');
      expect(selectFields).not.toHaveProperty('ipHash');
    });

    it('should not expose sensitive hashes in task query results', async () => {
      (prisma.agentAuditLog.findMany as any).mockResolvedValueOnce([
        { id: 'log-1', action: 'llm_called' },
      ]);

      await auditService.getLogsForTask('task-123');

      const callArgs = (prisma.agentAuditLog.findMany as any).mock.calls[0][0];
      
      const selectFields = callArgs.select;
      expect(selectFields).not.toHaveProperty('promptHash');
      expect(selectFields).not.toHaveProperty('ipHash');
    });
  });

  // ============================================
  // HIPAA Compliance Tests
  // ============================================
  describe('HIPAA Compliance', () => {
    it('should log agent actions without PHI', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await auditService.log({
        agentId: 'triage-agent',
        taskId: 'task-456',
        action: 'decision_made',
        decisionType: 'triage_priority',
        confidence: 0.89,
        details: 'High priority triage decision made',
      });

      const callArgs = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      
      // Should NOT contain PHI like patient names, diagnoses, etc.
      const dataStr = JSON.stringify(callArgs.data);
      expect(dataStr).not.toMatch(/diagnosis|disease|condition|patient.*name/i);
      
      // Should contain action metadata
      expect(callArgs.data.decisionType).toBe('triage_priority');
      expect(callArgs.data.confidence).toBe(0.89);
    });

    it('should support human review workflow (HIPAA safeguard)', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await auditService.log({
        agentId: 'ai-agent',
        action: 'human_review_requested',
        decisionType: 'critical_triage',
        confidence: 0.65,
        humanReview: true,
      });

      const callArgs = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.humanReview).toBe(true);
      expect(callArgs.data.decisionType).toBe('critical_triage');
    });

    it('should log human review completion', async () => {
      (prisma.agentAuditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await auditService.log({
        agentId: 'ai-agent',
        action: 'human_review_completed',
        humanReview: true,
        humanReviewBy: 'dr-schmidt',
      });

      const callArgs = (prisma.agentAuditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.humanReviewBy).toBe('dr-schmidt');
    });
  });
});
