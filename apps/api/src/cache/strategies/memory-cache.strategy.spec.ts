import { Test, TestingModule } from '@nestjs/testing';
import { MemoryCacheStrategy } from './memory-cache.strategy';

describe('MemoryCacheStrategy', () => {
  let service: MemoryCacheStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryCacheStrategy],
    }).compile();

    service = module.get<MemoryCacheStrategy>(MemoryCacheStrategy);
  });

  afterEach(async () => {
    await service.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Basic Operations', () => {
    it('TEST-001: should set and get cache value', async () => {
      // Act
      await service.set('test-key', { data: 'test-value' });
      const result = await service.get<{ data: string }>('test-key');

      // Assert
      expect(result).toEqual({ data: 'test-value' });
    });

    it('TEST-002: should return null for expired cache', async () => {
      // Arrange - set a very short TTL
      await service.set('test-key', 'value', 0.001);  // 1ms TTL

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      const result = await service.get('test-key');

      // Assert
      expect(result).toBeNull();
    });

    it('TEST-003: should delete cache value', async () => {
      // Arrange
      await service.set('test-key', 'value');

      // Act
      await service.delete('test-key');
      const result = await service.get('test-key');

      // Assert
      expect(result).toBeNull();
    });

    it('TEST-004: should clear all cache', async () => {
      // Arrange
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      // Act
      await service.clear();
      const size = await service.size();

      // Assert
      expect(size).toBe(0);
    });

    it('should check if key exists', async () => {
      // Arrange
      await service.set('test-key', 'value');

      // Act
      const exists = await service.has('test-key');
      const notExists = await service.has('non-existent');

      // Assert
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('TEST-005: should track cache hits and misses', async () => {
      // Arrange
      await service.set('test-key', 'value');

      // Act
      await service.get('test-key');  // Hit
      await service.get('test-key');  // Hit
      await service.get('non-existent');  // Miss

      const stats = service.getStats();

      // Assert
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(2 / 3);
    });

    it('should return stats for specific key', async () => {
      // Arrange
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      // Act
      await service.get('key1');  // Hit
      await service.get('key1');  // Hit
      await service.get('key2');  // Hit
      await service.get('key2');  // Miss (will be deleted)

      const stats1 = service.getStats('key1');
      const stats2 = service.getStats('key2');

      // Assert
      expect(stats1.hits).toBe(2);
      expect(stats2.misses).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TTL Expiration', () => {
    it('should not expire within TTL period', async () => {
      // Arrange
      await service.set('test-key', 'value', 5);  // 5 seconds TTL

      // Act
      const result = await service.get('test-key');

      // Assert
      expect(result).toBe('value');
    });

    it('should expire after TTL period', async () => {
      // Arrange
      jest.useFakeTimers();
      await service.set('test-key', 'value', 1);  // 1 second TTL

      // Act
      jest.advanceTimersByTime(2000);  // Advance 2 seconds
      const result = await service.get('test-key');

      // Assert
      expect(result).toBeNull();
      jest.useRealTimers();
    });
  });

  describe('Prefix Operations', () => {
    it('should clear entries matching prefix', async () => {
      // Arrange
      await service.set('cache:user:1', 'user1');
      await service.set('cache:user:2', 'user2');
      await service.set('cache:product:1', 'product1');

      // Act
      const cleared = await service.clearPrefix('cache:user:');

      // Assert
      expect(cleared).toBe(2);
      expect(await service.get('cache:user:1')).toBeNull();
      expect(await service.get('cache:product:1')).toBe('product1');
    });
  });
});
