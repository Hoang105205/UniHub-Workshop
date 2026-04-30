import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Express } from 'express';
import type { Multer } from 'multer';

@Injectable()
export class SupabaseStorageService {
  private client: SupabaseClient | null = null;
  private bucketName: string | null = null;
  private initialized = false;

  private ensureInitialized() {
    if (this.initialized) return;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const bucketName = process.env.SUPABASE_BUCKET;
    console.log('Initializing SupabaseStorageService with:', {
      supabaseUrl,
      bucketName,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    });
    if (!supabaseUrl || !supabaseKey || !bucketName) {
      throw new Error(
        'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), and SUPABASE_BUCKET are required for PDF uploads',
      );
    }
    

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    this.bucketName = bucketName;
    this.initialized = true;
  }

  async uploadWorkshopIntroPdf(
    workshopId: string,
    file: Multer.File,
  ): Promise<string> {
    this.ensureInitialized();

    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '-');
    const filePath = `workshops/${workshopId}/${Date.now()}-${sanitizedName}`;

    const { error } = await this.client!.storage
      .from(this.bucketName!)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const signedUrlExpirySeconds = Number(
      process.env.SUPABASE_SIGNED_URL_EXPIRES_IN || 3600,
    );
    const signed = await this.client!.storage
      .from(this.bucketName!)
      .createSignedUrl(filePath, signedUrlExpirySeconds);

    if (!signed.error && signed.data?.signedUrl) {
      return signed.data.signedUrl;
    }

    const { data } = this.client!.storage
      .from(this.bucketName!)
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded PDF');
    }

    return data.publicUrl;
  }
}
