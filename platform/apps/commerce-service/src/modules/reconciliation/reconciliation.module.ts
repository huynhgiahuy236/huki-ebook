import { Module } from '@nestjs/common';
import { FinanceReconciliationService } from './finance-reconciliation.service';
import { FinanceReconciliationController } from './finance-reconciliation.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceReconciliationController],
  providers: [FinanceReconciliationService],
  exports: [FinanceReconciliationService],
})
export class ReconciliationModule {}
