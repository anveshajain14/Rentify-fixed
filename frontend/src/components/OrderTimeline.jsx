'use client';

const STEPS = ['orderPlaced', 'paymentDone', 'deliveryDone', 'returnDone', 'refundDone', 'completed'];

const LABELS = {
  orderPlaced: 'Order Placed',
  paymentDone: 'Payment',
  deliveryDone: 'Delivery',
  returnDone: 'Return',
  refundDone: 'Refund',
  completed: 'Completed',
};

export default function OrderTimeline({ status, paymentStatus }) {
  let currentIndex = Math.max(0, STEPS.indexOf(status));
  if (paymentStatus === 'done') {
    currentIndex = Math.max(currentIndex, STEPS.indexOf('paymentDone'));
  }

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between gap-2">
        <div className="absolute left-0 right-0 top-4 h-1 bg-muted rounded-full" />
        <div
          className="absolute left-0 top-4 h-1 bg-emerald-500 dark:bg-cyan-500 rounded-full transition-all"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((step, idx) => {
          const active = idx <= currentIndex;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center gap-2 min-w-0 flex-1">
              <div
                className={`w-8 h-8 rounded-full border-2 transition-colors ${
                  active
                    ? 'bg-emerald-500 dark:bg-cyan-500 border-emerald-500 dark:border-cyan-500'
                    : 'bg-muted border-muted-foreground/30'
                }`}
              />
              <span className={`text-[10px] sm:text-xs text-center font-bold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
