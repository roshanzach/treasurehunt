import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { Trophy, Flag, RefreshCw, CheckCircle } from 'lucide-react';

interface PublicLeaderboardEntry {
  rank: number;
  teamName: string;
  stagesCompleted: number;
  isCompleted: boolean;
  completedAt: string | null;
  lastActive: string;
}

export const PublicLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<PublicLeaderboardEntry[]>([]);
  const [totalStages, setTotalStages] = useState(4);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard/public');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setTotalStages(data.totalStages || 4);
      }
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    if (socket) {
      socket.on('leaderboard:update', () => {
        fetchLeaderboard();
      });
    }

    const interval = setInterval(fetchLeaderboard, 15000); // 15s fallback poll
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('leaderboard:update');
      }
    };
  }, [socket]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          boxShadow: '0 0 15px rgba(245, 158, 11, 0.6)'
        }}>
          🥇
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          boxShadow: '0 0 15px rgba(148, 163, 184, 0.4)'
        }}>
          🥈
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #b45309, #d97706)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          boxShadow: '0 0 15px rgba(180, 83, 9, 0.4)'
        }}>
          🥉
        </div>
      );
    }
    return (
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '14px'
      }}>
        #{rank}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      
      <Navbar />

      <main className="container-max" style={{ marginTop: '24px' }}>
        
        {/* Leaderboard Header Card */}
        <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', marginBottom: '24px', border: '1px solid var(--border-gold)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px auto',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(245, 158, 11, 0.4)'
          }}>
            <Trophy size={36} color="#0d1117" />
          </div>

          <h1 style={{ fontSize: '28px', color: '#fbbf24', marginBottom: '8px' }}>
            Live Expedition Leaderboard
          </h1>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 16px auto' }}>
            Real-time rankings and progression across all physical checkpoints.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', color: '#34d399' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            <span>Live Sync Active &bull; Scores Hidden</span>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="glass-panel" style={{ overflow: 'hidden', padding: '0' }}>
          
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)' }}>Official Team Standings</h3>
            <button onClick={fetchLeaderboard} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}>
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading standings...
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No teams registered yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px', width: '80px' }}>Rank</th>
                    <th style={{ padding: '14px 20px' }}>Team</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Checkpoints</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item) => (
                    <tr
                      key={item.teamName}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: item.isCompleted ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        {getRankBadge(item.rank)}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: item.rank === 1 ? '#fbbf24' : 'var(--text-primary)' }}>
                          {item.teamName}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px' }}>
                          <Flag size={14} color="#f59e0b" />
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>
                            {item.stagesCompleted} / {totalStages}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        {item.isCompleted ? (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#34d399',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle size={14} />
                            <span>Vault Conquered</span>
                          </span>
                        ) : (
                          <span style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#fbbf24',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}>
                            In Pursuit
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </main>
    </div>
  );
};
