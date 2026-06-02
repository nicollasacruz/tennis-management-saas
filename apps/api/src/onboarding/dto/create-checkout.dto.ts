import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  schoolName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'slug: apenas letras, números e hífen',
  })
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}$/, {
    message: 'locale: use um código de idioma de duas letras',
  })
  locale?: string;
}
