import type { StoredUser } from "./types";

export const AUTH_KEY = "gymation_auth";
export const USERS_KEY = "gymation_users";
export const RESET_TOKENS_KEY = "gymation_reset_tokens";
export const OWNER_DATA_PREFIX = "gym_owner_data_";

export const DEFAULT_USERS: StoredUser[] = [
  {
    id: "user-owner-a",
    email: "ownerA@test.com",
    password: "password123",
    name: "Owner A",
    gymName: "Paradise Fitness",
    phone: "+91 98765 00001",
    role: "Gym Owner",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-owner-b",
    email: "ownerB@test.com",
    password: "password123",
    name: "Owner B",
    gymName: "Fitness Hub",
    phone: "+91 98765 00002",
    role: "Gym Owner",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-admin",
    email: "admin@gymation.com",
    password: "admin123",
    name: "Admin User",
    gymName: "Gymation Fitness",
    phone: "+91 98765 00000",
    role: "Gym Owner",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_ADMIN = DEFAULT_USERS[0];
