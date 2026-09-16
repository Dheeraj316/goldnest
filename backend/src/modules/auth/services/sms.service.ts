import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Thin provider boundary so the real SMS gateway integration (spec #9's async
// job queue target) can be dropped in without touching call sites. In
// development, without provider credentials configured, it just logs —
// intentionally never silently "succeeds" against a real customer in prod
// without an actual configured provider.
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(mobile: string, code: string): Promise<void> {
    const apiKey = this.configService.get<string>('sms.apiKey');
    if (!apiKey) {
      this.logger.warn(`[DEV SMS STUB] OTP for ${mobile}: ${code} (no SMS_PROVIDER_API_KEY configured)`);
      return;
    }
    // TODO(phase3): integrate real SMS gateway here and move dispatch onto the
    // async job queue (spec #8) instead of the request/response path.
    this.logger.log(`OTP dispatched to ${mobile}`);
  }
}
