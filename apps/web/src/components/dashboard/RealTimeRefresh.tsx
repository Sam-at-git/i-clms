import { useState, useEffect, useCallback, useRef } from 'react';

interface RealTimeRefreshProps {
  onRefresh?: () => Promise<void>;
  enabled?: boolean;
  defaultInterval?: number; // in seconds
  showLastUpdate?: boolean;
  showProgress?: boolean;
  enableWebSocket?: boolean;
  webSocketUrl?: string;
}

const REFRESH_INTERVALS = [
  { value: 30, label: '30秒' },
  { value: 60, label: '1分钟' },
  { value: 300, label: '5分钟' },
  { value: 900, label: '15分钟' },
];

export function RealTimeRefresh({
  onRefresh,
  enabled: enabledProp = false,
  defaultInterval = 60,
  showLastUpdate = true,
  showProgress = false,
  enableWebSocket = false,
  webSocketUrl,
}: RealTimeRefreshProps) {
  const [enabled, setEnabled] = useState(enabledProp);
  const [interval, setInterval] = useState(defaultInterval);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const [progress, setProgress] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const progressStartRef = useRef<number | null>(null);

  // Manual refresh
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      setLastUpdate(new Date());

      // Reset progress timer if auto-refresh is enabled
      if (enabled) {
        progressStartRef.current = Date.now();
        setProgress(0);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh, enabled]);

  // Auto-refresh effect
  useEffect(() => {
    if (!enabled || !onRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
      setNextUpdate(null);
      setProgress(0);
      return;
    }

    // Calculate next update time
    const updateTime = new Date(Date.now() + interval * 1000);
    setNextUpdate(updateTime);

    // Progress animation
    if (showProgress) {
      progressStartRef.current = Date.now();
      setProgress(0);

      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - (progressStartRef.current || Date.now());
        const newProgress = Math.min((elapsed / (interval * 1000)) * 100, 100);
        setProgress(newProgress);
      }, 100);
    }

    // Auto-refresh interval
    intervalRef.current = setInterval(async () => {
      await handleManualRefresh();
    }, interval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [enabled, interval, onRefresh, showProgress, handleManualRefresh]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!enableWebSocket || !webSocketUrl) return;

    const ws = new WebSocket(webSocketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE' && onRefresh) {
          onRefresh();
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [enableWebSocket, webSocketUrl, onRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Format time to next update
  const getTimeToNextUpdate = () => {
    if (!nextUpdate) return null;

    const diff = Math.max(0, Math.floor((nextUpdate.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;

    if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    }
    return `${seconds}秒`;
  };

  return (
    <div style={styles.container}>
      {/* Status Indicator */}
      <div style={styles.statusSection}>
        <div style={styles.statusRow}>
          {/* WebSocket Status */}
          {enableWebSocket && (
            <div style={styles.statusItem}>
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor: wsConnected ? '#10b981' : '#ef4444',
                }}
              />
              <span style={styles.statusText}>
                {wsConnected ? '实时连接' : '连接断开'}
              </span>
            </div>
          )}

          {/* Auto-refresh Status */}
          <div style={styles.statusItem}>
            <span
              style={{
                ...styles.statusDot,
                backgroundColor: enabled ? '#10b981' : '#9ca3af',
              }}
            />
            <span style={styles.statusText}>
              {enabled ? '自动刷新' : '手动模式'}
            </span>
          </div>

          {/* Refreshing Status */}
          {isRefreshing && (
            <div style={styles.statusItem}>
              <div style={styles.spinner} />
              <span style={styles.statusText}>刷新中...</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controlsSection}>
        {/* Auto-refresh Toggle */}
        <div style={styles.toggleRow}>
          <label style={styles.toggleLabel}>自动刷新</label>
          <button
            onClick={() => setEnabled(!enabled)}
            style={{
              ...styles.toggleButton,
              ...(enabled ? styles.toggleButtonEnabled : styles.toggleButtonDisabled),
            }}
          >
            <div
              style={{
                ...styles.toggleKnob,
                transform: enabled ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>

        {/* Interval Selector */}
        {enabled && (
          <div style={styles.intervalRow}>
            <label style={styles.intervalLabel}>刷新间隔:</label>
            <div style={styles.intervalButtons}>
              {REFRESH_INTERVALS.map((int) => (
                <button
                  key={int.value}
                  onClick={() => setInterval(int.value)}
                  style={{
                    ...styles.intervalButton,
                    ...(interval === int.value && styles.intervalButtonActive),
                  }}
                >
                  {int.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          style={{
            ...styles.refreshButton,
            ...(isRefreshing && styles.refreshButtonDisabled),
          }}
        >
          {isRefreshing ? '刷新中...' : '立即刷新'}
        </button>
      </div>

      {/* Progress Bar */}
      {showProgress && enabled && (
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
          <div style={styles.progressLabels}>
            <span style={styles.progressLabel}>
              {enabled && nextUpdate && (
                <>下次更新: {getTimeToNextUpdate()}</>
              )}
            </span>
            <span style={styles.progressLabel}>{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {/* Last Update Time */}
      {showLastUpdate && lastUpdate && (
        <div style={styles.lastUpdateSection}>
          <span style={styles.lastUpdateLabel}>最后更新:</span>
          <span style={styles.lastUpdateTime}>
            {lastUpdate.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      )}

      {/* Next Update Countdown */}
      {enabled && nextUpdate && !showProgress && (
        <div style={styles.countdownSection}>
          <span style={styles.countdownLabel}>下次更新:</span>
          <span style={styles.countdownTime}>{getTimeToNextUpdate()}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '16px',
    marginBottom: '16px',
  },
  statusSection: {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  statusRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '13px',
    color: '#6b7280',
  },
  spinner: {
    border: '2px solid #f3f4f6',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    width: '12px',
    height: '12px',
    animation: 'spin 1s linear infinite',
  },
  controlsSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toggleLabel: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
  },
  toggleButton: {
    position: 'relative',
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    padding: '2px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
  },
  toggleButtonEnabled: {
    backgroundColor: '#3b82f6',
  },
  toggleButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  toggleKnob: {
    width: '20px',
    height: '20px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  intervalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  intervalLabel: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
  },
  intervalButtons: {
    display: 'flex',
    gap: '4px',
  },
  intervalButton: {
    padding: '4px 10px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  intervalButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  refreshButton: {
    padding: '6px 14px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  refreshButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  progressSection: {
    marginTop: '12px',
  },
  progressBar: {
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.1s linear',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  lastUpdateSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  lastUpdateLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  lastUpdateTime: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 500,
  },
  countdownSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  countdownLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  countdownTime: {
    fontSize: '14px',
    color: '#3b82f6',
    fontWeight: 600,
  },
};

export default RealTimeRefresh;
