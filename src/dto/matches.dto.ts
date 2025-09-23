import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class FindMatchesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ExpressInterestDto {
  @IsString()
  adId: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class RespondToInterestDto {
  @IsEnum(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}

export class RespondToMatchDto {
  @IsEnum(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}

export class GetMyMatchesQueryDto {
  @IsOptional()
  @IsEnum(['pending', 'accepted', 'rejected', 'expired'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
