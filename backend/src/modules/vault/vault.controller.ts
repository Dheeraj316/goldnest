import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VaultService } from './vault.service';
import {
  AuditPacketDto,
  CloseOutPacketDto,
  CreateVaultDto,
  CreateVaultLocationDto,
  MovePacketDto,
  QueryPacketsDto,
  SealPacketDto,
  StorePacketDto,
} from './dto/vault.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('vault')
@ApiBearerAuth()
@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get('vaults')
  @RequirePermissions('vault.view')
  listVaults(@Query('branchId') branchId: string | undefined, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.listVaults(user, branchId);
  }

  @Post('vaults')
  @RequirePermissions('vault.manage')
  @Audit({ action: 'VAULT.CREATE', referenceType: 'Vault' })
  createVault(@Body() dto: CreateVaultDto, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.createVault(dto, user);
  }

  @Post('vaults/:id/locations')
  @RequirePermissions('vault.manage')
  @Audit({ action: 'VAULT.LOCATION.CREATE', referenceType: 'Vault' })
  addLocation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateVaultLocationDto, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.addLocation(id, dto, user);
  }

  @Get('collateral-awaiting')
  @RequirePermissions('vault.view')
  collateralAwaiting(@Query('branchId') branchId: string | undefined, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.collateralAwaitingPacket(user, branchId);
  }

  @Post('packets')
  @RequirePermissions('vault.manage')
  @Audit({ action: 'VAULT.PACKET.SEAL', referenceType: 'Packet' })
  sealPacket(@Body() dto: SealPacketDto, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.sealPacket(dto, user);
  }

  @Get('packets')
  @RequirePermissions('vault.view')
  listPackets(@Query() query: QueryPacketsDto, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.listPackets(query, user);
  }

  @Get('packets/:id')
  @RequirePermissions('vault.view')
  getPacket(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.getPacket(id, user);
  }

  @Post('packets/:id/store')
  @RequirePermissions('vault.manage')
  @Audit({ action: 'VAULT.PACKET.STORE', referenceType: 'Packet' })
  storePacket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StorePacketDto, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.storePacket(id, dto, user);
  }

  @Post('packets/:id/move')
  @RequirePermissions('vault.manage')
  @Audit({ action: 'VAULT.PACKET.MOVE', referenceType: 'Packet' })
  movePacket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MovePacketDto, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.movePacket(id, dto, user);
  }

  @Post('packets/:id/audit')
  @RequirePermissions('vault.manage')
  @Audit({ action: 'VAULT.PACKET.AUDIT', referenceType: 'Packet' })
  auditPacket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AuditPacketDto, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.auditPacket(id, dto, user);
  }

  @Post('packets/:id/close-out')
  @RequirePermissions('vault.manage')
  @Audit({ action: 'VAULT.PACKET.CLOSE_OUT', referenceType: 'Packet' })
  closeOutPacket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CloseOutPacketDto, @CurrentUser() user: JwtPayloadUser) {
    return this.vaultService.closeOutPacket(id, dto, user);
  }
}
