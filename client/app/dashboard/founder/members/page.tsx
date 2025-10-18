'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { roleAPI, teamAPI, userAPI } from '@/lib/api';

export default function FounderMembersPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    teamId: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const [rolesRes, teamsRes, usersRes] = await Promise.all([
          roleAPI.getAll(),
          teamAPI.getAll(),
          userAPI.getAll(),
        ]);
        if (rolesRes.data.success) setRoles(rolesRes.data.data);
        if (teamsRes.data.success) setTeams(teamsRes.data.data);
        if (usersRes.data.success) setUsers(usersRes.data.data);
      } catch (e: any) {
        showToast.error(e.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createMember = async () => {
    if (!form.name || !form.email || !form.phone || !form.password || !form.roleId) {
      showToast.error('Fill all required fields');
      return;
    }
    try {
      const res = await userAPI.create({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        roleIds: [form.roleId],
      });
      if (res.data.success) {
        const newUser = res.data.data;
        if (form.teamId) {
          const t = teams.find((x) => x._id === form.teamId);
          if (t) {
            const memberIds = Array.from(new Set([...(t.members || []).map((m: any) => m?._id || m), newUser._id]));
            await teamAPI.update(t._id, { members: memberIds });
          }
        }
        showToast.success('Member created');
        const usersRes = await userAPI.getAll();
        if (usersRes.data.success) setUsers(usersRes.data.data);
        setForm({ name: '', email: '', phone: '', password: '', roleId: '', teamId: '' });
      }
    } catch (e: any) {
      showToast.error(e.response?.data?.message || 'Creation failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Founder - Members" />
          <div className="flex h-96 items-center justify-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Header title="Founder - Members" />
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Add Member & Assign Team</h2>
            <p className="mt-1 text-sm text-gray-600">Founder-only quick management</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <FormInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FormInput label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <FormInput label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <FormSelect
                label="Role"
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                options={[{ value: '', label: 'Select role' }, ...roles.map((r: any) => ({ value: r._id, label: r.name }))]}
              />
              <FormSelect
                label="Assign Team (optional)"
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                options={[{ value: '', label: 'Select team' }, ...teams.map((t: any) => ({ value: t._id, label: t.name }))]}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={createMember}>Add Member</Button>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">Current Members</h3>
            <div className="divide-y">
              {users.map((u: any) => (
                <div key={u._id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-gray-500">{u.email}</div>
                    </div>
                    <div className="text-gray-600">{u.roleIds?.map((r: any) => r.name).join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


