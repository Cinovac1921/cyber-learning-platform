import { IsIn } from 'class-validator';
import { ROLES, type RoleValue } from '../../auth/roles';

export class UpdateRoleDto {
  @IsIn(ROLES)
  role!: RoleValue;
}
