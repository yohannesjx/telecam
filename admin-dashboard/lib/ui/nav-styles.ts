import { cn } from "@/lib/utils";

export const navItemBase =
  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200";

export const navItemInactive =
  "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-900";

export const navItemActive =
  "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/80 ring-1 ring-inset ring-indigo-200/60";

export function navItemClass(
  active: boolean,
  collapsed = false,
  className?: string,
) {
  return cn(
    navItemBase,
    active ? navItemActive : navItemInactive,
    collapsed && "justify-center px-2",
    className,
  );
}

export const navActiveIndicator =
  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500";

export const sidebarShellExpanded =
  "flex h-full w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl";

export const sidebarShellCollapsed =
  "flex h-full w-[4.5rem] shrink-0 flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl";

export function sidebarShellClass(collapsed: boolean, className?: string) {
  return cn(
    "transition-[width,transform] duration-200 ease-in-out",
    collapsed ? sidebarShellCollapsed : sidebarShellExpanded,
    className,
  );
}

export const sidebarLogoArea =
  "flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 px-5";

export const sidebarNavArea = "flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3";

export const sidebarFooterArea =
  "shrink-0 border-t border-slate-200/80 bg-slate-50/50 p-4";
