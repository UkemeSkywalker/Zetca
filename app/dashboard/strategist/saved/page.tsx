import { redirect } from 'next/navigation';

/** The old saved-strategies page; the Strategist home now lists strategies */
export default function SavedStrategiesPage() {
  redirect('/dashboard/strategist');
}
