import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { RegistrationQueue } from './registration-queue';
import type { AngieServerConfig, ServerRegistration } from './types';

describe('RegistrationQueue', () => {
  let queue: RegistrationQueue;
  let mockConfig: AngieServerConfig;

  beforeEach(() => {
    queue = new RegistrationQueue();
    mockConfig = {
      name: 'test-server',
      version: '1.0.0',
      description: 'Test server description',
      server: {} as any,
    };
  });

  describe('add', () => {
    it('should add registration to queue with correct structure', () => {
      // Arrange
      const config = { ...mockConfig };

      // Act
      const registration = queue.add(config);

      // Assert
      expect(registration).toBeDefined();
      expect(registration.id).toMatch(/^reg_[a-z0-9-_.]+$/);
      expect(registration.config).toBe(config);
      expect(registration.timestamp).toBeGreaterThan(0);
      expect(registration.status).toBe('pending');
      expect(registration.error).toBeUndefined();
    });

    it('should generate unique IDs for multiple registrations', () => {
      // Arrange
      const config1 = { ...mockConfig, name: 'server1' };
      const config2 = { ...mockConfig, name: 'server2' };

      // Act
      const reg1 = queue.add(config1);
      const reg2 = queue.add(config2);

      // Assert
      expect(reg1.id).not.toBe(reg2.id);
      expect(queue.getAll()).toHaveLength(2);
    });
  });

  describe('getAll', () => {
    it('should return all registrations', () => {
      // Arrange
      const config1 = { ...mockConfig, name: 'server1' };
      const config2 = { ...mockConfig, name: 'server2' };
      queue.add(config1);
      queue.add(config2);

      // Act
      const allRegistrations = queue.getAll();

      // Assert
      expect(allRegistrations).toHaveLength(2);
      expect(allRegistrations[0].config.name).toBe('server1');
      expect(allRegistrations[1].config.name).toBe('server2');
      
      // Verify it's a copy, not a reference
      const modifiedArray = [...allRegistrations];
      modifiedArray.push({} as ServerRegistration);
      expect(queue.getAll()).toHaveLength(2);
    });
  });

  describe('getPending', () => {
    it('should return only pending registrations', () => {
      // Arrange
      const config1 = { ...mockConfig, name: 'server1' };
      const config2 = { ...mockConfig, name: 'server2' };
      const config3 = { ...mockConfig, name: 'server3' };
      
      const reg1 = queue.add(config1);
      const reg2 = queue.add(config2);
      const reg3 = queue.add(config3);
      
      queue.updateStatus(reg1.id, 'registered');
      queue.updateStatus(reg2.id, 'failed', 'Test error');

      // Act
      const pendingRegistrations = queue.getPending();

      // Assert
      expect(pendingRegistrations).toHaveLength(1);
      expect(pendingRegistrations[0].id).toBe(reg3.id);
      expect(pendingRegistrations[0].status).toBe('pending');
    });
  });

  describe('updateStatus', () => {
    it('should update registration status correctly', () => {
      // Arrange
      const registration = queue.add(mockConfig);

      // Act
      queue.updateStatus(registration.id, 'registered');

      // Assert
      const updated = queue.getAll().find(reg => reg.id === registration.id);
      expect(updated?.status).toBe('registered');
      expect(updated?.error).toBeUndefined();
    });

    it('should update status with error message', () => {
      // Arrange
      const registration = queue.add(mockConfig);
      const errorMessage = 'Test error message';

      // Act
      queue.updateStatus(registration.id, 'failed', errorMessage);

      // Assert
      const updated = queue.getAll().find(reg => reg.id === registration.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.error).toBe(errorMessage);
    });
  });

  describe('processQueue', () => {
    it('should process all pending registrations', async () => {
      // Arrange
      const config1 = { ...mockConfig, name: 'server1' };
      const config2 = { ...mockConfig, name: 'server2' };
      
      queue.add(config1);
      queue.add(config2);
      
      const processor = jest.fn(async (registration: ServerRegistration) => {
        return Promise.resolve();
      });

      // Act
      await queue.processQueue(processor as any);

      // Assert
      expect(processor).toHaveBeenCalledTimes(2);
      expect(queue.getPending()).toHaveLength(0);
      expect(queue.getAll().every(reg => reg.status === 'registered')).toBe(true);
    });

    it('should handle processor errors gracefully', async () => {
      // Arrange
      const config1 = { ...mockConfig, name: 'server1' };
      const config2 = { ...mockConfig, name: 'server2' };
      
      const reg1 = queue.add(config1);
      const reg2 = queue.add(config2);

      let callCount = 0;
      const processor = jest.fn(async (registration: ServerRegistration) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Processor error');
        }
      });

      // Act
      await queue.processQueue(processor);

      // Assert
      expect(processor).toHaveBeenCalledTimes(2);
      expect(reg1.status).toBe('registered');
      expect(reg2.status).toBe('failed');
      expect(reg2.error).toBe('Processor error');
    });

    it('should not process if already processing', async () => {
      // Arrange
      queue.add(mockConfig);
      const processor = jest.fn(async (registration: ServerRegistration) => new Promise<void>(resolve => setTimeout(resolve, 100)));

      // Act
      const process1 = queue.processQueue(processor);
      const process2 = queue.processQueue(processor);
      
      await Promise.all([process1, process2]);

      // Assert
      expect(processor).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should remove all registrations', () => {
      // Arrange
      queue.add(mockConfig);
      queue.add({ ...mockConfig, name: 'server2' });
      expect(queue.getAll()).toHaveLength(2);

      // Act
      queue.clear();

      // Assert
      expect(queue.getAll()).toHaveLength(0);
      expect(queue.getPending()).toHaveLength(0);
    });
  });

  describe('remove', () => {
    it('should remove specific registration', () => {
      // Arrange
      const reg1 = queue.add(mockConfig);
      const reg2 = queue.add({ ...mockConfig, name: 'server2' });
      expect(queue.getAll()).toHaveLength(2);

      // Act
      const removed = queue.remove(reg1.id);

      // Assert
      expect(removed).toBe(true);
      expect(queue.getAll()).toHaveLength(1);
      expect(queue.getAll()[0].id).toBe(reg2.id);
    });

    it('should return false for non-existent registration', () => {
      // Arrange
      const initialCount = queue.getAll().length;

      // Act
      const removed = queue.remove('non-existent-id');

      // Assert
      expect(removed).toBe(false);
      expect(queue.getAll()).toHaveLength(initialCount);
    });
  });

  describe('edge cases', () => {
    it('should handle large number of registrations', () => {
      // Arrange
      const registrations: ServerRegistration[] = [];
      for (let i = 0; i < 100; i++) {
        registrations.push(queue.add({ ...mockConfig, name: `server${i}` }));
      }

      // Act & Assert
      expect(queue.getAll()).toHaveLength(100);
      expect(queue.getPending()).toHaveLength(100);
      
      // Update some statuses
      queue.updateStatus(registrations[0].id, 'registered');
      queue.updateStatus(registrations[1].id, 'failed', 'error');
      
      expect(queue.getPending()).toHaveLength(98);
    });

    it('should handle concurrent status updates', () => {
      // Arrange
      const registration = queue.add(mockConfig);

      // Act
      queue.updateStatus(registration.id, 'registered');
      queue.updateStatus(registration.id, 'failed', 'error');
      queue.updateStatus(registration.id, 'pending');

      // Assert
      const updated = queue.getAll().find(reg => reg.id === registration.id);
      expect(updated?.status).toBe('pending');
      expect(updated?.error).toBeUndefined();
    });
  });
}); 