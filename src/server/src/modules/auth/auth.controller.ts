import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService, JwtPayload } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);
    this.setAuthCookie(response, result.accessToken);

    return result;
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setAuthCookie(response, result.accessToken);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() request: { user: JwtPayload }) {
    return this.authService.getProfile(request.user.id);
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('accessToken', {
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  private setAuthCookie(response: Response, accessToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}