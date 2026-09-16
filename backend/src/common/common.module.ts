import { Global, Module } from '@nestjs/common';
import { BranchScopeService } from './guards/branch-scope.service';

// Cross-cutting, stateless helpers shared by every feature module.
@Global()
@Module({
  providers: [BranchScopeService],
  exports: [BranchScopeService],
})
export class CommonModule {}
