import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SUPER_ADMIN_EMAIL,
  isSuperAdminEmail,
  isSuperAdmin,
  isAdminLike,
} from "./superAdmin.js";

test("SUPER_ADMIN_EMAIL is the designated platform owner", () => {
  assert.equal(SUPER_ADMIN_EMAIL, "kdeyarmin@comcast.net");
});

test("isSuperAdminEmail matches case- and whitespace-insensitively", () => {
  assert.equal(isSuperAdminEmail("kdeyarmin@comcast.net"), true);
  assert.equal(isSuperAdminEmail("  KDeyarmin@Comcast.NET "), true);
  assert.equal(isSuperAdminEmail("someone@else.com"), false);
  assert.equal(isSuperAdminEmail(""), false);
  assert.equal(isSuperAdminEmail(null), false);
  assert.equal(isSuperAdminEmail(undefined), false);
});

test("isSuperAdmin is true for the owner email regardless of account_type", () => {
  assert.equal(isSuperAdmin({ email: "kdeyarmin@comcast.net", account_type: "user" }), true);
  assert.equal(isSuperAdmin({ email: "KDEYARMIN@COMCAST.NET" }), true);
});

test("isSuperAdmin is true for an explicit super_admin account_type", () => {
  assert.equal(isSuperAdmin({ email: "other@x.com", account_type: "super_admin" }), true);
});

test("isSuperAdmin is false for everyone else", () => {
  assert.equal(isSuperAdmin({ email: "other@x.com", account_type: "agency_admin" }), false);
  assert.equal(isSuperAdmin({ email: "other@x.com", role: "admin" }), false);
  assert.equal(isSuperAdmin(null), false);
  assert.equal(isSuperAdmin(undefined), false);
});

test("isAdminLike covers admin role, admin account types, and the owner", () => {
  assert.equal(isAdminLike({ role: "admin" }), true);
  assert.equal(isAdminLike({ account_type: "agency_admin" }), true);
  assert.equal(isAdminLike({ account_type: "super_admin" }), true);
  assert.equal(isAdminLike({ email: "kdeyarmin@comcast.net" }), true);
  assert.equal(isAdminLike({ email: "nurse@x.com", role: "user", account_type: "user" }), false);
  assert.equal(isAdminLike(null), false);
});
