import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { IsEmail, IsString } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.login(dto.email, dto.password, headers);
  }
}
