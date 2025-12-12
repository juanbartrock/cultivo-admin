import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { HarvestProductType, StorageLocation } from '@prisma/client';

// DTO para crear cosecha
export class CreateHarvestDto {
  @IsString()
  plantId: string;

  @IsDateString()
  harvestDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wetWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dryWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  trimWeight?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para actualizar cosecha
export class UpdateHarvestDto {
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wetWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dryWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  trimWeight?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para crear producto de cosecha
export class CreateHarvestProductDto {
  @IsString()
  harvestId: string;

  @IsEnum(HarvestProductType)
  type: HarvestProductType;

  @IsNumber()
  @Min(0)
  initialWeight: number;

  @IsOptional()
  @IsString()
  packageType?: string;

  @IsOptional()
  @IsString()
  packageNumber?: string;

  @IsOptional()
  @IsEnum(StorageLocation)
  storageLocation?: StorageLocation;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para actualizar producto
export class UpdateHarvestProductDto {
  @IsOptional()
  @IsEnum(HarvestProductType)
  type?: HarvestProductType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentWeight?: number;

  @IsOptional()
  @IsString()
  packageType?: string;

  @IsOptional()
  @IsString()
  packageNumber?: string;

  @IsOptional()
  @IsEnum(StorageLocation)
  storageLocation?: StorageLocation;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para extraer material (reducir peso)
export class ExtractMaterialDto {
  @IsNumber()
  @Min(0.01)
  amount: number; // Cantidad a extraer en gramos

  @IsOptional()
  @IsString()
  notes?: string;
}





