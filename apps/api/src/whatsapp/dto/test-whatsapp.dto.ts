import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class TestWhatsappDto {
  @IsString()
  @MaxLength(32)
  number!: string;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  filename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}
