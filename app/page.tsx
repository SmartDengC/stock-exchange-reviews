import { Dashboard } from "./components/dashboard";
import { getLatestWeeklyReview } from "./lib/reviews";

export default function Home() {
  return <Dashboard review={getLatestWeeklyReview()} />;
}
