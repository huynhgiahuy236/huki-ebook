import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { UserService } from './user.service';

@Injectable()
export class UserPurgeCron implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(UserPurgeCron.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly userService: UserService) {}

  onApplicationBootstrap(): void {
    // Run an initial purge on startup
    void this.userService
      .purgeExpiredPendingDeletions()
      .catch((error) => this.logger.error('Failed to run initial user purge', error));

    // Schedule hourly purge
    this.timer = setInterval(() => {
      void this.userService
        .purgeExpiredPendingDeletions()
        .catch((error) => this.logger.error('Failed to run hourly user purge', error));
    }, 60 * 60 * 1000); // 1 hour
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}

