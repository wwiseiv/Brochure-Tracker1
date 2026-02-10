import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search, Phone, Mail, ChevronRight, Loader2, MessageSquare } from "lucide-react";
import { handleCall, handleSms, handleEmail, SMS_TEMPLATES } from "@/lib/auto-communication";
import CopyMessageModal from "@/components/auto/CopyMessageModal";

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
  const [, navigate] = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [smsModal, setSmsModal] = useState<{ phone: string; message: string } | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await autoFetch("/api/customers");
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
          <Link href="/customers/new">
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
              <div
                key={customer.id}
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="cursor-pointer"
              >
                <Card className="hover-elevate" data-testid={`card-customer-${customer.id}`}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{customer.firstName} {customer.lastName}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                        {customer.phone && <span>{customer.phone}</span>}
                        {customer.phone && customer.email && <span>·</span>}
                        {customer.email && <span>{customer.email}</span>}
                        {(customer.phone || customer.email) && customer.city && customer.state && <span>·</span>}
                        {customer.city && customer.state && (
                          <span>{customer.city}, {customer.state}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {customer.phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            const token = localStorage.getItem("pcb_auto_token") || "";
                            handleCall(customer.phone!, customer.id, token);
                          }}
                          data-testid={`button-call-customer-${customer.id}`}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                      {customer.phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            const token = localStorage.getItem("pcb_auto_token") || "";
                            const msg = SMS_TEMPLATES.general("Demo Auto Shop", `${customer.firstName} ${customer.lastName}`);
                            const result = handleSms(customer.phone!, msg, customer.id, token);
                            if (!result.isMobile) {
                              setSmsModal({ phone: result.phone, message: result.body });
                            }
                          }}
                          data-testid={`button-text-customer-${customer.id}`}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                      {customer.email && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            const token = localStorage.getItem("pcb_auto_token") || "";
                            handleEmail(
                              customer.email!,
                              `From Demo Auto Shop`,
                              `Hi ${customer.firstName},\n\n`,
                              customer.id,
                              token
                            );
                          }}
                          data-testid={`button-email-customer-${customer.id}`}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
      <CopyMessageModal
        open={!!smsModal}
        onOpenChange={(o) => !o && setSmsModal(null)}
        phone={smsModal?.phone || ""}
        message={smsModal?.message || ""}
      />
    </AutoLayout>
  );
}
