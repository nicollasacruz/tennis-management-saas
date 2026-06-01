import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWhatsappConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instanceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instanceToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  instanceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;
}
