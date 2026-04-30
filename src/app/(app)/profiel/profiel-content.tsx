"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Hash,
  Camera,
  Loader2,
  Lock,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import type { Profile } from "@/lib/types";

interface ProfielContentProps {
  profile: Profile;
}

export function ProfielContent({ profile }: ProfielContentProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone || "");
  const [companyName, setCompanyName] = useState(profile.company_name || "");
  const [companyVat, setCompanyVat] = useState(profile.company_vat || "");
  const [companyAddress, setCompanyAddress] = useState(profile.company_address || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const timestamp = Date.now();
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("property-media")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("property-media").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);

      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);

      toast({ title: "Avatar bijgewerkt", variant: "success" });
    } catch (err) {
      console.error("Avatar upload failed:", err);
      toast({ title: "Avatar upload mislukt", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({ title: "Volledige naam is verplicht", variant: "destructive" });
      return;
    }

    if (phone && !/^(\+32|0)\d{8,9}$/.test(phone.replace(/[\s.-]/g, ""))) {
      toast({
        title: "Ongeldig telefoonnummer",
        description: "Gebruik Belgisch formaat: +32... of 0...",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          company_name: companyName.trim() || null,
          company_vat: companyVat.trim() || null,
          company_address: companyAddress.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({ title: "Profiel opgeslagen", variant: "success" });
      router.refresh();
    } catch (err) {
      console.error("Profile save failed:", err);
      toast({ title: "Opslaan mislukt", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("Wachtwoord moet minimaal 6 tekens bevatten.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Wachtwoorden komen niet overeen.");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Wachtwoord gewijzigd", variant: "success" });
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Mijn profiel</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Beheer je persoonlijke gegevens en instellingen
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Avatar section */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center">
            <Avatar className="h-24 w-24 mb-4">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="font-bold text-lg">{fullName}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              {profile.role === "owner" ? "Eigenaar" : "Specialist"}
            </p>
            <Separator className="my-4 w-full" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              {uploadingAvatar ? "Uploaden..." : "Foto wijzigen"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
          </CardContent>
        </Card>

        {/* Profile form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Persoonlijke gegevens</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Volledige naam <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mailadres</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profile.email}
                      className="pl-9"
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefoonnummer</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+32 470 12 34 56"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Bedrijfsnaam</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      placeholder="Bijv. AsbestFree BV"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyVat">BTW-nummer</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyVat"
                      placeholder="BE0123.456.789"
                      value={companyVat}
                      onChange={(e) => setCompanyVat(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Bedrijfsadres</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyAddress"
                      placeholder="Industrielaan 5, 9000 Gent"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Profiel opslaan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Password change */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Wachtwoord wijzigen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nieuw wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Min. 6 tekens"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9"
                  minLength={6}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Herhaal wachtwoord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  minLength={6}
                  required
                />
              </div>
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            <Button type="submit" variant="outline" disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wijzigen...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Wachtwoord wijzigen
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
