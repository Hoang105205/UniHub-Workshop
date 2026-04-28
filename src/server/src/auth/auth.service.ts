import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../entities/roles.enum';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersRepository.findOne({
      where: {
        studentId: registerDto.studentId,
        email: registerDto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException(
        'Student ID not found in system. Please contact administrator.',
      );
    }

    if (user.passwordHash) {
      throw new ConflictException('Student ID already registered');
    }

    user.passwordHash = await bcrypt.hash(registerDto.password, 10);
    const savedUser = await this.usersRepository.save(user);

    const accessToken = await this.generateAccessToken(savedUser);

    return {
      accessToken,
      user: this.serializeUser(savedUser),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.generateAccessToken(user);

    return {
      accessToken,
      user: this.serializeUser(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return this.serializeUser(user);
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.name,
      role: user.role,
    };
  }
}
