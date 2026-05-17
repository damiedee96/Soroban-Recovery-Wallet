"use client";

import React from "react";
import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adds a subtle glow border effect */
  glow?: "blue" | "green" | "red" | "yellow" | "none";
  /** Clickable card */
  onClick?: () => void;
  as?: "div" | "article" | "section";
}

const glowClasses = {
  blue: "ring-1 ring-stellar-500/40 shadow-stellar-500/10",
  green: "ring-1 ring-green-500/40 shadow-green-500/10",
  red: "ring-1 ring-red-500/40 shadow-red-500/10",
  yellow: "ring-1 ring-yellow-500/40 shadow-yellow-500/10",
  none: "",
};

export function Card({
  children,
  className,
  glow = "none",
  onClick,
  as: Tag = "div",
}: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        "bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 shadow-lg",
        glow !== "none" && glowClasses[glow],
        onClick && "cursor-pointer hover:bg-slate-800/80 transition-colors",
        className
      )}
    >
      {children}
    </Tag>
  );
}

// ─── Sub-components ───────────────────────────────────────────

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 bg-stellar-900/50 rounded-lg text-stellar-400">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={clsx("space-y-3", className)}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={clsx(
        "mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-end gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  icon,
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
          {subValue && (
            <p className="mt-0.5 text-sm text-slate-400">{subValue}</p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-stellar-900/40 rounded-xl text-stellar-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
