import { commands, type VRCError } from '@/types/bindings';

function formatVRCError(error: VRCError): string {
  switch (error.type) {
    case 'Network':
    case 'Authentication':
    case 'RateLimit':
    case 'Parse':
    case 'InvalidInput':
    case 'Unknown':
      return error.data;
    case 'Http':
      return `HTTP ${error.data.status}: ${error.data.message}`;
  }
}

export class ImageCacheService {
  static async checkCached(url: string): Promise<string | null> {
    const result = await commands.checkImageCached(url);
    return result.status === 'ok' ? result.data : null;
  }

  static async cache(url: string): Promise<string> {
    const result = await commands.cacheImage(url);
    if (result.status === 'error') {
      // Include the full error details for debugging
      const errorMsg = formatVRCError(result.error);
      throw new Error(`Failed to cache image: ${errorMsg}`);
    }
    return result.data;
  }
}
