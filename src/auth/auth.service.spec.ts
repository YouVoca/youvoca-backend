import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userRepository = {
    findUnique: jest.fn(),
    create: jest.fn(),
  };
  const prisma = { user: userRepository } as unknown as PrismaService;
  const jwt = { signAsync: jest.fn() } as unknown as JwtService;
  const service = new AuthService(prisma, jwt);

  beforeEach(() => jest.clearAllMocks());

  it('회원가입 시 이메일을 정규화하고 비밀번호를 해시한다', async () => {
    userRepository.findUnique.mockResolvedValue(null);
    userRepository.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 1, email: data.email, nickname: data.nickname }),
    );

    const result = await service.signUp({
      email: ' Test@Example.com ',
      password: 'password123',
      nickname: ' 수현 ',
    });

    expect(result).toEqual({
      userId: 1,
      email: 'test@example.com',
      nickname: '수현',
    });
    const data = userRepository.create.mock.calls[0][0].data;
    expect(data.passwordHash).not.toBe('password123');
    await expect(compare('password123', data.passwordHash)).resolves.toBe(true);
  });

  it('이미 가입된 이메일은 거절한다', async () => {
    userRepository.findUnique.mockResolvedValue({ id: 1 });
    await expect(
      service.signUp({
        email: 'test@example.com',
        password: 'password123',
        nickname: '수현',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('올바른 로그인에 access token과 공개 사용자 정보를 반환한다', async () => {
    const { hash } = await import('bcryptjs');
    userRepository.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      nickname: '수현',
      passwordHash: await hash('password123', 4),
    });
    (jwt.signAsync as jest.Mock).mockResolvedValue('access-token');

    await expect(
      service.signIn({ email: 'test@example.com', password: 'password123' }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      user: { id: 1, email: 'test@example.com', nickname: '수현' },
    });
  });

  it('잘못된 비밀번호는 거절한다', async () => {
    userRepository.findUnique.mockResolvedValue({
      id: 1,
      passwordHash: '$2b$04$invalid.invalid.invalid.invalid.invalid.invalid',
    });
    await expect(
      service.signIn({ email: 'test@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
