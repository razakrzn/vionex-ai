// Users store for managing users (admins, partners, moderators)
// In production, this should be replaced with a database

import type { User, UserRole, UserStatus } from "@/pages/admin/types";

// Simple in-memory store (replace with database in production)
class UsersStore {
  private users: User[] = [];
  private listeners: Set<() => void> = new Set();

  // Initialize with some sample users
  initialize(): void {
    if (this.users.length === 0) {
      // Add sample admin user
      this.users.push({
        id: "admin_1",
        name: "Admin User",
        email: "admin@vionex.ai",
        phone: "+971 50 123 4567",
        role: "admin",
        status: "active",
        joinedDate: new Date().toLocaleDateString(),
        lastLogin: new Date().toLocaleDateString(),
        listingCount: 0,
      });
    }
    this.notifyListeners();
  }

  getUsers(): User[] {
    return [...this.users];
  }

  getUser(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getUsersByRole(role: UserRole): User[] {
    return this.users.filter((u) => u.role === role);
  }

  getUsersByStatus(status: UserStatus): User[] {
    return this.users.filter((u) => u.status === status);
  }

  addUser(user: Omit<User, "id" | "joinedDate" | "lastLogin" | "listingCount">): User {
    const newUser: User = {
      ...user,
      id: `user_${Date.now()}`,
      joinedDate: new Date().toLocaleDateString(),
      lastLogin: new Date().toLocaleDateString(),
      listingCount: 0,
    };
    this.users.push(newUser);
    this.notifyListeners();
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): void {
    const index = this.users.findIndex((u) => u.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates };
      this.notifyListeners();
    }
  }

  deleteUser(id: string): void {
    this.users = this.users.filter((u) => u.id !== id);
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const usersStore = new UsersStore();

