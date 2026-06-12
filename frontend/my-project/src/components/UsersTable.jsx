import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers } from "@/lib/api";
import { PlusIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE_OPTIONS = [10, 20, 40, 100];

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default function UsersTable() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async (page, perPage) => {
    setLoading(true);
    setError("");

    try {
      const data = await getUsers({ page, limit: perPage });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(pagination.page, pagination.perPage);
  }, [pagination.page, pagination.perPage, fetchUsers]);

  function handlePageChange(nextPage) {
    setPagination((prev) => ({ ...prev, page: nextPage }));
  }

  function handlePerPageChange(value) {
    setPagination((prev) => ({
      ...prev,
      perPage: Number(value),
      page: 1,
    }));
  }

  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.perPage + 1;
  const end = Math.min(pagination.page * pagination.perPage, pagination.total);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Users</CardTitle>
          <CardDescription>Contacts you have added to your account.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !error && (
            <Badge variant="secondary">{pagination.total} total</Badge>
          )}
          <Button size="sm" asChild>
            <Link to="/create">
              <PlusIcon />
              Add contact
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && <TableSkeleton rows={pagination.perPage > 5 ? 5 : pagination.perPage} />}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.firstName || "—"}</TableCell>
                      <TableCell>{user.lastName || "—"}</TableCell>
                      <TableCell>{user.email || "—"}</TableCell>
                      <TableCell>{user.companyName || "—"}</TableCell>
                      <TableCell>{user.phone || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {pagination.total > 0 && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {start}–{end} of {pagination.total}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Per page</span>
                    <Select
                      value={String(pagination.perPage)}
                      onValueChange={handlePerPageChange}
                    >
                      <SelectTrigger size="sm" className="w-[72px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      Previous
                    </Button>
                    <span className="min-w-[80px] text-center text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
