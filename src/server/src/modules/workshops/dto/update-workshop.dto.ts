import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateWorkshopDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  speaker?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  room?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  startTime?: Date;

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  endTime?: Date;

  @IsOptional()
  @IsString()
  detail?: string;
}
