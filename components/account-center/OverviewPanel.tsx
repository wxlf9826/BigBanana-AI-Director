import React from 'react';
import { Activity, CreditCard, Key, Loader2, RefreshCcw } from 'lucide-react';
import { NewApiSession, NewApiStatus } from '../../services/newApiService';
import { AccountTab } from './types';
import { formatQuota } from './utils';
import { SectionCard, StatCard } from './ui';

interface OverviewPanelProps {
  status: NewApiStatus | null;
  session: NewApiSession;
  walletLoading: boolean;
  onRefreshProfile: () => Promise<void>;
  onTabChange: (tab: AccountTab) => void;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  status,
  session,
  walletLoading,
  onRefreshProfile,
  onTabChange,
}) => {
  const user = session.user;

  return (
    <div className="space-y-6">
      <SectionCard
        title="账号总览"
        description="把最常用的信息和动作放在第一屏，进入页面先看到余额和下一步。"
        action={(
          <button
            onClick={() => void onRefreshProfile()}
            disabled={walletLoading}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-primary)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
          >
            {walletLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            刷新账户
          </button>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="当前余额" value={formatQuota(user?.quota, status)} hint="用于当前账号可消费额度" />
          <StatCard label="累计消耗" value={formatQuota(user?.used_quota, status)} hint="便于快速判断最近使用情况" />
          <StatCard label="请求次数" value={user?.request_count ?? 0} hint="来自当前账号累计调用记录" />
          <StatCard label="用户组" value={user?.group || '默认分组'} hint="决定当前账号可用的资源池与权限范围" />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="快捷动作" description="高频动作不需要再下翻整页寻找。">
          <div className="grid gap-4 md:grid-cols-3">
            <button onClick={() => onTabChange('billing')} className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 text-left transition-colors hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)]">
              <CreditCard className="h-5 w-5 text-[var(--accent-text)]" />
              <div className="mt-4 font-semibold">去充值</div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">余额不足时直接进入充值与兑换模块。</div>
            </button>
            <button onClick={() => onTabChange('tokens')} className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 text-left transition-colors hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)]">
              <Key className="h-5 w-5 text-[var(--accent-text)]" />
              <div className="mt-4 font-semibold">管理令牌</div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">创建新密钥，或把现有密钥一键回填到当前项目。</div>
            </button>
            <button onClick={() => onTabChange('logs')} className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 text-left transition-colors hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)]">
              <Activity className="h-5 w-5 text-[var(--accent-text)]" />
              <div className="mt-4 font-semibold">查看日志</div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">快速定位消费、错误和模型使用情况。</div>
            </button>
          </div>
        </SectionCard>

        <SectionCard title="账号信息" description="只保留用户真正关心的账号资料，不展示后台接入细节。">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">用户名</div>
              <div className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{user?.display_name || session.username}</div>
              <div className="mt-2 text-sm text-[var(--text-tertiary)]">登录后在当前站点内直接管理账户能力。</div>
            </div>
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">邮箱</div>
              <div className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{user?.email || '未绑定邮箱'}</div>
              <div className="mt-2 text-sm text-[var(--text-tertiary)]">用于注册验证、找回密码或接收通知。</div>
            </div>
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">邀请码</div>
              <div className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{user?.aff_code || '未生成'}</div>
              <div className="mt-2 text-sm text-[var(--text-tertiary)]">可用于邀请协作者或参与平台活动。</div>
            </div>
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">账户状态</div>
              <div className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{user?.status === 1 ? '正常' : '可用'}</div>
              <div className="mt-2 text-sm text-[var(--text-tertiary)]">如有额度、令牌或支付异常，可先刷新账户信息。</div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
