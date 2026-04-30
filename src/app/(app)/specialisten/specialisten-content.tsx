"use client";

import {
  User,
  Building2,
  MapPin,
  Mail,
  Phone,
  Search,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GoogleMapsSearch } from "@/components/specialists/google-maps-search";
import type { Profile } from "@/lib/types";

interface SpecialistenContentProps {
  specialists: Profile[];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SpecialistenContent({ specialists }: SpecialistenContentProps) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Specialisten</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vind erkende asbestverwijderspecialisten in ons netwerk of via Google Maps
        </p>
      </div>

      <Card>
        <Tabs defaultValue="platform">
          <CardHeader className="pb-0">
            <TabsList className="w-full">
              <TabsTrigger value="platform" className="flex-1">
                <Users className="w-4 h-4 mr-2" />
                Ons netwerk ({specialists.length})
              </TabsTrigger>
              <TabsTrigger value="google" className="flex-1">
                <Search className="w-4 h-4 mr-2" />
                Zoek via Google Maps
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4">
            <TabsContent value="platform">
              {specialists.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium mb-1">
                    Geen specialisten in het netwerk
                  </p>
                  <p className="text-xs">
                    Gebruik het tabblad &ldquo;Zoek via Google Maps&rdquo; om specialisten
                    in jouw buurt te vinden.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {specialists.map((spec) => (
                    <Card key={spec.id} className="hover:shadow-md transition-shadow border">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-green-50 text-green-700 font-bold">
                              {getInitials(spec.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-sm">{spec.full_name}</h3>
                              <Badge variant="success">Erkend</Badge>
                            </div>
                            {spec.company_name && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                <Building2 className="w-3 h-3" />
                                {spec.company_name}
                              </div>
                            )}
                            {spec.company_address && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {spec.company_address}
                              </div>
                            )}
                            <div className="flex gap-2 mt-3">
                              {spec.email && (
                                <Button variant="outline" size="sm" className="text-xs" asChild>
                                  <a href={`mailto:${spec.email}`}>
                                    <Mail className="w-3 h-3 mr-1" />
                                    Contact
                                  </a>
                                </Button>
                              )}
                              {spec.phone && (
                                <Button variant="outline" size="sm" className="text-xs" asChild>
                                  <a href={`tel:${spec.phone}`}>
                                    <Phone className="w-3 h-3 mr-1" />
                                    Bel
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="google">
              <GoogleMapsSearch />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </>
  );
}
