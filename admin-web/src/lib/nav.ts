import { LayoutDashboard, Building2, Users, Contact, ShieldCheck, SlidersHorizontal, ScrollText, Package, FileText, Landmark, MessageSquare, PhoneCall, BarChart3, Gavel, Warehouse, Headset, ShieldAlert, Wallet, ArrowLeftRight, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

// Single source of truth for the dashboard's navigation — both the desktop Sidebar (lg+) and the
// MobileNav drawer (below lg) render this same list, so a new module only ever needs adding once.
export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/branches', label: 'Branches', icon: Building2, permission: 'branch.view' },
  { href: '/dashboard/employees', label: 'Employees', icon: Users, permission: 'employee.view' },
  { href: '/dashboard/customers', label: 'Customers', icon: Contact, permission: 'customer.view' },
  { href: '/dashboard/loan-products', label: 'Loan Products', icon: Package, permission: 'loan_product.view' },
  { href: '/dashboard/applications', label: 'Applications', icon: FileText, permission: 'loan_application.view' },
  { href: '/dashboard/loans', label: 'Loans', icon: Landmark, permission: 'loan.view' },
  { href: '/dashboard/collections', label: 'Collections', icon: PhoneCall, permission: 'collection.view' },
  { href: '/dashboard/auctions', label: 'Auctions', icon: Gavel, permission: 'auction.view' },
  { href: '/dashboard/vault', label: 'Vault', icon: Warehouse, permission: 'vault.view' },
  { href: '/dashboard/support', label: 'Support Tickets', icon: Headset, permission: 'ticket.view' },
  { href: '/dashboard/risk-alerts', label: 'Risk Alerts', icon: ShieldAlert, permission: 'risk.view' },
  { href: '/dashboard/cash', label: 'Cash Register', icon: Wallet, permission: 'cash.view' },
  { href: '/dashboard/reconciliation', label: 'Bank Reconciliation', icon: ArrowLeftRight, permission: 'reconciliation.view' },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, permission: 'report.view' },
  { href: '/dashboard/enquiries', label: 'Website Enquiries', icon: MessageSquare, permission: 'enquiry.view' },
  { href: '/dashboard/roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'role.view' },
  { href: '/dashboard/settings', label: 'Configuration', icon: SlidersHorizontal, permission: 'setting.view' },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: ScrollText, permission: 'audit_log.view' },
];
