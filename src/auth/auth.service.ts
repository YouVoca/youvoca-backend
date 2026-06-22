import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signUp(dto: SignUpDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('이미 가입된 이메일입니다.');

    const user = await this.prisma.user.create({
      data: {
        email,
        nickname: dto.nickname.trim(),
        passwordHash: await hash(dto.password, 12),
        provider: 'local',
      },
      select: { id: true, email: true, nickname: true },
    });

    return { userId: user.id, email: user.email, nickname: user.nickname };
  }

  async signIn(dto: SignInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user?.passwordHash ||
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const publicUser = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    };
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        email: user.email,
      }),
      user: publicUser,
    };
  }
}
