import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  private cache = new Map<string, any>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  get(key: string): any {
    return this.cache.get(key);
  }

  set(key: string, value: any, ttl: number = 60000): void {
    // Xóa timeout cũ nếu có
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    // Lưu giá trị mới
    this.cache.set(key, value);

    // Đặt timeout để xóa sau thời gian TTL
    const timeout = setTimeout(() => {
      this.cache.delete(key);
      this.timeouts.delete(key);
    }, ttl);

    this.timeouts.set(key, timeout);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
    return this.cache.delete(key);
  }

  clear(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
    this.cache.clear();
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}
