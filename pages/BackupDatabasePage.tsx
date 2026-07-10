import React, { useState } from 'react';
import { api } from '../apiClient';
import * as Icons from '../components/icons/Icons';

const BackupDatabasePage: React.FC<{ title?: string }> = ({ title = 'Backup & Restore Database' }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage({ type: 'info', text: 'Preparing database backup... This may take a few moments.' });
    
    try {
      const data = await api.get('/api/backup/export');
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Database exported successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to export database' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be uploaded again if needed
    e.target.value = '';

    setLoading(true);
    setMessage({ type: 'info', text: 'Reading backup file...' });

    try {
      const text = await file.text();
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch (parseErr) {
        throw new Error("Selected file is not a valid JSON backup file.");
      }

      setMessage({ type: 'info', text: 'Restoring database... Please do NOT close this window.' });

      const response = await api.post('/api/backup/import', jsonData);
      setMessage({ type: 'success', text: (response as any).message || 'Database restored successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to restore database' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-md mb-6 flex items-start space-x-3 shadow-sm border ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
          'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          {message.type === 'error' && <Icons.XIcon className="w-6 h-6 flex-shrink-0" />}
          {message.type === 'success' && <Icons.DatabaseIcon className="w-6 h-6 flex-shrink-0" />}
          {message.type === 'info' && <div className="w-6 h-6 animate-pulse bg-blue-400 rounded-full flex-shrink-0"></div>}
          <div className="flex-1">
            <p className="font-semibold">{message.type === 'error' ? 'Error' : message.type === 'success' ? 'Success' : 'Processing...'}</p>
            <p className="text-sm mt-1">{message.text}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Icons.DownloadIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Export Database</h2>
            <p className="text-gray-500 text-sm mt-1">Download a complete backup of all system data.</p>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <ul className="text-sm text-gray-600 space-y-2 mb-6">
              <li className="flex items-center"><Icons.DocumentTextIcon className="w-4 h-4 mr-2 text-gray-400"/> Includes Users, Roles & Permissions</li>
              <li className="flex items-center"><Icons.DocumentTextIcon className="w-4 h-4 mr-2 text-gray-400"/> Includes Accounting & Invoices</li>
              <li className="flex items-center"><Icons.DocumentTextIcon className="w-4 h-4 mr-2 text-gray-400"/> Includes Projects, Tasks & Attendance</li>
              <li className="flex items-center"><Icons.DocumentTextIcon className="w-4 h-4 mr-2 text-gray-400"/> Generates a single secure JSON file</li>
            </ul>
            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full flex items-center justify-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 font-semibold"
            >
              {loading ? 'Exporting...' : 'Download Backup File'}
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Icons.UploadIcon className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Restore Database</h2>
            <p className="text-gray-500 text-sm mt-1">Import a previously downloaded backup file.</p>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="text-yellow-800 font-semibold text-sm flex items-center mb-1">
                <Icons.DatabaseIcon className="w-4 h-4 mr-1" />
                Warning
              </h3>
              <p className="text-xs text-yellow-700 leading-relaxed">
                Importing a backup will restore all data exactly as it was when the backup was created. Existing data with the same IDs will be overwritten without any data loss.
              </p>
            </div>
            <div className="relative">
              <input 
                type="file" 
                accept=".json,application/json" 
                onChange={handleImport}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={`w-full flex items-center justify-center bg-white border-2 border-dashed ${loading ? 'border-gray-300 text-gray-400' : 'border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400'} py-3 rounded-lg transition-colors font-semibold`}>
                {loading ? 'Restoring...' : 'Click to Upload Backup JSON'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupDatabasePage;
