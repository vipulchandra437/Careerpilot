"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shield, User, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  submissions: number;
  interviews: number;
  projects: number;
  scoreEvents: number;
};

export function UsersManager({ users: initial }: { users: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setRole(user: AdminUser, role: "STUDENT" | "ADMIN") {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update role");
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: data.role } : u)));
      toast.success("Role updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(user: AdminUser) {
    if (!confirm(`Delete ${user.email}? This removes all their data.`)) return;
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete user");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success("User deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{users.length} users</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Subs</TableHead>
              <TableHead className="text-right">Interviews</TableHead>
              <TableHead className="text-right">Score events</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "secondary" : "outline"}>{u.role.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{u.submissions}</TableCell>
                  <TableCell className="text-right">{u.interviews}</TableCell>
                  <TableCell className="text-right">{u.scoreEvents}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {u.role === "ADMIN" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === u.id}
                          onClick={() => setRole(u, "STUDENT")}
                        >
                          {busyId === u.id ? <Loader2 className="size-3 animate-spin" /> : <User className="size-3" />}
                          Make student
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busyId === u.id} onClick={() => setRole(u, "ADMIN")}>
                          {busyId === u.id ? <Loader2 className="size-3 animate-spin" /> : <Shield className="size-3" />}
                          Make admin
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" disabled={busyId === u.id} onClick={() => remove(u)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
