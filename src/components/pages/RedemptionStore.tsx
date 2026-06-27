import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Trophy, Star, Zap, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useUser } from '../../context/UserContext';
import { useGamification } from '../../hooks/useGamification';
import {
  ApiError,
  storeApi,
  type StoreReward,
  type StoreTransaction,
} from '../../services/api';

interface RewardCardData {
  id: string;
  name: string;
  description: string;
  xpCost: number;
  category: string;
  icon: typeof Gift;
  image?: string;
  inStock: boolean;
}

const CATEGORY_ICON_MAP: Record<string, typeof Gift> = {
  'gift-card': Gift,
  merchandise: Trophy,
  premium: Star,
  coaching: Zap,
  default: Gift,
};

function selectIcon(category: string): typeof Gift {
  return CATEGORY_ICON_MAP[category] ?? CATEGORY_ICON_MAP.default;
}

function extractImage(source?: Record<string, unknown>, fallback?: string): string | undefined {
  if (!source) {
    return fallback;
  }
  const emoji = (source as { emoji?: unknown }).emoji;
  if (typeof emoji === 'string') {
    return emoji;
  }
  const icon = (source as { icon?: unknown }).icon;
  if (typeof icon === 'string') {
    return icon;
  }
  return fallback;
}

function normaliseReward(reward: StoreReward): RewardCardData {
  const category = reward.category ?? 'other';
  const icon = selectIcon(category);
  const xpCost = Number(reward.cost ?? 0);
  const metadata = reward.metadata && typeof reward.metadata === 'object' ? reward.metadata : undefined;
  const stock = typeof reward.stock === 'number' ? reward.stock : undefined;
  const inStock = reward.in_stock ?? (stock === undefined ? true : stock > 0);

  return {
    id: reward.id,
    name: reward.name,
    description: reward.description ?? 'Unlock exclusive perks with your XP.',
    xpCost,
    category,
    icon,
    image: extractImage(metadata as Record<string, unknown> | undefined, reward.image),
    inStock,
  };
}

function formatCategoryName(value: string): string {
  return value
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTransactionDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function transactionStatusLabel(status?: string): string {
  if (!status) {
    return 'Completed';
  }
  const formatted = status.replace(/_/g, ' ');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function RedemptionStore() {
  const { token, refreshProfile } = useUser();
  const { refreshStatus } = useGamification({ autoFetch: false });

  const [balance, setBalance] = useState(0);
  const [rewards, setRewards] = useState<RewardCardData[]>([]);
  const [transactions, setTransactions] = useState<StoreTransaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedReward, setSelectedReward] = useState<RewardCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const loadStore = useCallback(async () => {
    if (!token) {
      setRewards([]);
      setTransactions([]);
      setBalance(0);
      setError('Sign in to access the reward store.');
      return;
    }

    setLoading(true);
    try {
      const [inventory, tx] = await Promise.all([
        storeApi.getInventory(token),
        storeApi.getTransactions(token),
      ]);
      setBalance(inventory.balance ?? 0);
      setRewards(inventory.rewards?.map(normaliseReward) ?? []);
      setTransactions(tx.transactions ?? []);
      setError(null);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? 'Please sign in again to view the reward store.'
          : err instanceof Error
            ? err.message
            : 'Unable to load rewards right now.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStore();
  }, [loadStore]);

  const categories = useMemo(() => {
    const unique = new Set(rewards.map((reward) => reward.category));
    const ordered = ['all', ...Array.from(unique)];
    return ordered.map((category) => ({
      name: category === 'all' ? 'All' : formatCategoryName(category),
      filter: category,
    }));
  }, [rewards]);

  const filteredRewards = useMemo(() => {
    if (selectedCategory === 'all') {
      return rewards;
    }
    return rewards.filter((reward) => reward.category === selectedCategory);
  }, [rewards, selectedCategory]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }, [transactions]);

  const handleRedeem = useCallback(async (reward: RewardCardData) => {
    if (!token) {
      toast.error('Sign in to redeem rewards.');
      return;
    }

    setRedeemingId(reward.id);
    try {
      const response = await storeApi.redeemReward({ reward_id: reward.id }, token);
      if (typeof response.balance === 'number') {
        setBalance(response.balance);
      }
      if (response.transaction) {
        setTransactions((prev) => [response.transaction, ...prev]);
      }
      toast.success(response.message ?? `${reward.name} redeemed!`);
      await Promise.all([refreshProfile(), refreshStatus()]);
      await loadStore();
      setSelectedReward(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to redeem reward. Please try again later.';
      toast.error(message);
    } finally {
      setRedeemingId(null);
    }
  }, [token, refreshProfile, refreshStatus, loadStore]);

  const handleCloseModal = () => setSelectedReward(null);

  const renderContent = () => {
    if (!token) {
      return (
        <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-6 text-center text-sm text-violet-300">
          Sign in to explore and redeem rewards with your XP balance.
        </div>
      );
    }

    if (loading && !rewards.length) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="glass-effect rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] p-6 animate-pulse h-64" />
          ))}
        </div>
      );
    }

    if (!loading && !rewards.length) {
      return (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] p-12 text-center text-sm text-[var(--text-secondary)]">
          No rewards available yet. Check back soon!
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredRewards.map((item, index) => (
          <RewardCard
            key={item.id}
            item={item}
            userXP={balance}
            onSelect={() => setSelectedReward(item)}
            index={index}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
            Reward <span className="gradient-text" style={{ WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>Redemption</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Cash in your hard-earned XP for exclusive rewards.
          </p>
        </div>

        {/* User XP and Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-violet-500/10 border border-violet-500/25 rounded-xl px-6 py-3 flex items-center gap-4"
          >
            <span className="text-sm font-medium text-[var(--text-secondary)]">Your XP Balance:</span>
            <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {balance.toLocaleString()}
            </span>
          </motion.div>

          <div className="flex items-center gap-2 bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-xl p-1">
            {categories.map((category, index) => (
              <motion.button
                key={category.filter}
                onClick={() => setSelectedCategory(category.filter)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors ${selectedCategory === category.filter
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
              >
                {category.name}
                {selectedCategory === category.filter && (
                  <motion.div
                    layoutId="category-highlight"
                    className="absolute inset-0 bg-[var(--border-subtle)] rounded-lg"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {error && token && (
          <div className="flex items-center justify-between mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <span>{error}</span>
            <button
              onClick={() => void loadStore()}
              className="flex items-center gap-2 rounded-lg border border-rose-500/40 px-3 py-1 text-xs uppercase tracking-wide hover:bg-rose-500/20"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {renderContent()}
      </div>

      {/* Redemption Modal */}
      <AnimatePresence>
        {selectedReward && (
          <RedemptionModal
            reward={selectedReward}
            userXP={balance}
            onClose={handleCloseModal}
            onRedeem={() => handleRedeem(selectedReward)}
            redeeming={redeemingId === selectedReward.id}
          />
        )}
      </AnimatePresence>

      {sortedTransactions.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <TransactionList transactions={sortedTransactions} />
        </div>
      )}
    </div>
  );
}

const RewardCard = ({ item, userXP, onSelect, index }: { item: RewardCardData; userXP: number; onSelect: () => void; index: number }) => {
  const canAfford = userXP >= item.xpCost;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
      whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.05)' }}
      className={`rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-card)] flex flex-col transition-all duration-200 hover:border-violet-500/20 hover:-translate-y-0.5 ${!item.inStock && 'opacity-40'}`}
    >
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <item.icon className="w-7 h-7 text-violet-400" />
          </div>
          {!item.inStock && (
            <div className="text-xs font-bold uppercase text-red-600 dark:text-red-400 bg-red-500/20 px-2 py-1 rounded">
              Out of Stock
            </div>
          )}
        </div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{item.name}</h3>
        <p className="text-[var(--text-secondary)] text-sm mb-4 h-10">
          {item.description}
        </p>
      </div>

      <div className="px-6 pb-6 mt-auto">
        <div className="bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-xl px-4 py-2 flex items-center justify-between mb-4">
          <span className="text-sm text-[var(--text-muted)]">Cost:</span>
          <span className="text-lg font-bold text-violet-400">{item.xpCost.toLocaleString()} XP</span>
        </div>
        <motion.button
          onClick={onSelect}
          disabled={!canAfford || !item.inStock}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full flex items-center justify-center gap-2 btn-primary py-3 px-4 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Gift size={18} />
          <span>{canAfford ? 'Redeem' : 'Not Enough XP'}</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

const RedemptionModal = ({
  reward,
  userXP,
  onClose,
  onRedeem,
  redeeming,
}: {
  reward: RewardCardData;
  userXP: number;
  onClose: () => void;
  onRedeem: () => void;
  redeeming: boolean;
}) => {
  const remaining = Math.max(0, userXP - reward.xpCost);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(event) => event.stopPropagation()}
        className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md p-8"
      >
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/25 mb-4 text-4xl">
            {reward.image ?? '🎁'}
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{reward.name}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{reward.description}</p>
        </div>

        <div className="bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-muted)]">Your XP Balance:</span>
            <span className="text-[var(--text-primary)] font-semibold">{userXP.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-muted)]">Reward Cost:</span>
            <span className="text-violet-400 font-semibold">-{reward.xpCost.toLocaleString()}</span>
          </div>
          <div className="w-full h-px bg-[var(--border-subtle)] my-2" />
          <div className="flex justify-between items-center text-lg">
            <span className="text-[var(--text-secondary)] font-semibold">Remaining XP:</span>
            <span className="text-green-600 dark:text-green-400 font-bold">{remaining.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)] text-[var(--text-primary)] font-semibold transition-colors"
            disabled={redeeming}
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={onRedeem}
            whileHover={{ scale: redeeming ? 1 : 1.05 }}
            whileTap={{ scale: redeeming ? 1 : 0.95 }}
            className="w-full py-3 rounded-xl btn-primary font-bold disabled:opacity-40"
            disabled={redeeming}
          >
            {redeeming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : (
              'Confirm Redemption'
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const TransactionList = ({ transactions }: { transactions: StoreTransaction[] }) => {
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Recent Redemptions</h2>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] divide-y divide-[var(--border-subtle)]">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between px-5 py-4 text-sm">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{transaction.reward_name ?? 'Reward'}</p>
              <p className="text-xs text-[var(--text-secondary)]">{formatTransactionDate(transaction.created_at)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-violet-400">-{Math.abs(transaction.amount).toLocaleString()} XP</p>
              <p className="text-xs text-[var(--text-muted)]">{transactionStatusLabel(transaction.status)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
