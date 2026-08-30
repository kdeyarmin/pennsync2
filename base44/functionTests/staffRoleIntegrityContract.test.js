import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const guard = readFileSync(
  join(process.cwd(), 'base44/functions/enforceStaffRoleIntegrity/entry.ts'),
  'utf8',
);
const userManagement = readFileSync(
  join(process.cwd(), 'base44/functions/userManagement/entry.ts'),
  'utf8',
);
const directCreate = readFileSync(
  join(process.cwd(), 'base44/functions/createUserWithTempPassword/entry.ts'),
  'utf8',
);

test('staff role integrity guard uses invitations as authoritative copy', () => {
  assert.match(guard, /UserInvitation\.list\('-updated_date', READ_LIMIT\)/);
  assert.match(guard, /User\.update\(row\.id,\s*\{\s*staff_role: authoritativeRole\s*\}\)/);
  assert.match(guard, /skipped_no_invitation/);
  assert.match(guard, /skipped_admin/);
});

test('admin staff_role changes update the authoritative invitation row', () => {
  assert.match(userManagement, /upsertAcceptedUserInvitationForUser/);
  assert.match(userManagement, /status:\s*'accepted'/);
  assert.match(userManagement, /normalizeEmail\(inv\.email \|\| inv\.invited_email\)/);
});

test('direct user creation seeds an accepted invitation authority row', () => {
  assert.match(directCreate, /UserInvitation\.create\(\{/);
  assert.match(directCreate, /status:\s*'accepted'/);
  assert.match(directCreate, /accepted_at:\s*now\.toISOString\(\)/);
});
