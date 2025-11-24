import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    signup(dto: SignupDto): Promise<{
        access_token: string;
    }>;
    login(req: any): Promise<{
        access_token: string;
    }>;
}
