import { formatCurrency, formatDate, isWithinDays } from './index';

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('should format CNY currency', () => {
      const result = formatCurrency(10000);
      expect(result).toContain('10,000');
    });

    it('should format USD currency', () => {
      const result = formatCurrency(10000, 'USD');
      expect(result).toContain('$');
    });
  });

  describe('formatDate', () => {
    it('should format date string', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBeTruthy();
    });

    it('should format Date object', () => {
      const result = formatDate(new Date('2024-01-15'));
      expect(result).toBeTruthy();
    });
  });

  describe('isWithinDays', () => {
    it('should return true for date within range', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      expect(isWithinDays(futureDate, 10)).toBe(true);
    });

    it('should return false for date outside range', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      expect(isWithinDays(futureDate, 10)).toBe(false);
    });
  });
});
