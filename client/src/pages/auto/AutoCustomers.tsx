import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search, Phone, Mail, ChevronRight, Loader2 } from "lucide-react";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

export default function AutoCustomers() {
  const { autoFetch } = useAutoAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await autoFetch("/api/auto/customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [autoFetch]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${c.firstName} ${c.lastName}`.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.phone?.includes(s);
  });

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-customers-title">
            <Users className="h-5 w-5" /> Customers
          </h1>
          <Link href="/auto/customers/new">
            <Button className="gap-2" data-testid="button-add-customer">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-customers"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {search ? "No customers match your search" : "No customers yet. Add your first customer!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((customer) => (
              <Link key={customer.id} href={`/auto/customers/${customer.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-customer-${customer.id}`}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{customer.firstName} {customer.lastName}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {customer.email}
                          </span>
                        )}
                        {customer.city && customer.state && (
                          <span>{customer.city}, {customer.state}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AutoLayout>
  );
}
