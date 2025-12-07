import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient | null = null;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_BUCKET_NAME', 'grow-photos');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log('Supabase client initialized');
    } else {
      this.logger.warn('Supabase credentials not configured, file upload disabled');
    }
  }

  /**
   * Verifica si el servicio de storage está disponible
   */
  isAvailable(): boolean {
    return this.supabase !== null;
  }

  /**
   * Sube un archivo a Supabase Storage
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'photos',
  ): Promise<{ url: string; path: string }> {
    if (!this.supabase) {
      throw new Error('Supabase storage is not configured');
    }

    const timestamp = Date.now();
    const extension = file.originalname.split('.').pop() || 'jpg';
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Error uploading file: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  }

  /**
   * Elimina un archivo de Supabase Storage
   */
  async deleteFile(path: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase storage is not configured');
    }

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) {
      this.logger.error(`Error deleting file: ${error.message}`);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Lista archivos en una carpeta
   */
  async listFiles(folder: string = 'photos'): Promise<string[]> {
    if (!this.supabase) {
      throw new Error('Supabase storage is not configured');
    }

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .list(folder);

    if (error) {
      this.logger.error(`Error listing files: ${error.message}`);
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data.map((file) => `${folder}/${file.name}`);
  }
}
