import React from 'react';
import { CreditCard, ExternalLink, Loader2, RefreshCcw } from 'lucide-react';
import { NewApiPayMethod, NewApiSession, NewApiStatus, NewApiSubscriptionPlanItem, NewApiTopupInfo } from '../../services/newApiService';
import { formatPayableAmount, formatQuota } from './utils';
import { EmptyState, SectionCard, StatCard } from './ui';

interface BillingPanelProps {
  status: NewApiStatus | null;
  session: NewApiSession;
  topupInfo: NewApiTopupInfo | null;
  topupInfoLoading: boolean;
  walletLoading: boolean;
  paymentLoading: boolean;
  estimateLoading: boolean;
  estimateError: string | null;
  topupMethods: NewApiPayMethod[];
  subscriptionPlans: NewApiSubscriptionPlanItem[];
  subscriptionLoading: boolean;
  selectedPaymentMethod: string;
  setSelectedPaymentMethod: React.Dispatch<React.SetStateAction<string>>;
  topupAmount: string;
  setTopupAmount: React.Dispatch<React.SetStateAction<string>>;
  payableAmount: number | null;
  redeemCode: string;
  setRedeemCode: React.Dispatch<React.SetStateAction<string>>;
  onOnlinePay: () => Promise<void>;
  onSubscriptionPay: (planId: number, paymentMethod: string) => Promise<void>;
  onRedeemCode: () => Promise<void>;
  onRefreshProfile: () => Promise<void>;
}

const normalizeDisplayAmount = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));

const formatSubscriptionPrice = (priceAmount: number | undefined, status: NewApiStatus | null) => {
  const value = Number(priceAmount ?? 0);
  if (!Number.isFinite(value) || value <= 0) return '待配置';
  const symbol = status?.custom_currency_symbol || '￥';
  return `${symbol}${normalizeDisplayAmount(value)}`;
};

const formatPlanLimit = (limit: number | undefined) => {
  const value = Number(limit ?? 0);
  return Number.isFinite(value) && value > 0 ? `限购 ${value} 次` : null;
};

export const BillingPanel: React.FC<BillingPanelProps> = ({
  status,
  session,
  topupInfo,
  topupInfoLoading,
  walletLoading,
  paymentLoading,
  estimateLoading,
  estimateError,
  topupMethods,
  subscriptionPlans,
  subscriptionLoading,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  topupAmount,
  setTopupAmount,
  payableAmount,
  redeemCode,
  setRedeemCode,
  onOnlinePay,
  onSubscriptionPay,
  onRedeemCode,
  onRefreshProfile,
}) => {
  const amountOptions = topupInfo?.amount_options ?? [];
  const onlineTopupMethods = (topupInfo?.enable_online_topup === false ? [] : topupMethods).filter((method) => !['stripe', 'creem'].includes(method.type));
  const hasPaymentMethod = onlineTopupMethods.length > 0;
  const hasSubscriptionPlans = subscriptionPlans.length > 0;
  const walletPayMethods = topupInfo?.enable_online_topup ? onlineTopupMethods : [];

  const paymentMethodTypes = new Set(topupMethods.map((method) => method.type));
  if (topupInfo?.enable_stripe_topup && subscriptionPlans.some((item) => item.plan?.stripe_price_id)) {
    paymentMethodTypes.add('stripe');
  }
  if (topupInfo?.enable_creem_topup && subscriptionPlans.some((item) => item.plan?.creem_product_id)) {
    paymentMethodTypes.add('creem');
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="充值与余额"
        description="把充值、订阅、兑换码和余额刷新聚合到一个任务面板里，减少来回切换。"
        action={(
          <button
            onClick={() => void onRefreshProfile()}
            disabled={walletLoading}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-primary)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
          >
            {walletLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            刷新余额
          </button>
        )}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="当前余额" value={formatQuota(session.user?.quota, status)} hint="支付完成后可在这里立即确认到账" />
          <StatCard label="累计消耗" value={formatQuota(session.user?.used_quota, status)} hint="帮助你判断近期使用强度" />
          <StatCard label="支付方式" value={paymentMethodTypes.size || 0} hint={topupInfoLoading || subscriptionLoading ? '正在同步支付渠道' : '当前可选支付渠道数量'} />
        </div>
      </SectionCard>

      {(subscriptionLoading || hasSubscriptionPlans) && (
        <SectionCard title="订阅充值" description="参考 new-api 的原始结构，把订阅套餐与钱包充值分开展示，便于直接选择支付渠道。">
          {subscriptionLoading ? (
            <div className="flex min-h-[220px] items-center justify-center text-[var(--text-tertiary)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !hasSubscriptionPlans ? (
            <EmptyState title="当前没有可购买订阅套餐" description="如果你已经在 new-api 后端配置了订阅商品，请确认当前账号具备查看套餐的权限。" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {subscriptionPlans.map((item) => {
                const plan = item.plan;
                if (!plan?.id) return null;

                const availableMethods = [
                  ...(plan.stripe_price_id && topupInfo?.enable_stripe_topup ? [{ key: 'stripe', label: 'Stripe' }] : []),
                  ...(plan.creem_product_id && topupInfo?.enable_creem_topup ? [{ key: 'creem', label: 'Creem' }] : []),
                  ...walletPayMethods.map((method) => ({ key: method.type, label: method.name })),
                ];

                const planTags = [
                  plan.total_amount ? `总额度 ${formatQuota(plan.total_amount, status)}` : '总额度不限',
                  plan.upgrade_group ? `升级分组 ${plan.upgrade_group}` : null,
                  formatPlanLimit(plan.max_purchase_per_user),
                ].filter(Boolean) as string[];

                return (
                  <div key={plan.id} className="flex h-full flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-[var(--text-primary)]">{plan.title || '订阅套餐'}</div>
                        {formatPlanLimit(plan.max_purchase_per_user) && (
                          <span className="rounded-full border border-[var(--border-primary)] px-2.5 py-1 text-xs text-[var(--text-tertiary)]">{formatPlanLimit(plan.max_purchase_per_user)}</span>
                        )}
                      </div>
                      {plan.subtitle && <p className="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">{plan.subtitle}</p>}
                    </div>

                    <div className="mt-5 text-3xl font-semibold text-[var(--text-primary)]">{formatSubscriptionPrice(plan.price_amount, status)}</div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {planTags.map((tag) => (
                        <span key={tag} className="rounded-full border border-[var(--border-primary)] px-2.5 py-1 text-xs text-[var(--text-tertiary)]">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 flex-1">
                      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">可用支付方式</div>
                      {availableMethods.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {availableMethods.map((method) => (
                            <button
                              key={`${plan.id}-${method.key}`}
                              onClick={() => void onSubscriptionPay(plan.id, method.key)}
                              disabled={paymentLoading}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-primary)] px-3 py-2 text-sm transition-colors hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
                            >
                              {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                              {method.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm leading-6 text-[var(--text-tertiary)]">当前套餐暂未配置可用支付渠道。</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard title="在线充值" description="金额会自动预估，无需额外点击计算，适合直接给钱包补充额度。">
          {topupInfoLoading ? (
            <div className="flex min-h-[240px] items-center justify-center text-[var(--text-tertiary)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !hasPaymentMethod ? (
            <EmptyState title="当前没有可用钱包充值方式" description="如果你使用的是自建 new-api 实例，请先在后端配置在线支付渠道；订阅套餐和兑换码仍可在本页继续处理。" />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {onlineTopupMethods.map((method) => (
                  <button
                    key={method.type}
                    onClick={() => setSelectedPaymentMethod(method.type)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${selectedPaymentMethod === method.type ? 'border-[var(--accent)] bg-[var(--accent-bg)]' : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)]'}`}
                  >
                    <div className="font-semibold">{method.name}</div>
                    <div className="mt-1 text-xs text-[var(--text-tertiary)]">{method.type}</div>
                    {method.min_topup && <div className="mt-3 text-xs text-[var(--text-tertiary)]">最低充值：{method.min_topup}</div>}
                  </button>
                ))}
              </div>

              {amountOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {amountOptions.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTopupAmount(String(amount))}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${String(amount) === topupAmount ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-text)]' : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={topupAmount}
                  onChange={(event) => setTopupAmount(event.target.value)}
                  placeholder="输入充值数量，例如 10"
                  className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                />
                <button
                  onClick={() => void onOnlinePay()}
                  disabled={paymentLoading || !hasPaymentMethod}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--btn-primary-bg)] px-4 py-3 text-sm font-medium text-[var(--btn-primary-text)] transition-colors hover:bg-[var(--btn-primary-hover)] disabled:opacity-60"
                >
                  {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  立即支付
                </button>
              </div>

              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-4">
                <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                  <span>预估支付金额</span>
                  {estimateLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{estimateLoading ? '自动计算中…' : formatPayableAmount(payableAmount, status)}</div>
                <div className="mt-2 text-sm text-[var(--text-tertiary)] leading-6">
                  {estimateError || '如果你的后端设置了不同的币种和汇率，这里会自动按照当前 EndPoint 的展示规则计算。'}
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="兑换码"
            description="适合运营活动、手动发放额度，或从官方兑换码页购买后回到这里兑换。"
            action={status?.top_up_link ? (
              <a
                href={status.top_up_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-primary)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)]"
              >
                <ExternalLink className="h-4 w-4" />
                购买兑换码
              </a>
            ) : undefined}
          >
            <div className="space-y-3">
              <input
                value={redeemCode}
                onChange={(event) => setRedeemCode(event.target.value)}
                placeholder="输入兑换码"
                className="w-full rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
              />
              <button
                onClick={() => void onRedeemCode()}
                disabled={paymentLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border-primary)] px-4 py-3 transition-colors hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
              >
                {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                立即兑换
              </button>
            </div>
          </SectionCard>

          <SectionCard title="使用提示" description="把操作说明放在旁边，避免用户一边充值一边找帮助。">
            <ul className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <li>- 输入或切换充值数量后，金额会自动更新，无需再单独点击“计算金额”。</li>
              <li>- 支付完成后建议点击“刷新余额”，确认额度是否到账。</li>
              <li>- 官方链接对应的是兑换码购买页，购买后请回到右侧输入兑换码完成到账。</li>
              {topupInfo?.min_topup !== undefined && <li>- 当前最小充值数量：{topupInfo.min_topup}</li>}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
