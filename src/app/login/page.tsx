"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Lock, User, ArrowRight } from "lucide-react";
import type { UserRole } from "@/lib/types";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("owner");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Controleer je e-mail voor de bevestigingslink.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Asbest<span className="text-primary">Control</span>
          </h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {mode === "login" ? "Inloggen" : "Account aanmaken"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Log in op je AsbestControl account"
                : "Maak een nieuw account aan"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
              <div className="space-y-4">
                {mode === "register" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Volledige naam</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          placeholder="Jan Janssens"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Rol</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole("owner")}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            role === "owner"
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Building2 className="w-4 h-4 mx-auto mb-1" />
                          Eigenaar
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole("specialist")}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            role === "specialist"
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <User className="w-4 h-4 mx-auto mb-1" />
                          Specialist
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole("broker")}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            role === "broker"
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <User className="w-4 h-4 mx-auto mb-1" />
                          Makelaar
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E-mailadres</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="jan@voorbeeld.be"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Wachtwoord</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 6 tekens"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {message && (
                  <p className={`text-sm ${message.includes("Controleer") ? "text-green-600" : "text-destructive"}`}>
                    {message}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    "Bezig..."
                  ) : (
                    <>
                      {mode === "login" ? "Inloggen" : "Registreren"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Nog geen account?{" "}
                  <button
                    onClick={() => { setMode("register"); setMessage(""); }}
                    className="text-primary font-medium hover:underline"
                  >
                    Registreer hier
                  </button>
                </>
              ) : (
                <>
                  Al een account?{" "}
                  <button
                    onClick={() => { setMode("login"); setMessage(""); }}
                    className="text-primary font-medium hover:underline"
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
