"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileCard, ConsentCard } from "@/components/settings/profile-card";
import { PasswordCard } from "@/components/settings/password-card";
import { DataExportCard } from "@/components/settings/data-export-card";
import { TwoFactorForm } from "@/components/settings/two-factor-form";
import { SessionManager } from "@/components/settings/session-manager";
import { AccountDeletion } from "@/components/settings/account-deletion";
import { User, Shield, Monitor, Trash2 } from "lucide-react";

interface SettingsTabsProps {
  name: string;
  email: string;
  image: string | null;
  consentGivenAt: string | null;
  consentVersion: string | null;
  twoFactorEnabled: boolean;
}

export function SettingsTabs({
  name,
  email,
  image,
  consentGivenAt,
  consentVersion,
  twoFactorEnabled,
}: SettingsTabsProps) {
  const [tab, setTab] = useState("profile");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="profile">
          <User className="size-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="security">
          <Shield className="size-4" />
          Security
        </TabsTrigger>
        <TabsTrigger value="sessions">
          <Monitor className="size-4" />
          Sessions
        </TabsTrigger>
        <TabsTrigger value="account">
          <Trash2 className="size-4" />
          Account
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6 space-y-6">
        <ProfileCard
          name={name}
          email={email}
          image={image}
          consentGivenAt={consentGivenAt}
          consentVersion={consentVersion}
        />
        <ConsentCard consentGivenAt={consentGivenAt} consentVersion={consentVersion} />
      </TabsContent>

      <TabsContent value="security" className="mt-6 space-y-6">
        <PasswordCard />
        <TwoFactorForm enabled={twoFactorEnabled} />
      </TabsContent>

      <TabsContent value="sessions" className="mt-6">
        <SessionManager />
      </TabsContent>

      <TabsContent value="account" className="mt-6 space-y-6">
        <DataExportCard />
        <AccountDeletion />
      </TabsContent>
    </Tabs>
  );
}
