// ============================================
// Data Compression Service
// ============================================
// Compresses large FHIR bundles and GDT files

import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CompressionOptions {
  level?: number; // 1-9, default 6
  threshold?: number; // Minimum size to compress (bytes), default 1024
}

export interface CompressedData {
  data: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: 'gzip';
}

export class DataCompressionService {
  private readonly DEFAULT_THRESHOLD = 1024; // 1KB
  private readonly DEFAULT_LEVEL = 6;

  async compress(
    data: string | Buffer,
    options: CompressionOptions = {}
  ): Promise<CompressedData | null> {
    const threshold = options.threshold ?? this.DEFAULT_THRESHOLD;
    const level = options.level ?? this.DEFAULT_LEVEL;

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
    
    // Only compress if above threshold
    if (buffer.length < threshold) {
      return null;
    }

    try {
      const compressed = await gzipAsync(buffer, { level });
      
      // If compression doesn't help, return null
      if (compressed.length >= buffer.length) {
        return null;
      }

      return {
        data: compressed,
        originalSize: buffer.length,
        compressedSize: compressed.length,
        compressionRatio: (1 - compressed.length / buffer.length) * 100,
        algorithm: 'gzip',
      };
    } catch (error) {
      throw new Error(`Compression failed: ${(error as Error).message}`);
    }
  }

  async decompress(data: Buffer): Promise<string> {
    try {
      const decompressed = await gunzipAsync(data);
      return decompressed.toString('utf-8');
    } catch (error) {
      throw new Error(`Decompression failed: ${(error as Error).message}`);
    }
  }

  /**
   * Compress FHIR Bundle
   */
  async compressFhirBundle(bundle: unknown, options?: CompressionOptions): Promise<CompressedData | null> {
    const json = JSON.stringify(bundle);
    return this.compress(json, options);
  }

  /**
   * Decompress FHIR Bundle
   */
  async decompressFhirBundle(data: Buffer): Promise<unknown> {
    const json = await this.decompress(data);
    return JSON.parse(json);
  }

  /**
   * Compress GDT content
   */
  async compressGdt(content: string, options?: CompressionOptions): Promise<CompressedData | null> {
    return this.compress(content, { ...options, threshold: 512 }); // Lower threshold for GDT
  }

  /**
   * Compress with automatic base64 encoding for storage
   */
  async compressToBase64(data: string, options?: CompressionOptions): Promise<string | null> {
    const compressed = await this.compress(data, options);
    if (!compressed) return null;
    return compressed.data.toString('base64');
  }

  /**
   * Decompress from base64
   */
  async decompressFromBase64(base64: string): Promise<string> {
    const buffer = Buffer.from(base64, 'base64');
    return this.decompress(buffer);
  }

  /**
   * Get compression stats
   */
  getStats(originalSize: number, compressedSize: number): {
    originalSize: string;
    compressedSize: string;
    ratio: number;
    savings: string;
  } {
    return {
      originalSize: this.formatBytes(originalSize),
      compressedSize: this.formatBytes(compressedSize),
      ratio: (1 - compressedSize / originalSize) * 100,
      savings: this.formatBytes(originalSize - compressedSize),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const dataCompression = new DataCompressionService();
