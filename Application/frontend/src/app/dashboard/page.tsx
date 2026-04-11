import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Topic Tracker</h1>
      </div>
      <p>Welcome to your dashboard!</p>
    </div>
  );
}