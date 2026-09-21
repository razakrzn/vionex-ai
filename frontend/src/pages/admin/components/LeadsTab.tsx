import { useState, useEffect, useMemo } from "react";
import { Search, Mail, Phone, User, Calendar, Building2, Loader2, RefreshCw, MessageSquare, PhoneCall, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAllContactsApi, type Contact } from "@/services/admin/properties";
import { format } from "date-fns";

export const LeadsTab = () => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const response = await getAllContactsApi();
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data;
        let contactsArray: Contact[] = [];
        
        if (Array.isArray(responseData?.data)) {
          contactsArray = responseData.data;
        } else if (Array.isArray(responseData)) {
          contactsArray = responseData;
        } else if (responseData?.success && Array.isArray(responseData?.data)) {
          contactsArray = responseData.data;
        }
        
        setContacts(contactsArray);
      } else {
        setContacts([]);
      }
    } catch (error: any) {
      console.error("Error loading contacts:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load contacts. Please try again.",
        variant: "destructive",
      });
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) {
      return contacts;
    }
    
    const query = searchQuery.toLowerCase();
    return contacts.filter((contact) => {
      return (
        contact.seeker_name?.toLowerCase().includes(query) ||
        contact.seeker_email?.toLowerCase().includes(query) ||
        contact.seeker_phone?.toLowerCase().includes(query) ||
        contact.owner_name?.toLowerCase().includes(query) ||
        contact.owner_email?.toLowerCase().includes(query) ||
        contact.owner_phone?.toLowerCase().includes(query) ||
        contact.property_title?.toLowerCase().includes(query) ||
        contact.contact_method?.toLowerCase().includes(query)
      );
    });
  }, [contacts, searchQuery]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  const handleWhatsAppClick = (contact: Contact) => {
    const seekerPhone = contact.seeker_phone?.replace(/\s+/g, "").replace(/\+/g, "") || "";
    const seekerName = contact.seeker_name || "there";
    const propertyTitle = contact.property_title || "the property";
    
    // Format phone number (remove spaces and ensure it starts with country code)
    const phoneNumber = seekerPhone.startsWith("971") ? seekerPhone : `971${seekerPhone}`;
    
    // Create WhatsApp message
    const message = `Hi ${seekerName}, regarding the property "${propertyTitle}" you inquired about. How can I assist you?`;
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp Web/App
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Leads
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and view all property contact inquiries.
          </p>
        </div>
        <Button variant="outline" onClick={loadContacts} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
          placeholder="Search by seeker, owner, property, or contact method..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-muted/30 border-glass-border"
        />
      </div>

      {/* Contacts Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <Card className="glass neon-border">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "No contacts found matching your search." : "No contacts available."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass neon-border">
          <CardHeader>
            <CardTitle>All Contacts ({filteredContacts.length})</CardTitle>
            <CardDescription>List of all property inquiry contacts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seeker</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Contact Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {contact.seeker_name || "N/A"}
                            </span>
                          </div>
                          {contact.seeker_email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{contact.seeker_email}</span>
                            </div>
                          )}
                          {contact.seeker_phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{contact.seeker_phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {contact.owner_name || "N/A"}
                            </span>
                          </div>
                          {contact.owner_email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{contact.owner_email}</span>
                            </div>
                          )}
                          {contact.owner_phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{contact.owner_phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.property_title ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{contact.property_title}</span>
                              {contact.property_id && (
                                <Badge variant="outline" className="text-xs w-fit mt-1">
                                  ID: {contact.property_id}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contact.contact_method === "whatsapp" ? (
                            <MessageSquare className="h-4 w-4 text-green-500" />
                          ) : contact.contact_method === "call" ? (
                            <PhoneCall className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Phone className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Badge 
                            variant={contact.contact_method === "whatsapp" ? "default" : "secondary"}
                            className="capitalize"
                          >
                            {contact.contact_method || "N/A"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(contact.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {contact.seeker_phone ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWhatsAppClick(contact)}
                            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

