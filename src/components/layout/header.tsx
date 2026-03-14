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
import { Bell, Menu, LogOut, User, Search, Settings, Plus } from "lucide-react";
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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white border-b border-gray-200 shadow-sm px-4 lg:px-6">
      {/* Left side: hamburger + New button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/cases?new=true">
          <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: "#4CAF50" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#43A047")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4CAF50")}
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </Link>
      </div>

      {/* Center: search bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            className="w-full h-9 pl-9 pr-4 rounded-lg text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors"
            style={{ backgroundColor: "#f5f5f5" }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = "#eeeeee";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(76,175,80,0.2)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = "#f5f5f5";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* Right side: icons + avatar */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <Link href="/notifications">
          <button className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-500 hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              3
            </span>
          </button>
        </Link>

        {/* Settings */}
        <Link href="/settings">
          <button className="inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-500 hover:bg-gray-100 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </Link>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center justify-center h-9 w-9 rounded-full ml-1 hover:ring-2 hover:ring-gray-200 transition-all">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-500 text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-lg shadow-lg border border-gray-200 p-1">
            <DropdownMenuLabel className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-emerald-500 text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer rounded-md text-gray-700">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer rounded-md text-gray-700">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600 cursor-pointer rounded-md"
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
