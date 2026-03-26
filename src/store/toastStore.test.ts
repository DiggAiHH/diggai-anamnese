import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToastStore } from './toastStore';

describe('ToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  describe('addToast', () => {
    it('should add a toast with generated id', () => {
      const { addToast } = useToastStore.getState();
      
      const id = addToast({ type: 'success', message: 'Success!' });
      
      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].id).toBe(id);
      expect(toasts[0].message).toBe('Success!');
      expect(toasts[0].type).toBe('success');
    });

    it('should add toast with title', () => {
      const { addToast } = useToastStore.getState();
      
      addToast({ type: 'error', title: 'Error Title', message: 'Error message' });
      
      const toast = useToastStore.getState().toasts[0];
      expect(toast.title).toBe('Error Title');
    });

    it('should add toast with custom duration', () => {
      const { addToast } = useToastStore.getState();
      
      addToast({ type: 'info', message: 'Info', duration: 10000 });
      
      const toast = useToastStore.getState().toasts[0];
      expect(toast.duration).toBe(10000);
    });

    it('should generate unique ids for multiple toasts', () => {
      const { addToast } = useToastStore.getState();
      
      const id1 = addToast({ type: 'success', message: 'First' });
      const id2 = addToast({ type: 'success', message: 'Second' });
      
      expect(id1).not.toBe(id2);
    });

    it('should stack multiple toasts', () => {
      const { addToast } = useToastStore.getState();
      
      addToast({ type: 'success', message: 'First' });
      addToast({ type: 'error', message: 'Second' });
      addToast({ type: 'warning', message: 'Third' });
      
      expect(useToastStore.getState().toasts).toHaveLength(3);
    });
  });

  describe('removeToast', () => {
    it('should remove toast by id', () => {
      const { addToast, removeToast } = useToastStore.getState();
      
      const id = addToast({ type: 'success', message: 'To be removed' });
      removeToast(id);
      
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('should only remove specific toast', () => {
      const { addToast, removeToast } = useToastStore.getState();
      
      const id1 = addToast({ type: 'success', message: 'Keep' });
      const id2 = addToast({ type: 'error', message: 'Remove' });
      
      removeToast(id2);
      
      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].id).toBe(id1);
    });

    it('should handle removing non-existent toast', () => {
      const { removeToast } = useToastStore.getState();
      
      // Should not throw
      expect(() => removeToast('non-existent-id')).not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('should remove all toasts', () => {
      const { addToast, clearAll } = useToastStore.getState();
      
      addToast({ type: 'success', message: 'First' });
      addToast({ type: 'error', message: 'Second' });
      addToast({ type: 'warning', message: 'Third' });
      
      clearAll();
      
      expect(useToastStore.getState().toasts).toEqual([]);
    });

    it('should work when no toasts exist', () => {
      const { clearAll } = useToastStore.getState();
      
      expect(() => clearAll()).not.toThrow();
      expect(useToastStore.getState().toasts).toEqual([]);
    });
  });

  describe('toast helpers', () => {
    it('should add success toast with helper', () => {
      const { toast } = useToastStore.getState();
      
      const id = toast.success('Operation successful', 'Success Title');
      
      const addedToast = useToastStore.getState().toasts[0];
      expect(addedToast.type).toBe('success');
      expect(addedToast.message).toBe('Operation successful');
      expect(addedToast.title).toBe('Success Title');
      expect(addedToast.duration).toBe(4000);
      expect(id).toBeDefined();
    });

    it('should add error toast with helper', () => {
      const { toast } = useToastStore.getState();
      
      toast.error('Something went wrong');
      
      const addedToast = useToastStore.getState().toasts[0];
      expect(addedToast.type).toBe('error');
      expect(addedToast.message).toBe('Something went wrong');
      expect(addedToast.duration).toBe(6000);
    });

    it('should add warning toast with helper', () => {
      const { toast } = useToastStore.getState();
      
      toast.warning('Please be careful');
      
      const addedToast = useToastStore.getState().toasts[0];
      expect(addedToast.type).toBe('warning');
      expect(addedToast.message).toBe('Please be careful');
      expect(addedToast.duration).toBe(5000);
    });

    it('should add info toast with helper', () => {
      const { toast } = useToastStore.getState();
      
      toast.info('Did you know?');
      
      const addedToast = useToastStore.getState().toasts[0];
      expect(addedToast.type).toBe('info');
      expect(addedToast.message).toBe('Did you know?');
      expect(addedToast.duration).toBe(4000);
    });

    it('should allow using toast helper outside React components', () => {
      const { toast } = useToastStore.getState();
      
      // This simulates usage in a non-React context (e.g., API client)
      const id = toast.success('API Success');
      
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(id).toBeDefined();
    });
  });

  describe('toast types', () => {
    it('should handle all toast types', () => {
      const { addToast } = useToastStore.getState();
      
      addToast({ type: 'success', message: 'Success' });
      addToast({ type: 'error', message: 'Error' });
      addToast({ type: 'warning', message: 'Warning' });
      addToast({ type: 'info', message: 'Info' });
      
      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].type).toBe('success');
      expect(toasts[1].type).toBe('error');
      expect(toasts[2].type).toBe('warning');
      expect(toasts[3].type).toBe('info');
    });
  });
});
