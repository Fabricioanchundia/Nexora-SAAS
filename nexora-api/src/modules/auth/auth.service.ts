import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });

    const token = this.generateToken(user.id, user.email);
    return { user, token };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Mensaje genérico para no revelar si el email existe
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Cuenta desactivada');
    }

    const token = this.generateToken(user.id, user.email);
    return { user, token };
  }

  private generateToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}