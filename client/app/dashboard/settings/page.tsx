'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import { showToast } from '@/lib/toast';
import { FiUser, FiLock, FiBell, FiSettings as FiSettingsIcon } from 'react-icons/fi';
import api from '@/lib/api';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      setProfileData({
        name: parsed.name || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
      });
    }
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const loadingToast = showToast.loading('Updating profile...');

    try {
      const response = await api.put('/auth/updatedetails', profileData);
      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        setUser(response.data.data);
        showToast.dismiss(loadingToast);
        showToast.success('Profile updated successfully!');
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast.error('Password must be at least 6 characters');
      return;
    }

    const loadingToast = showToast.loading('Updating password...');

    try {
      const response = await api.put('/auth/updatepassword', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        showToast.dismiss(loadingToast);
        showToast.success('Password updated successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Password update failed');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Settings" />

        <div className="p-8">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">Settings</h2>

          {/* Tabs */}
          <div className="mb-6 flex gap-4 border-b">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiUser />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium transition-colors ${
                activeTab === 'security'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiLock />
              Security
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiBell />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium transition-colors ${
                activeTab === 'company'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiSettingsIcon />
              Company
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Profile Information</h3>
              
              <form onSubmit={handleProfileUpdate}>
                <div className="max-w-2xl space-y-4">
                  <FormInput
                    label="Full Name"
                    required
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  />

                  <FormInput
                    label="Email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>

                  <FormInput
                    label="Phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  />

                  {user && (
                    <div className="rounded bg-gray-50 p-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600">Role:</span>
                          <span className="ml-2 font-medium">
                            {user.roleIds?.[0]?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Salary:</span>
                          <span className="ml-2 font-medium">₹{user.salary?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button type="submit">
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Change Password</h3>
              
              <form onSubmit={handlePasswordUpdate}>
                <div className="max-w-2xl space-y-4">
                  <FormInput
                    label="Current Password"
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />

                  <FormInput
                    label="New Password"
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />

                  <FormInput
                    label="Confirm New Password"
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />

                  <div className="rounded bg-blue-50 p-3 text-sm text-blue-800">
                    <strong>Password requirements:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>At least 6 characters long</li>
                      <li>Passwords must match</li>
                    </ul>
                  </div>

                  <Button type="submit">
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Notification Preferences</h3>
              
              <div className="max-w-2xl space-y-4">
                <label className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Task Assignments</p>
                    <p className="text-sm text-gray-500">Get notified when a task is assigned to you</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" defaultChecked />
                </label>

                <label className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Payout Notifications</p>
                    <p className="text-sm text-gray-500">Get notified when your payout is processed</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" defaultChecked />
                </label>

                <label className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">New Client Leads</p>
                    <p className="text-sm text-gray-500">Get notified about new client leads</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" />
                </label>

                <label className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Project Updates</p>
                    <p className="text-sm text-gray-500">Get notified about project status changes</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" defaultChecked />
                </label>

                <label className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Financial Alerts</p>
                    <p className="text-sm text-gray-500">Get notified about income and expense approvals</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" defaultChecked />
                </label>

                <Button>
                  Save Preferences
                </Button>
              </div>
            </div>
          )}

          {/* Company Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Company Information</h3>
                
                <div className="max-w-2xl space-y-4">
                  <FormInput
                    label="Company Name"
                    defaultValue="Connect Shiksha"
                    placeholder="Your company name"
                  />

                  <FormInput
                    label="GST Number"
                    placeholder="GSTIN"
                  />

                  <FormInput
                    label="PAN Number"
                    placeholder="PAN"
                  />

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Company Address
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Complete address..."
                    />
                  </div>

                  <Button>
                    Save Company Details
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">AWS S3 Configuration</h3>
                
                <div className="max-w-2xl space-y-4">
                  <FormInput
                    label="AWS Access Key ID"
                    type="password"
                    placeholder="Enter AWS Access Key"
                  />

                  <FormInput
                    label="AWS Secret Access Key"
                    type="password"
                    placeholder="Enter AWS Secret Key"
                  />

                  <FormInput
                    label="S3 Bucket Name"
                    placeholder="your-bucket-name"
                  />

                  <FormInput
                    label="AWS Region"
                    defaultValue="ap-south-1"
                    placeholder="ap-south-1"
                  />

                  <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
                    <strong>⚠️ Warning:</strong> These credentials are sensitive. Ensure they are stored securely.
                  </div>

                  <Button>
                    Save S3 Configuration
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Profit-Sharing Defaults</h3>
                
                <div className="max-w-2xl space-y-4">
                  <div className="rounded bg-blue-50 p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Current Profit-Sharing Rules</h4>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li>• <strong>Coaching:</strong> 70% retained, 30% to instructors</li>
                      <li>• <strong>Workshops:</strong> 60% retained, 30% team, 10% lead gen</li>
                      <li>• <strong>Guest Lectures:</strong> 70% retained, 30% to speaker</li>
                      <li>• <strong>Product Sales:</strong> 60% retained, 30% product team, 10% marketing</li>
                      <li>• <strong>Online Courses:</strong> 70% retained, 20% instructor, 10% editor</li>
                    </ul>
                  </div>

                  <p className="text-sm text-gray-600">
                    To modify profit-sharing rules, use the API endpoint or contact system administrator.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile Components */}
        <FABMenu />
        <MobileNavbar />
      </div>
    </div>
  );
}
