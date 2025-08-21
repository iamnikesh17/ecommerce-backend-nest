// src/common/services/cloudinary.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
config();

// Interface for upload result
interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  eager?: Array<{
    transformation: string;
    width: number;
    height: number;
    secure_url: string;
  }>;
}

// Interface for upload options
interface UploadOptions {
  folder?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
  allowedFormats?: string[];
  generateThumbnails?: boolean;
  quality?: string;
  width?: number;
  height?: number;
  cropMode?: string;
}

@Injectable()
export class CloudinaryService {
  constructor() {
    // Cloudinary configuration
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload single image to Cloudinary
   * @param file - Single image file
   * @param options - Upload configuration options
   * @returns Promise<string> - Uploaded image URL
   */
  async uploadSingleImage(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<string> {
    const {
      folder = 'uploads',
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      quality = 'auto:good',
      width = 1200,
      height = 1200,
      cropMode = 'limit',
      generateThumbnails = true,
    } = options;

    // Validate single file
    this.validateFile(file, { maxSize, allowedFormats });

    try {
      const result = await this.uploadToCloudinary(file, {
        folder,
        quality,
        width,
        height,
        cropMode,
        generateThumbnails,
      });

      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload multiple images to Cloudinary
   * @param files - Array of image files
   * @param options - Upload configuration options
   * @returns Promise<string[]> - Array of uploaded image URLs
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    options: UploadOptions = {},
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const {
      folder = 'uploads',
      maxFiles = 10,
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      quality = 'auto:good',
      width = 1200,
      height = 1200,
      cropMode = 'limit',
      generateThumbnails = true,
    } = options;

    // Validate files count
    if (files.length > maxFiles) {
      throw new BadRequestException(`Maximum ${maxFiles} images allowed`);
    }

    // Validate each file
    files.forEach((file) =>
      this.validateFile(file, { maxSize, allowedFormats }),
    );

    // Upload all files concurrently
    const uploadPromises = files.map((file) =>
      this.uploadToCloudinary(file, {
        folder,
        quality,
        width,
        height,
        cropMode,
        generateThumbnails,
      }),
    );

    try {
      const uploadResults = await Promise.all(uploadPromises);
      return uploadResults.map((result) => result.secure_url);
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload images: ${error.message}`,
      );
    }
  }

  /**
   * Delete single image from Cloudinary
   * @param imageUrl - Cloudinary image URL
   * @param folder - Folder path where image is stored
   */
  async deleteSingleImage(
    imageUrl: string,
    folder: string = 'uploads',
  ): Promise<void> {
    const publicId = this.extractPublicId(imageUrl, folder);
    if (!publicId) {
      console.warn('Unable to extract public_id from URL:', imageUrl);
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
      // Don't throw error to avoid blocking main operations
    }
  }

  /**
   * Delete multiple images from Cloudinary
   * @param imageUrls - Array of Cloudinary image URLs
   * @param folder - Folder path where images are stored
   */
  async deleteMultipleImages(
    imageUrls: string[],
    folder: string = 'uploads',
  ): Promise<void> {
    if (!imageUrls || imageUrls.length === 0) return;

    const publicIds = imageUrls
      .map((url) => this.extractPublicId(url, folder))
      .filter(Boolean);

    if (publicIds.length === 0) return;

    try {
      // Delete in batches if there are many images
      const batchSize = 100; // Cloudinary limit
      for (let i = 0; i < publicIds.length; i += batchSize) {
        const batch = publicIds.slice(i, i + batchSize);
        await cloudinary.api.delete_resources(batch);
      }
    } catch (error) {
      console.error('Failed to delete images from Cloudinary:', error);
      // Don't throw error to avoid blocking main operations
    }
  }

  /**
   * Get optimized image URLs for different sizes
   * @param originalUrl - Original Cloudinary image URL
   * @returns Object with different sized URLs
   */
  getOptimizedImageUrls(originalUrl: string) {
    if (!originalUrl) return null;

    return {
      original: originalUrl,
      thumbnail: originalUrl.replace(
        '/upload/',
        '/upload/w_300,h_300,c_fill,q_auto,f_auto/',
      ),
      small: originalUrl.replace(
        '/upload/',
        '/upload/w_400,h_400,c_fill,q_auto,f_auto/',
      ),
      medium: originalUrl.replace(
        '/upload/',
        '/upload/w_600,h_600,c_fill,q_auto,f_auto/',
      ),
      large: originalUrl.replace(
        '/upload/',
        '/upload/w_1200,h_1200,c_limit,q_auto,f_auto/',
      ),
      // Blur placeholder for lazy loading
      placeholder: originalUrl.replace(
        '/upload/',
        '/upload/w_50,h_50,c_fill,q_auto,f_auto,e_blur:300/',
      ),
    };
  }

  /**
   * Get multiple optimized image URLs
   * @param imageUrls - Array of original Cloudinary image URLs
   * @returns Array of objects with different sized URLs
   */
  getMultipleOptimizedImageUrls(imageUrls: string[]) {
    if (!imageUrls || imageUrls.length === 0) return [];

    return imageUrls.map((url) => this.getOptimizedImageUrls(url));
  }

  /**
   * Private method to upload file to Cloudinary
   */
  private uploadToCloudinary(
    file: Express.Multer.File,
    options: {
      folder: string;
      quality: string;
      width: number;
      height: number;
      cropMode: string;
      generateThumbnails: boolean;
    },
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: options.folder,
        resource_type: 'image',
        quality: options.quality,
        fetch_format: 'auto',
        width: options.width,
        height: options.height,
        crop: options.cropMode,
        tags: ['auto-generated'],
        public_id: `${options.folder}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };

      // Add thumbnails if required
      if (options.generateThumbnails) {
        uploadOptions.eager = [
          { width: 150, height: 150, crop: 'fill', quality: 'auto:good' }, // Tiny
          { width: 300, height: 300, crop: 'fill', quality: 'auto:good' }, // Thumbnail
          { width: 600, height: 600, crop: 'fill', quality: 'auto:good' }, // Medium
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }, // Large
        ];
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as CloudinaryUploadResult);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Private method to validate file
   */
  private validateFile(
    file: Express.Multer.File,
    options: { maxSize: number; allowedFormats: string[] },
  ): void {
    // Check file size
    if (file.size > options.maxSize) {
      throw new BadRequestException(
        `File size should not exceed ${options.maxSize / 1024 / 1024}MB`,
      );
    }

    // Check file format
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExtension || !options.allowedFormats.includes(fileExtension)) {
      throw new BadRequestException(
        `Invalid file format. Allowed formats: ${options.allowedFormats.join(', ')}`,
      );
    }

    // Check MIME type
    const allowedMimeTypes = options.allowedFormats.map((format) => {
      if (format === 'jpg') return 'image/jpeg';
      return `image/${format}`;
    });

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }
  }

  /**
   * Private method to extract public_id from Cloudinary URL
   */
  private extractPublicId(url: string, folder: string): string | null {
    try {
      // Extract public_id from URL
      // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
      const regex = new RegExp(`\/${folder}\/([^\/\\?]+)(?:\\.|$)`);
      const match = url.match(regex);

      if (match && match[1]) {
        return `${folder}/${match[1]}`;
      }

      // Fallback method
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const nameWithoutExtension = filename.split('.')[0];
      return `${folder}/${nameWithoutExtension}`;
    } catch (error) {
      console.error('Error extracting public_id:', error);
      return null;
    }
  }

  /**
   * Check if Cloudinary is properly configured
   */
  isConfigured(): boolean {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    return !!(cloudName && apiKey && apiSecret);
  }

  /**
   * Get Cloudinary configuration status
   */
  getConfigStatus() {
    return {
      configured: this.isConfigured(),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
      apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
      apiSecret: process.env.CLOUDINARY ? 'Set' : 'Missing',
    };
  }
}
