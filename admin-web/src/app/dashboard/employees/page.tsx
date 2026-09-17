import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { Branch, Employee, Role } from '@/lib/types';
import { NewEmployeeForm } from './NewEmployeeForm';
import { EmployeeRowActions } from './EmployeeRowActions';

export const metadata: Metadata = { title: 'Employees' };

export default async function EmployeesPage() {
  const user = await getCurrentUser();
  const canManage = hasPermission(user, 'employee.manage');

  const [employees, branches, roles] = await Promise.all([
    apiFetch<Employee[]>('/employees'),
    canManage ? apiFetch<Branch[]>('/branches') : Promise.resolve<Branch[]>([]),
    canManage ? apiFetch<Role[]>('/roles') : Promise.resolve<Role[]>([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${employees.length} employee${employees.length === 1 ? '' : 's'}`}
        action={canManage ? <NewEmployeeForm branches={branches} roles={roles} /> : undefined}
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
              <th className="px-5 py-3">Employee</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Branch</th>
              <th className="px-5 py-3">Mobile</th>
              <th className="px-5 py-3">Status</th>
              {canManage && <th className="px-5 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-100">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-ink">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-xs text-ink-light/60">{employee.employeeCode}</p>
                </td>
                <td className="px-5 py-3.5 text-ink-light">{employee.role.name}</td>
                <td className="px-5 py-3.5 text-ink-light">{employee.branch.code}</td>
                <td className="px-5 py-3.5 text-ink-light">{employee.mobile}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={employee.status} />
                </td>
                {canManage && (
                  <td className="px-5 py-3.5">
                    <EmployeeRowActions id={employee.id} status={employee.status} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
