import { useState, useEffect } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

// Using inline GraphQL with unique names to avoid conflicts with backup.graphql
const LIST_BACKUPS_INLINE = gql`
  query ListBackupsInline {
    listBackups
  }
`;

const CREATE_BACKUP_INLINE = gql`
  mutation CreateBackupInline {
    createBackup
  }
`;

const DELETE_BACKUP_INLINE = gql`
  mutation DeleteBackupInline($filename: String!) {
    deleteBackup(filename: $filename)
  }
`;

const RESTORE_BACKUP_INLINE = gql`
  mutation RestoreBackupInline($filename: String!) {
    restoreBackup(filename: $filename)
  }
`;

const EXPORT_CONFIG_INLINE = gql`
  mutation ExportConfigInline {
    exportConfig
  }
`;

export function BackupManagement() {
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  // List backups query
  const [listBackupsQuery, { data: listData, refetch }] = useLazyQuery<{ listBackups: string }>(LIST_BACKUPS_INLINE, {
    fetchPolicy: 'network-only',
  });

  // Fetch on mount and parse data when received
  useEffect(() => {
    listBackupsQuery();
  }, [listBackupsQuery]);

  useEffect(() => {
    if (listData?.listBackups) {
      try {
        const parsed = JSON.parse(listData.listBackups);
        setBackups(parsed);
      } catch (e) {
        console.error('Failed to parse backups:', e);
      }
    }
  }, [listData]);

  const [createBackupMutation] = useMutation(CREATE_BACKUP_INLINE, {
    onCompleted: () => {
      setSuccess('备份创建成功');
      setTimeout(() => setSuccess(''), 3000);
      refetch();
      setCreating(false);
    },
    onError: (err) => {
      setError(err.message || '创建备份失败');
      setTimeout(() => setError(''), 5000);
      setCreating(false);
    },
  });

  const [deleteBackupMutation] = useMutation(DELETE_BACKUP_INLINE, {
    onCompleted: () => {
      setSuccess('备份删除成功');
      setTimeout(() => setSuccess(''), 3000);
      refetch();
    },
    onError: (err) => {
      setError(err.message || '删除备份失败');
      setTimeout(() => setError(''), 5000);
    },
  });

  const [restoreBackupMutation] = useMutation<{ restoreBackup: string }>(RESTORE_BACKUP_INLINE, {
    onCompleted: (data: { restoreBackup: string }) => {
      try {
        const result = JSON.parse(data.restoreBackup);
        setSuccess(result.message || '恢复成功');
      } catch {
        setSuccess('恢复成功');
      }
      setTimeout(() => setSuccess(''), 5000);
      setRestoring(null);
    },
    onError: (err) => {
      setError(err.message || '恢复备份失败');
      setTimeout(() => setError(''), 5000);
      setRestoring(null);
    },
  });

  const [exportConfigMutation] = useMutation<{ exportConfig: string }>(EXPORT_CONFIG_INLINE, {
    onCompleted: (data: { exportConfig: string }) => {
      try {
        const result = JSON.parse(data.exportConfig);
        const blob = new Blob([JSON.stringify(result.config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iclms-config-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccess('配置导出成功');
        setTimeout(() => setSuccess(''), 3000);
      } catch (e) {
        setError('导出失败');
        setTimeout(() => setError(''), 3000);
      }
    },
    onError: (err) => {
      setError(err.message || '导出失败');
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleCreateBackup = async () => {
    setError('');
    setSuccess('');
    setCreating(true);
    await createBackupMutation();
  };

  const handleDeleteBackup = async (filename: string) => {
    if (window.confirm(`确定要删除备份 "${filename}" 吗？此操作不可恢复。`)) {
      setError('');
      setSuccess('');
      await deleteBackupMutation({ variables: { filename } });
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (window.confirm(`确定要从备份 "${filename}" 恢复吗？这将覆盖当前数据库的所有数据！`)) {
      if (window.confirm('警告：此操作将永久覆盖当前数据，请再次确认！')) {
        setError('');
        setSuccess('');
        setRestoring(filename);
        await restoreBackupMutation({ variables: { filename } });
      }
    }
  };

  const handleExportConfig = async () => {
    setError('');
    setSuccess('');
    await exportConfigMutation();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>数据库备份与恢复</h2>
      </div>

      {success && <div style={styles.success}>{success}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {/* Actions */}
      <div style={styles.actions}>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          style={{ ...styles.primaryButton, ...(creating ? styles.buttonDisabled : {}) }}
        >
          {creating ? '创建中...' : '创建新备份'}
        </button>
        <button
          onClick={handleExportConfig}
          style={styles.secondaryButton}
        >
          导出系统配置
        </button>
      </div>

      {/* Backups List */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>备份文件</h3>
        {backups.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>暂无备份文件</p>
            <p style={styles.emptyHint}>点击"创建新备份"按钮创建第一个备份</p>
          </div>
        ) : (
          <div style={styles.backupList}>
            {backups.map((backup) => (
              <div key={backup.filename} style={styles.backupCard}>
                <div style={styles.backupInfo}>
                  <div style={styles.backupFilename}>{backup.filename}</div>
                  <div style={styles.backupMeta}>
                    <span style={styles.backupMetaItem}>大小: {formatBytes(backup.size)}</span>
                    <span style={styles.backupMetaItem}>
                      创建时间: {formatDate(backup.createdAt)}
                    </span>
                  </div>
                </div>
                <div style={styles.backupActions}>
                  <button
                    onClick={() => handleRestoreBackup(backup.filename)}
                    disabled={restoring === backup.filename}
                    style={{
                      ...styles.restoreButton,
                      ...(restoring === backup.filename ? styles.buttonDisabled : {}),
                    }}
                  >
                    {restoring === backup.filename ? '恢复中...' : '恢复'}
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup.filename)}
                    style={styles.deleteButton}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning */}
      <div style={styles.warningBox}>
        <h4 style={styles.warningTitle}>重要提示</h4>
        <ul style={styles.warningList}>
          <li>备份文件包含完整的数据库数据，请妥善保管</li>
          <li>恢复操作将完全覆盖当前数据库，请谨慎操作</li>
          <li>建议定期创建备份，特别是在重要操作之前</li>
          <li>备份文件存储在服务器本地，建议定期下载到安全位置</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  success: {
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  primaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 8px 0',
  },
  emptyHint: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
  },
  backupList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  backupCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  backupInfo: {
    flex: 1,
  },
  backupFilename: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
    marginBottom: '6px',
  },
  backupMeta: {
    display: 'flex',
    gap: '16px',
  },
  backupMetaItem: {
    fontSize: '12px',
    color: '#6b7280',
  },
  backupActions: {
    display: 'flex',
    gap: '8px',
  },
  restoreButton: {
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deleteButton: {
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid #dc2626',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#dc2626',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  warningBox: {
    padding: '16px 20px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fbbf24',
  },
  warningTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#92400e',
    margin: '0 0 12px 0',
  },
  warningList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.8',
  },
};

export default BackupManagement;
