import { IsOptional, IsString, IsPhoneNumber } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
