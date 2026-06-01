import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'O logótipo deve ser um URL válido.' })
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  receiptIssuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  receiptSignatureLabel?: string;
}
