'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { dataManagementAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { showToast } from '@/lib/toast';
import { 
  FiDatabase, 
  FiDownload, 
  FiTrash2, 
  FiAlertTriangle, 
  FiCheckCircle,
  FiFileText,
  FiUsers,
  FiFolder,
  FiDollarSign,
  FiCalendar,
  FiUpload
} from 'react-icons/fi';

export default function DataManagementPage() {
  const router = useRouter();
  const { isFounder, permissionsLoading, userRole, hasPermission } = usePermissions();
  const [showClearModal, setShowClearModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [dataStats, setDataStats] = useState({
    users: 0,
    teams: 0,
    projects: 0,
    income: 0,
    expenses: 0,
    payroll: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [hasCheckedPermissions, setHasCheckedPermissions] = useState(false);

  // Check if user has data management access
  const hasDataManagementAccess = isFounder || hasPermission('users.delete') || userRole === 'FOUNDER';
  
  // Handle undefined permissionsLoading
  const isLoading = permissionsLoading === true;
  
  // Allow access if user is clearly a founder, even if permissions are still loading
  const shouldAllowAccess = hasDataManagementAccess || (userRole === 'FOUNDER' && !isLoading);

  // Track when permissions are fully loaded
  useEffect(() => {
    if (!isLoading && userRole) {
      setHasCheckedPermissions(true);
    }
  }, [isLoading, userRole]);

  // Fetch data statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dataManagementAPI.getStats();
        if (response.data.success) {
          setDataStats(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (shouldAllowAccess && !isLoading) {
      fetchStats();
    }
  }, [shouldAllowAccess, isLoading]);

  if (hasCheckedPermissions && !shouldAllowAccess) {
    console.log('Data Management - Redirecting to dashboard:', {
      permissionsLoading,
      isLoading,
      isFounder,
      hasUsersDeletePermission: hasPermission('users.delete'),
      userRole,
      hasDataManagementAccess,
      shouldAllowAccess,
      hasCheckedPermissions
    });
    router.push('/dashboard');
    return null;
  }

  console.log('Data Management - Rendering page:', {
    permissionsLoading,
    isLoading,
    isFounder,
    hasUsersDeletePermission: hasPermission('users.delete'),
    userRole,
    hasDataManagementAccess,
    shouldAllowAccess,
    hasCheckedPermissions
  });

  if (isLoading || !hasCheckedPermissions) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto pt-16 md:pt-0">
          <Header title="Data Management" />
          <div className="p-8">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await dataManagementAPI.exportData();
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connect-shiksha-data-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success('Data exported successfully!');
      setShowExportModal(false);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    if (confirmText !== 'DELETE ALL DATA') {
      showToast.error('Please type "DELETE ALL DATA" to confirm');
      return;
    }

    setIsClearing(true);
    try {
      const response = await dataManagementAPI.clearData();
      
      if (response.data.success) {
        const preserved = response.data.preserved;
        showToast.success(`All data cleared successfully! Your founder account (${preserved.founderEmail}) and system roles have been preserved.`);
        setShowClearModal(false);
        setConfirmText('');
        
        // Show a brief message before redirecting
        setTimeout(() => {
          showToast.info('You will be redirected to login in 3 seconds...');
        }, 1000);
        
        // Redirect to login after clearing data
        setTimeout(() => {
          localStorage.clear();
          router.push('/login');
        }, 3000);
      } else {
        throw new Error(response.data.message || 'Clear data failed');
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Clear data failed');
    } finally {
      setIsClearing(false);
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      showToast.error('Please select a ZIP file to import');
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await dataManagementAPI.importData(formData);
      
      if (response.data.success) {
        const { importResults, metadata, errors } = response.data;
        const totalImported = Object.values(importResults).reduce((sum: number, count: any) => sum + count, 0);
        
        showToast.success(`Data import completed! ${totalImported} records imported successfully.`);
        
        if (errors && errors.length > 0) {
          console.warn('Import warnings:', errors);
          showToast.info(`Import completed with ${errors.length} warnings. Check console for details.`);
        }
        
        setShowImportModal(false);
        setImportFile(null);
        
        // Refresh stats
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Import failed');
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        setImportFile(file);
      } else {
        showToast.error('Please select a ZIP file');
        event.target.value = '';
      }
    }
  };

  const statsCards = [
    { label: 'Users', count: loadingStats ? 'Loading...' : dataStats.users.toLocaleString(), icon: FiUsers, color: 'text-blue-600' },
    { label: 'Projects', count: loadingStats ? 'Loading...' : dataStats.projects.toLocaleString(), icon: FiFolder, color: 'text-green-600' },
    { label: 'Teams', count: loadingStats ? 'Loading...' : dataStats.teams.toLocaleString(), icon: FiUsers, color: 'text-purple-600' },
    { label: 'Income Records', count: loadingStats ? 'Loading...' : dataStats.income.toLocaleString(), icon: FiDollarSign, color: 'text-green-600' },
    { label: 'Expense Records', count: loadingStats ? 'Loading...' : dataStats.expenses.toLocaleString(), icon: FiDollarSign, color: 'text-red-600' },
    { label: 'Payroll Records', count: loadingStats ? 'Loading...' : dataStats.payroll.toLocaleString(), icon: FiCalendar, color: 'text-orange-600' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Data Management" />

        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
            <p className="mt-2 text-gray-600">
              Manage and export your organization's data. Use with extreme caution.
            </p>
          </div>

          {/* Data Statistics */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {statsCards.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg p-6 shadow">
                  <div className="flex items-center">
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Export Data Card */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center mb-6">
                <FiDownload className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-gray-900">Export All Data</h3>
                  <p className="text-gray-600">Download a complete backup of all data</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">What's included:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• All user accounts and profiles</li>
                    <li>• Complete project and team data</li>
                    <li>• All financial records (income, expenses, payroll)</li>
                    <li>• Task assignments and progress</li>
                    <li>• Client information and contacts</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={() => setShowExportModal(true)}
                  className="w-full"
                  variant="outline"
                >
                  <FiDownload className="mr-2" />
                  Export Data
                </Button>
              </div>
            </div>

            {/* Import Data Card */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center mb-6">
                <FiUpload className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-gray-900">Import/Restore Data</h3>
                  <p className="text-gray-600">Restore data from a previous backup</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">How to restore:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Select a ZIP file from previous export</li>
                    <li>• All data will be restored</li>
                    <li>• Your founder account is preserved</li>
                    <li>• Existing data will be replaced</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={() => setShowImportModal(true)}
                  className="w-full"
                  variant="outline"
                >
                  <FiUpload className="mr-2" />
                  Import Data
                </Button>
              </div>
            </div>

            {/* Clear Data Card */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-red-200">
              <div className="flex items-center mb-6">
                <FiTrash2 className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-red-900">Clear All Data</h3>
                  <p className="text-red-600">Permanently delete all data from the system</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <FiAlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-red-900 mb-2">⚠️ WARNING: This action is irreversible!</h4>
                      <ul className="text-sm text-red-800 space-y-1">
                        <li>• All user accounts will be deleted</li>
                        <li>• All projects and teams will be removed</li>
                        <li>• All financial data will be permanently lost</li>
                        <li>• All tasks and assignments will be deleted</li>
                        <li>• This action cannot be undone</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setShowClearModal(true)}
                  className="w-full"
                  variant="danger"
                >
                  <FiTrash2 className="mr-2" />
                  Clear All Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Confirmation Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export All Data"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center p-4 bg-blue-50 rounded-lg">
            <FiFileText className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-blue-900">Data Export</p>
              <p className="text-sm text-blue-700">
                This will create a ZIP file containing all your organization's data in JSON format.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">The export will include:</p>
            <ul className="text-sm text-gray-700 space-y-1 ml-4">
              <li>• User accounts and roles</li>
              <li>• Teams and project data</li>
              <li>• Financial records (income, expenses, payroll)</li>
              <li>• Task assignments and progress</li>
              <li>• Client information</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <FiDownload className="mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Data Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear All Data"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start p-4 bg-red-50 rounded-lg">
            <FiAlertTriangle className="h-6 w-6 text-red-600 mr-3 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">⚠️ DANGER: This action is irreversible!</p>
              <p className="text-sm text-red-700 mt-1">
                This will permanently delete ALL data from the system. This action cannot be undone.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">The following data will be permanently deleted:</p>
            <ul className="text-sm text-gray-700 space-y-1 ml-4">
              <li>• All user accounts and profiles (except your founder account)</li>
              <li>• All teams and projects</li>
              <li>• All financial records (income, expenses, payroll)</li>
              <li>• All task assignments and progress</li>
              <li>• All client information</li>
              <li>• All advance payment requests</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-start">
              <FiCheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 mb-1">What will be preserved:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Your founder account and login credentials</li>
                  <li>• All system roles and permissions</li>
                  <li>• System settings and configurations</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">DELETE ALL DATA</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Type DELETE ALL DATA to confirm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowClearModal(false);
                setConfirmText('');
              }}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleClearData}
              disabled={isClearing || confirmText !== 'DELETE ALL DATA'}
            >
              {isClearing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Clearing...
                </>
              ) : (
                <>
                  <FiTrash2 className="mr-2" />
                  Clear All Data
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Data Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import/Restore Data"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <FiUpload className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-green-900">Data Import</p>
              <p className="text-sm text-green-700">
                Select a ZIP file from a previous export to restore your data.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select ZIP file:
            </label>
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {importFile && (
              <p className="text-sm text-green-600">
                Selected: {importFile.name} ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start">
              <FiAlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-1">Important Notes:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Existing data will be replaced with imported data</li>
                  <li>• Your founder account will be preserved</li>
                  <li>• Make sure the ZIP file is from a valid export</li>
                  <li>• The import process may take a few minutes</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportData}
              disabled={isImporting || !importFile}
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <FiUpload className="mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Mobile Components */}
      <FABMenu />
      <MobileNavbar />
    </div>
  );
}