import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('jwt.secret'),
        signOptions: { expiresIn: cfg.get('jwt.expiration') },
        }),
    }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}