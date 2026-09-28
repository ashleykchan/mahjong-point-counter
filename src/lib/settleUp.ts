import type { Payout, PlayerId } from "../types";
import { round2 } from "./money";

interface Balance {
  id: PlayerId;
  amount: number;
}

const EPSILON = 0.005;

/**
 * Greedy largest-debtor-vs-largest-creditor matching. Not guaranteed optimal in every
 * pathological case, but it is a standard, easy-to-verify heuristic that produces the
 * minimum number of transactions for the vast majority of real balance distributions
 * (at most players.length - 1 transactions).
 */
export function settleUp(balances: Balance[]): Payout[] {
  const creditors = balances
    .filter((b) => b.amount > EPSILON)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = balances
    .filter((b) => b.amount < -EPSILON)
    .map((b) => ({ id: b.id, amount: -b.amount }))
    .sort((a, b) => b.amount - a.amount);

  const payouts: Payout[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].amount, creditors[j].amount));
    if (amount > EPSILON) {
      payouts.push({ from: debtors[i].id, to: creditors[j].id, amount });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount <= EPSILON) i++;
    if (creditors[j].amount <= EPSILON) j++;
  }
  return payouts;
}
