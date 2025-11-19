import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  name: string;

  @MinLength(6)
  password: string;

  @IsEnum(['PATIENT', 'DOCTOR'])
  role: 'PATIENT' | 'DOCTOR';
}

