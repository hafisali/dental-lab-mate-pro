"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Menu, LogOut, User, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user as any;

  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-md px-4 lg:px-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden hover:bg-slate-100">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <div className="p-1.5 rounded-lg bg-slate-100">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <span className="font-medium text-slate-600">{user?.labName || "Dental Lab"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 rounded-xl">
            <Bell className="h-5 w-5 text-slate-500" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
              3
            </span>
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2.5 px-2 hover:bg-slate-100 rounded-xl">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-sky-400 to-blue-600 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-slate-700">{user?.name}</span>
                <span className="text-[11px] text-slate-400 font-medium">{user?.role}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-slate-200">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
